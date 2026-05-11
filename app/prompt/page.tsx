'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { reasonProject } from '@/lib/prompt-orchestrator/reasoner';
import type { ProjectReasoning } from '@/lib/prompt-orchestrator/reasoner';
import { generateClarifications, mergeAnswersWithContext } from '@/lib/prompt-orchestrator/clarifier';
import type { ClarificationResult } from '@/lib/prompt-orchestrator/clarifier';
import { planPhases } from '@/lib/prompt-orchestrator/phasePlanner';
import { compilePromptPack } from '@/lib/prompt-orchestrator/promptCompiler';
import type { CompiledPack } from '@/lib/prompt-orchestrator/promptCompiler';
import { scorePrompt } from '@/lib/prompt-orchestrator/scoring';
import { recordGeneration, getPersonalizedHint } from '@/lib/prompt-orchestrator/memory';
import type { PromptDepth } from '@/lib/prompt-orchestrator/templates';
import type { CompiledPhase } from '@/lib/prompt-orchestrator/templates';
import { savePrompt, type PromptPhase } from '@/lib/prompt/history';
import PromptPhaseCard from '@/components/prompt/PromptPhaseCard';
import PromptOutput from '@/components/prompt/PromptOutput';
import StrategySummary from '@/components/prompt/StrategySummary';
import { saveContext, loadContext } from '@/lib/session/contextStore';

const EXAMPLES = [
  '开发校园二手交易+兴趣社交平台',
  '做一个 SaaS 团队协作工具，支持任务管理和文档协作',
  '构建一个 AI 驱动的代码审查助手',
  '开发在线教育平台，支持视频课程和作业批改',
  '企业级 CRM 客户关系管理系统',
  '实时数据监控仪表板，支持多数据源聚合',
];

const DEPTH_OPTIONS: { value: PromptDepth; label: string; desc: string; icon: string }[] = [
  { value: 'quick', label: '快速', desc: '400-600 字，关键指令', icon: '⚡' },
  { value: 'standard', label: '标准', desc: '800-1200 字，完整方案', icon: '📋' },
  { value: 'expert', label: '专家', desc: '1500-2500 字，深度分析', icon: '🔬' },
  { value: 'architect', label: '架构师', desc: '2500-4000 字，超细粒度', icon: '🏗️' },
];

type FlowStep = 'input' | 'reasoning' | 'clarification' | 'generating' | 'done';
type MobileView = 'input' | 'phases' | 'output';

interface BuildStep {
  id: string;
  label: string;
  detail?: string;
  status: 'pending' | 'active' | 'done';
}

const STEP_INDICATORS = [
  { key: 'input', label: '输入想法', icon: '💡' },
  { key: 'reasoning', label: '识别类型', icon: '🔍' },
  { key: 'clarification', label: '深度追问', icon: '❓' },
  { key: 'generating', label: '生成 Prompt', icon: '⚡' },
] as const;

export default function PromptPage() {
  const router = useRouter();
  const [input, setInput] = useState('');
  const [depth, setDepth] = useState<PromptDepth>('standard');
  const [pack, setPack] = useState<CompiledPack | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mobileView, setMobileView] = useState<'input' | 'phases' | 'output'>('input');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [error, setError] = useState('');
  const [reasoning, setReasoning] = useState<ProjectReasoning | null>(null);
  const [clarification, setClarification] = useState<ClarificationResult | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showClarification, setShowClarification] = useState(false);
  const [personalHint, setPersonalHint] = useState<string | null>(null);
  const [flowStep, setFlowStep] = useState<FlowStep>('input');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveTitle, setSaveTitle] = useState('');
  const [saveProjectId, setSaveProjectId] = useState('');
  const [saveTags, setSaveTags] = useState<string[]>([]);
  const [savePhase, setSavePhase] = useState<PromptPhase>('idea');
  const [saveCombinedOutput, setSaveCombinedOutput] = useState('');
  const [saveClarifications, setSaveClarifications] = useState<string[]>([]);
  const [saveInput, setSaveInput] = useState('');
  const [saveCategory, setSaveCategory] = useState('');
  const [saving, setSaving] = useState(false);
  const [buildSteps, setBuildSteps] = useState<BuildStep[]>([]);
  const [savedAssetId, setSavedAssetId] = useState<string | null>(null);
  const [phase, setPhase] = useState<'MVP' | 'Beta' | 'Growth'>('MVP');
  const [projectName, setProjectName] = useState('');

  useEffect(() => {
    const ctx = loadContext();
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const idea = urlParams.get('idea');
      if (idea) {
        setInput(idea);
        return;
      }
    }
    if (ctx.draftInput && ctx.lastPage === '/prompt' && !input) {
      setInput(ctx.draftInput);
    }
    if (ctx.currentPhase) setPhase(ctx.currentPhase as 'MVP' | 'Beta' | 'Growth');
    if (ctx.currentProject) setProjectName(ctx.currentProject);
    saveContext({ lastPage: '/prompt' });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (input.trim()) {
        saveContext({ draftInput: input, currentPhase: phase, currentProject: projectName || undefined });
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [input, phase, projectName]);

  const handleGenerate = useCallback(async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError('');
    setPack(null);
    setReasoning(null);
    setClarification(null);
    setShowClarification(false);
    setAnswers({});
    setFlowStep('reasoning');

    const steps: BuildStep[] = [
      { id: 'reason', label: '识别产品类型', status: 'active' },
      { id: 'clarify', label: '需求澄清分析', status: 'pending' },
      { id: 'plan', label: '规划开发阶段', status: 'pending' },
      { id: 'compile', label: '编译 Prompt', status: 'pending' },
      { id: 'score', label: '质量评分', status: 'pending' },
    ];
    setBuildSteps(steps);

    try {
      setLoadingStep('深度推理分析中...');
      const projectReasoning = await reasonProject(input);
      setReasoning(projectReasoning);
      setBuildSteps(prev => prev.map(s => s.id === 'reason' ? { ...s, status: 'done', detail: `${projectReasoning.primaryTypeLabel} · ${projectReasoning.complexity}复杂度 · 确信度${projectReasoning.confidence}%` } : s));
      setFlowStep('reasoning');

      const hint = getPersonalizedHint(projectReasoning.primaryType);
      setPersonalHint(hint);

      setLoadingStep('生成澄清问题...');
      setBuildSteps(prev => prev.map(s => s.id === 'clarify' ? { ...s, status: 'active' } : s));
      const clarResult = await generateClarifications(input, projectReasoning);
      setClarification(clarResult);
      setBuildSteps(prev => prev.map(s => s.id === 'clarify' ? { ...s, status: 'done', detail: clarResult.needed ? `${clarResult.questions.length} 个问题待确认` : '确信度高，跳过澄清' } : s));
      if (clarResult.needed && clarResult.questions.length > 0) {
        setShowClarification(true);
        setFlowStep('clarification');
        setLoading(false);
        setLoadingStep('');
        return;
      }

      setFlowStep('generating');
      setSaveClarifications([]);
      await buildPhases(projectReasoning, input, depth);
      setFlowStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败，请重试');
      setFlowStep('input');
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  }, [input, depth]);

  const buildPhases = useCallback(async (
    projectReasoning: ProjectReasoning,
    userIdea: string,
    selectedDepth: PromptDepth,
    clarificationCtx?: string
  ) => {
    setBuildSteps(prev => prev.map(s => s.id === 'plan' ? { ...s, status: 'active' } : s));
    setLoadingStep('动态合成 Prompt...');
    const phases = planPhases(projectReasoning, userIdea, selectedDepth, clarificationCtx);
    setBuildSteps(prev => prev.map(s => s.id === 'plan' ? { ...s, status: 'done', detail: `${phases.length} 个阶段` } : s));

    setBuildSteps(prev => prev.map(s => s.id === 'compile' ? { ...s, status: 'active' } : s));
    setLoadingStep('编译 Prompt 包...');

    setBuildSteps(prev => prev.map(s => s.id === 'score' ? { ...s, status: 'active' } : s));
    setLoadingStep('质量评分中...');
    const scoredPhases: CompiledPhase[] = [];
    for (const phase of phases) {
      const scoreResult = scorePrompt(phase.prompt, userIdea);
      scoredPhases.push({
        ...phase,
        score: scoreResult.total,
        scoreFeedback: scoreResult.feedback,
      });
    }
    setBuildSteps(prev => prev.map(s => {
      if (s.id === 'score') return { ...s, status: 'done', detail: `平均 ${Math.round(scoredPhases.reduce((a, p) => a + (p.score || 0), 0) / scoredPhases.length)} 分` };
      if (s.id === 'compile') return { ...s, status: 'done' };
      return s;
    }));

    const compiled = compilePromptPack(userIdea, projectReasoning, scoredPhases, selectedDepth);
    setPack(compiled);
    setSelectedIndex(0);
    setMobileView('phases');

    try {
      recordGeneration({
        input: userIdea,
        primaryType: projectReasoning.primaryType,
        secondaryTypes: projectReasoning.secondaryTypes,
        complexity: projectReasoning.complexity,
        stack: projectReasoning.recommendedStack,
        phaseCount: scoredPhases.length,
      });
    } catch {
      // memory recording is non-critical
    }

    const combinedOutput = scoredPhases
      .map(p => `# ${p.name}\n\n${p.description}\n\n${p.prompt}`)
      .join('\n\n---\n\n');
    setSaveCombinedOutput(combinedOutput);
    setSaveTitle(projectReasoning.primaryTypeLabel || '未知项目');
    setSaveCategory(projectReasoning.primaryType);
    setSaveTags(projectReasoning.secondaryTypes || []);
    setSaveInput(userIdea);
    setShowSaveDialog(true);
  }, []);

  const handleConfirmClarification = useCallback(async () => {
    if (!reasoning) return;
    setShowClarification(false);
    setLoading(true);
    setFlowStep('generating');
    setLoadingStep('融合用户反馈...');

    const mergedContext = clarification
      ? mergeAnswersWithContext(input, answers, clarification.questions)
      : undefined;

    const clarTexts = clarification?.questions.map(q => {
      const ans = answers[q.id] || '未回答';
      return `Q: ${q.question}\nA: ${ans}`;
    }) || [];
    setSaveClarifications(clarTexts);

    await buildPhases(reasoning, input, depth, mergedContext);
    setFlowStep('done');
    setLoading(false);
    setLoadingStep('');
  }, [reasoning, clarification, answers, input, depth, buildPhases]);

  const handleSkipClarification = useCallback(async () => {
    if (!reasoning) return;
    setShowClarification(false);
    setLoading(true);
    setFlowStep('generating');
    setSaveClarifications([]);
    await buildPhases(reasoning, input, depth);
    setFlowStep('done');
    setLoading(false);
  }, [reasoning, input, depth, buildPhases]);

  const handleExampleClick = useCallback((example: string) => {
    setInput(example);
  }, []);

  const selectedPhase = useMemo(() => {
    return pack ? pack.phases[selectedIndex] ?? null : null;
  }, [pack, selectedIndex]);

  const handleSaveToLibrary = useCallback(async () => {
    if (!saveTitle.trim() || !saveCombinedOutput) return;
    setSaving(true);
    try {
      const saved = await savePrompt({
        title: saveTitle,
        category: saveCategory,
        phase: savePhase,
        projectId: saveProjectId || undefined,
        input: saveInput,
        fullPrompt: saveCombinedOutput,
        tags: saveTags,
        clarifications: saveClarifications,
      });
      if (saved?.id) {
        setSavedAssetId(saved.id);
      }
      setShowSaveDialog(false);
    } catch (e) {
      console.error('保存失败:', e);
    } finally {
      setSaving(false);
    }
  }, [saveTitle, saveCategory, savePhase, saveProjectId, saveInput, saveCombinedOutput, saveTags, saveClarifications]);

  const handleSaveAndExecute = useCallback(async () => {
    if (!saveTitle.trim() || !saveCombinedOutput) return;
    setSaving(true);
    try {
      const saved = await savePrompt({
        title: saveTitle,
        category: saveCategory,
        phase: savePhase,
        projectId: saveProjectId || undefined,
        input: saveInput,
        fullPrompt: saveCombinedOutput,
        tags: saveTags,
        clarifications: saveClarifications,
      });
      if (saved?.id) {
        setSavedAssetId(saved.id);
        setShowSaveDialog(false);
        router.push(`/playground?prompt=${encodeURIComponent(saveCombinedOutput)}&assetId=${saved.id}`);
      }
    } catch (e) {
      console.error('保存失败:', e);
    } finally {
      setSaving(false);
    }
  }, [saveTitle, saveCategory, savePhase, saveProjectId, saveInput, saveCombinedOutput, saveTags, saveClarifications, router]);

  return (
    <>
    <div className="min-h-[calc(100vh-80px)] flex flex-col">
      <div className="border-b border-[rgba(255,255,255,0.06)] px-4 py-3">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-[#8B5CF6] animate-pulse" />
            <span className="text-[#A1A1AA] text-sm font-medium hidden sm:inline">Prompt Studio</span>
            <span className="text-[#71717A] text-xs hidden sm:inline">|</span>
            <div className="hidden sm:flex items-center gap-1 bg-[rgba(255,255,255,0.03)] rounded-lg p-0.5 border border-[rgba(255,255,255,0.06)]">
              <Link href="/playground" className="px-3 py-1 text-xs font-medium rounded-md text-[#71717A] hover:text-[#60A5FA] hover:bg-[rgba(59,130,246,0.08)] transition-all">
                执行模式
              </Link>
              <span className="px-3 py-1 text-xs font-medium rounded-md bg-[rgba(139,92,246,0.15)] text-[#A78BFA]">
                提示词模式
              </span>
            </div>
          </div>
          <div className="flex md:hidden gap-1">
            {(['input', 'phases', 'output'] as const).map(view => (
              <button
                key={view}
                onClick={() => setMobileView(view)}
                className={`px-3 py-1 text-xs rounded-md transition-all ${mobileView === view ? 'bg-[rgba(139,92,246,0.2)] text-[#A78BFA]' : 'text-[#71717A] hover:text-[#A1A1AA]'}`}
              >
                {{ input: '输入', phases: '阶段', output: '预览' }[view]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-grow flex max-w-[1600px] mx-auto w-full">
        <aside className={`${mobileView === 'input' ? 'flex' : 'hidden'} md:flex w-full md:w-80 lg:w-96 border-r border-[rgba(255,255,255,0.06)] flex-col bg-[#09090B]/50`}>
          <div className="px-5 pt-4 pb-2 border-b border-[rgba(255,255,255,0.06)]">
            <div className="flex items-center justify-between mb-3">
              {STEP_INDICATORS.map((step, i) => {
                const isActive = step.key === flowStep;
                const isDone = STEP_INDICATORS.findIndex(s => s.key === flowStep) > i || flowStep === 'done';
                return (
                  <div key={step.key} className="flex items-center gap-1.5">
                    <span className={`text-sm transition-all ${isActive ? 'scale-110' : isDone ? 'opacity-60' : 'opacity-30'}`}>
                      {step.icon}
                    </span>
                    <span className={`text-[10px] transition-all hidden lg:inline ${
                      isActive ? 'text-[#A78BFA] font-semibold' : isDone ? 'text-[#71717A] line-through' : 'text-[#52525B]'
                    }`}>
                      {step.label}
                    </span>
                    {i < STEP_INDICATORS.length - 1 && (
                      <div className={`w-4 h-px mx-0.5 ${isDone ? 'bg-[#8B5CF6]' : 'bg-[rgba(255,255,255,0.06)]'}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="p-5 border-b border-[rgba(255,255,255,0.06)]">
            <h2 className="text-sm font-semibold text-[#FAFAFA] mb-1">产品想法</h2>
            <p className="text-xs text-[#71717A] mb-4">输入想法 → 识别类型 → 追问澄清 → 精准生成</p>
            <textarea
              value={input}
              onChange={(e) => { setInput(e.target.value); if (flowStep !== 'input') setFlowStep('input'); }}
              placeholder="例如：开发校园二手交易+兴趣社交平台..."
              className="w-full bg-[#111113] border border-[rgba(255,255,255,0.1)] rounded-xl px-4 py-3 text-[#FAFAFA] placeholder-[#71717A] focus:outline-none focus:border-[#8B5CF6] resize-none text-sm leading-relaxed min-h-[100px] max-h-[200px]"
              rows={4}
            />

            <div className="mt-4 mb-3">
              <p className="text-xs text-[#71717A] mb-2">输出深度</p>
              <div className="grid grid-cols-4 gap-1.5">
                {DEPTH_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setDepth(opt.value)}
                    className={`p-2 rounded-lg text-center transition-all border ${
                      depth === opt.value
                        ? 'border-[#8B5CF6] bg-[rgba(139,92,246,0.12)] text-[#A78BFA]'
                        : 'border-[rgba(255,255,255,0.06)] text-[#71717A] hover:border-[rgba(139,92,246,0.3)]'
                    }`}
                  >
                    <div className="text-base mb-0.5">{opt.icon}</div>
                    <div className="text-[10px] font-medium">{opt.label}</div>
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-[#71717A] mt-1.5">
                {DEPTH_OPTIONS.find(o => o.value === depth)?.desc}
              </p>
            </div>

            <button
              onClick={handleGenerate}
              disabled={!input.trim() || loading}
              className="w-full mt-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6] text-white hover:shadow-lg hover:shadow-[rgba(139,92,246,0.3)] transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {loadingStep || '生成中...'}
                </>
              ) : '智能生成 Prompt'}
            </button>

            {error && (
              <p className="mt-2 text-xs text-[#EF4444]">{error}</p>
            )}
          </div>

          <div className="flex-grow overflow-y-auto p-5">
            {personalHint && (
              <div className="mb-4 p-3 rounded-lg bg-[rgba(139,92,246,0.08)] border border-[rgba(139,92,246,0.2)]">
                <p className="text-xs text-[#A78BFA] leading-relaxed">{personalHint}</p>
              </div>
            )}

            {reasoning && !showClarification && (
              <div className="mb-4 p-4 rounded-xl bg-[#0a0a0c] border border-[rgba(255,255,255,0.06)]">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                  <h3 className="text-xs font-semibold text-[#FAFAFA]">推理结果</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[10px] text-[#71717A]">类型</span>
                    <span className="text-[10px] text-[#60A5FA] font-medium">{reasoning.primaryTypeLabel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[10px] text-[#71717A]">复杂度</span>
                    <span className="text-[10px] text-[#A1A1AA]">{reasoning.complexity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[10px] text-[#71717A]">确信度</span>
                    <div className="flex items-center gap-1.5">
                      <div className="w-16 h-1 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${reasoning.confidence}%`,
                            backgroundColor: reasoning.confidence >= 80 ? '#10B981' : '#F59E0B',
                          }}
                        />
                      </div>
                      <span className="text-[10px] text-[#A1A1AA]">{reasoning.confidence}%</span>
                    </div>
                  </div>
                  {reasoning.secondaryTypes.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[10px] text-[#71717A]">复合类型</span>
                      <span className="text-[10px] text-[#A1A1AA]">{reasoning.secondaryTypes.join(' + ')}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {showClarification && clarification && (
              <div className="mb-4 p-4 rounded-xl bg-[rgba(245,158,11,0.05)] border border-[rgba(245,158,11,0.2)]">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] animate-pulse" />
                  <h3 className="text-xs font-semibold text-[#F59E0B]">需求澄清</h3>
                </div>
                <p className="text-[10px] text-[#71717A] mb-3">{clarification.summary}</p>
                <div className="space-y-3">
                  {clarification.questions.map(q => (
                    <div key={q.id}>
                      <p className="text-xs text-[#FAFAFA] mb-1.5">{q.question}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {q.options.map(opt => (
                          <button
                            key={opt}
                            onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                            className={`px-2.5 py-1 text-[10px] rounded-md transition-all border ${
                              answers[q.id] === opt
                                ? 'border-[#8B5CF6] bg-[rgba(139,92,246,0.15)] text-[#A78BFA]'
                                : 'border-[rgba(255,255,255,0.06)] text-[#71717A] hover:text-[#A1A1AA]'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={handleConfirmClarification}
                    className="flex-1 px-3 py-2 text-xs font-medium rounded-lg bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6] text-white hover:shadow-lg transition-all"
                  >
                    确认并生成
                  </button>
                  <button
                    onClick={handleSkipClarification}
                    className="px-3 py-2 text-xs font-medium rounded-lg border border-[rgba(255,255,255,0.1)] text-[#71717A] hover:text-[#A1A1AA] transition-all"
                  >
                    跳过
                  </button>
                </div>
              </div>
            )}

            <h3 className="text-xs text-[#71717A] uppercase tracking-wider mb-3">快速示例</h3>
            <div className="space-y-2">
              {EXAMPLES.map((example, i) => (
                <button
                  key={i}
                  onClick={() => handleExampleClick(example)}
                  className="w-full text-left p-3 rounded-lg border border-[rgba(255,255,255,0.06)] hover:border-[rgba(139,92,246,0.3)] hover:bg-[rgba(139,92,246,0.05)] transition-all text-xs text-[#A1A1AA] hover:text-[#FAFAFA] leading-relaxed"
                >
                  {example}
                </button>
              ))}
            </div>

            {pack && (
              <div className="mt-6 pt-6 border-t border-[rgba(255,255,255,0.06)]">
                <StrategySummary pack={pack} />
              </div>
            )}
          </div>
        </aside>

        <div className={`${mobileView === 'phases' ? 'flex' : 'hidden'} md:flex w-full md:w-72 lg:w-80 border-r border-[rgba(255,255,255,0.06)] flex-col bg-[#09090B]/30`}>
          <div className="p-4 border-b border-[rgba(255,255,255,0.06)]">
            <h2 className="text-sm font-semibold text-[#FAFAFA]">
              {pack ? `${pack.phases.length} 个阶段` : '开发阶段'}
            </h2>
            {pack && (
              <p className="text-[10px] text-[#71717A] mt-1">{pack.summary}</p>
            )}
          </div>
          <div className="flex-grow overflow-y-auto p-3 space-y-2">
            {pack ? (
              pack.phases.map((phase, i) => (
                <PromptPhaseCard
                  key={phase.id}
                  phase={phase}
                  index={i}
                  isSelected={selectedIndex === i}
                  onSelect={() => { setSelectedIndex(i); setMobileView('output'); }}
                />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center px-6 py-20">
                <div className="w-12 h-12 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-[#71717A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
                  </svg>
                </div>
                <p className="text-xs text-[#71717A]">输入产品想法后生成阶段列表</p>
              </div>
            )}
          </div>
        </div>

        <main className={`${mobileView === 'output' ? 'flex' : 'hidden'} md:flex flex-col flex-grow min-w-0`}>
          {pack ? (
            <PromptOutput
              phase={selectedPhase}
              phaseIndex={selectedIndex}
              totalPhases={pack.phases.length}
              savedAssetId={savedAssetId}
            />
          ) : buildSteps.length > 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-8 py-20">
              <div className="w-full max-w-sm space-y-3">
                <h3 className="text-sm font-semibold text-[#FAFAFA] mb-4 text-center">构建进度</h3>
                {buildSteps.map(step => (
                  <div key={step.id} className="flex items-start gap-3">
                    <div className="mt-0.5 flex-shrink-0">
                      {step.status === 'done' ? (
                        <svg className="w-4 h-4 text-[#10B981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : step.status === 'active' ? (
                        <svg className="w-4 h-4 text-[#8B5CF6] animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-[rgba(255,255,255,0.1)]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium ${step.status === 'done' ? 'text-[#10B981]' : step.status === 'active' ? 'text-[#A78BFA]' : 'text-[#52525B]'}`}>
                        {step.label}
                      </p>
                      {step.detail && (
                        <p className="text-[10px] text-[#71717A] mt-0.5">{step.detail}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center px-8 py-20">
              <div className="w-16 h-16 rounded-2xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-[#71717A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                </svg>
              </div>
              <h3 className="text-[#FAFAFA] font-medium mb-2">输入想法，开始构建</h3>
              <p className="text-[#71717A] text-sm">在左侧输入产品想法，系统将自动推理、澄清并生成精准 Prompt</p>
            </div>
          )}
        </main>
      </div>
    </div>

    {showSaveDialog && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="w-full max-w-lg mx-4 bg-[#111113] border border-[rgba(255,255,255,0.1)] rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold text-[#FAFAFA]">保存到资产库</h3>
            <button onClick={() => setShowSaveDialog(false)} className="text-[#71717A] hover:text-[#FAFAFA] transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs text-[#71717A] mb-1.5">标题</label>
              <input
                value={saveTitle}
                onChange={e => setSaveTitle(e.target.value)}
                className="w-full bg-[#0a0a0c] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2 text-sm text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>

            <div>
              <label className="block text-xs text-[#71717A] mb-1.5">所属项目</label>
              <input
                value={saveProjectId}
                onChange={e => setSaveProjectId(e.target.value)}
                placeholder="项目 ID（可选）"
                className="w-full bg-[#0a0a0c] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2 text-sm text-[#FAFAFA] placeholder-[#52525B] focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>

            <div>
              <label className="block text-xs text-[#71717A] mb-1.5">阶段</label>
              <select
                value={savePhase}
                onChange={e => setSavePhase(e.target.value as PromptPhase)}
                className="w-full bg-[#0a0a0c] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2 text-sm text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
              >
                <option value="idea">💡 想法</option>
                <option value="architecture">🏗️ 架构</option>
                <option value="implementation">⚙️ 实现</option>
                <option value="optimization">🚀 优化</option>
                <option value="debug">🔍 调试</option>
                <option value="deployment">📦 部署</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-[#71717A] mb-1.5">标签</label>
              {saveTags.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {saveTags.map((tag, i) => (
                    <span key={i} className="px-2 py-0.5 text-[10px] rounded bg-[rgba(139,92,246,0.15)] text-[#A78BFA] border border-[rgba(139,92,246,0.2)]">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#52525B]">无标签</p>
              )}
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setShowSaveDialog(false)}
              className="px-4 py-2.5 rounded-lg text-sm font-medium border border-[rgba(255,255,255,0.1)] text-[#71717A] hover:text-[#A1A1AA] transition-all"
            >
              跳过
            </button>
            <button
              onClick={handleSaveToLibrary}
              disabled={saving || !saveTitle.trim()}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border border-[rgba(139,92,246,0.3)] text-[#A78BFA] hover:bg-[rgba(139,92,246,0.08)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? '保存中...' : '保存到资产库'}
            </button>
            <button
              onClick={handleSaveAndExecute}
              disabled={saving || !saveTitle.trim()}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6] text-white hover:shadow-lg hover:shadow-[rgba(139,92,246,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? '保存中...' : '保存并执行'}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
