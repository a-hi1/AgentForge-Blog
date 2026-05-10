'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import Link from 'next/link';
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
import { savePrompt } from '@/lib/prompt/history';
import PromptPhaseCard from '@/components/prompt/PromptPhaseCard';
import PromptOutput from '@/components/prompt/PromptOutput';
import StrategySummary from '@/components/prompt/StrategySummary';

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

const STEP_INDICATORS = [
  { key: 'input', label: '输入想法', icon: '💡' },
  { key: 'reasoning', label: '识别类型', icon: '🔍' },
  { key: 'clarification', label: '深度追问', icon: '❓' },
  { key: 'generating', label: '生成 Prompt', icon: '⚡' },
] as const;

export default function PromptPage() {
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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const idea = urlParams.get('idea');
      if (idea) {
        setInput(idea);
      }
    }
  }, []);

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

    try {
      setLoadingStep('深度推理分析中...');
      const projectReasoning = await reasonProject(input);
      setReasoning(projectReasoning);
      setFlowStep('reasoning');

      const hint = getPersonalizedHint(projectReasoning.primaryType);
      setPersonalHint(hint);

      setLoadingStep('生成澄清问题...');
      const clarResult = await generateClarifications(input, projectReasoning);
      setClarification(clarResult);
      if (clarResult.needed && clarResult.questions.length > 0) {
        setShowClarification(true);
        setFlowStep('clarification');
        setLoading(false);
        setLoadingStep('');
        return;
      }

      setFlowStep('generating');
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
    setLoadingStep('动态合成 Prompt...');
    const phases = planPhases(projectReasoning, userIdea, selectedDepth, clarificationCtx);

    setLoadingStep('质量评分中...');
    const scoredPhases: CompiledPhase[] = [];
    for (const phase of phases) {
      const scoreResult = scorePrompt(phase.prompt, userIdea);
      scoredPhases.push({
        ...phase,
        score: scoreResult.total,
      });
    }

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

    try {
      const combinedOutput = scoredPhases
        .map(p => `# ${p.name}\n\n${p.description}\n\n${p.prompt}`)
        .join('\n\n---\n\n');
      
      await savePrompt({
        title: projectReasoning.primaryTypeLabel || '未知项目',
        project_type: projectReasoning.primaryType,
        phase: undefined,
        project_id: undefined,
        input: userIdea,
        output: combinedOutput,
        tags: projectReasoning.secondaryTypes,
      });
    } catch {
      // prompt history saving is non-critical
    }
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

  return (
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
          <PromptOutput
            phase={selectedPhase}
            phaseIndex={selectedIndex}
            totalPhases={pack?.phases.length ?? 0}
          />
        </main>
      </div>
    </div>
  );
}
