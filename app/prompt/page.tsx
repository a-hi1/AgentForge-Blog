'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { IntentResult, ArchitectureResult, ReasoningStep } from '@/lib/prompt-orchestrator/reasoner';
import { compilePromptPack } from '@/lib/prompt-orchestrator/promptCompiler';
import type { CompiledPack } from '@/lib/prompt-orchestrator/promptCompiler';
import type { PromptDepth } from '@/lib/prompt-orchestrator/templates';
import type { CompiledPhase } from '@/lib/prompt-orchestrator/templates';
import { savePrompt } from '@/lib/prompt/history';
import PromptOutput from '@/components/prompt/PromptOutput';
import StrategySummary from '@/components/prompt/StrategySummary';
import { saveContext } from '@/lib/session/contextStore';
import { trackFunnelEvent } from '@/lib/analytics/funnelTracker';

const EXAMPLES = [
  '开发校园二手交易+兴趣社交平台',
  '做一个 SaaS 团队协作工具，支持任务管理和文档协作',
  '构建一个 AI 驱动的代码审查助手',
  '开发在线教育平台，支持视频课程和作业批改',
  '企业级 CRM 客户关系管理系统',
  '实时数据监控仪表板，支持多数据源聚合',
];

type FlowStep = 'input' | 'reasoning' | 'done';

const CHAIN_STEPS = [
  { key: 'intent', label: '意图识别', icon: '🔍', desc: '理解你的业务目标' },
  { key: 'architecture', label: '架构决策', icon: '🏗️', desc: '选择技术方案' },
  { key: 'compile', label: 'Prompt 编译', icon: '⚡', desc: '生成开发 Prompt' },
] as const;

export default function PromptPage() {
  const router = useRouter();
  const [input, setInput] = useState('');
  const [pack, setPack] = useState<CompiledPack | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [flowStep, setFlowStep] = useState<FlowStep>('input');
  const [reasoningSteps, setReasoningSteps] = useState<ReasoningStep[]>([]);
  const [activeChainStep, setActiveChainStep] = useState<string | null>(null);
  const [saveCombinedOutput, setSaveCombinedOutput] = useState('');
  const [saveInput, setSaveInput] = useState('');
  const [saveTitle, setSaveTitle] = useState('');
  const [saveCategory, setSaveCategory] = useState('');
  const [saveTags, setSaveTags] = useState<string[]>([]);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const idea = urlParams.get('idea');
      if (idea) setInput(idea);
    }
    saveContext({ lastPage: '/prompt' });
    trackFunnelEvent('studio_open');
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError('');
    setPack(null);
    setReasoningSteps([]);
    setFlowStep('reasoning');
    setActiveChainStep('intent');

    try {
      const response = await fetch('/api/prompt-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: input.trim() }),
      });

      if (!response.ok) {
        throw new Error(`请求失败: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('无法读取响应流');

      const decoder = new TextDecoder();
      let buffer = '';
      let finalPrompt = '';
      const accumulatedSteps: ReasoningStep[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = JSON.parse(line.slice(6));

          if (data.type === 'progress') {
            setActiveChainStep(data.step);
          } else if (data.type === 'step') {
            const step = data.step as ReasoningStep;
            accumulatedSteps.push(step);
            setReasoningSteps([...accumulatedSteps]);
          } else if (data.type === 'done') {
            finalPrompt = data.prompt;
          } else if (data.type === 'error') {
            throw new Error(data.error);
          }
        }
      }

      if (!finalPrompt) throw new Error('未收到生成的 Prompt');

      let intent: IntentResult = { businessGoal: '待定', userType: '待定', productShape: '待定', lifecycle: '待定', ambiguity: '', decisionPoints: [] };
      let architecture: ArchitectureResult = { frontend: '待定', backend: '待定', db: '待定', infra: [], reasoning: '', rejectedAlternatives: [] };

      for (const step of accumulatedSteps) {
        if (step.type === 'intent') intent = step.result as IntentResult;
        if (step.type === 'architecture') architecture = step.result as ArchitectureResult;
      }

      const compiled = compilePromptPack(input.trim(), intent, architecture, finalPrompt, 'standard');
      setPack(compiled);
      setSaveCombinedOutput(finalPrompt);
      setSaveTitle(intent.businessGoal.slice(0, 50) || '生成的 Prompt');
      setSaveCategory('deep-reasoning');
      setSaveTags([architecture.frontend, architecture.backend, architecture.db].filter(Boolean));
      setSaveInput(input.trim());
      setFlowStep('done');
      setActiveChainStep(null);
      trackFunnelEvent('generate', undefined, { frontend: architecture.frontend, backend: architecture.backend });
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败，请重试');
      setFlowStep('input');
      setActiveChainStep(null);
    } finally {
      setLoading(false);
    }
  }, [input]);

  const handleCopyPrompt = useCallback(async () => {
    if (!saveCombinedOutput) return;
    try {
      await navigator.clipboard.writeText(saveCombinedOutput);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = saveCombinedOutput;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    }
  }, [saveCombinedOutput]);

  const handleStartTask = useCallback(() => {
    if (!saveCombinedOutput) return;
    router.push(`/playground?prompt=${encodeURIComponent(saveCombinedOutput)}`);
  }, [saveCombinedOutput, router]);

  const handleSaveAsCandidate = useCallback(async () => {
    if (!saveTitle.trim() || !saveCombinedOutput) return;
    try {
      const saved = await savePrompt({
        title: saveTitle,
        category: saveCategory,
        phase: 'idea',
        input: saveInput,
        fullPrompt: saveCombinedOutput,
        tags: saveTags,
      });
      if (saved?.id) {
        trackFunnelEvent('asset_saved', saved.id, { title: saveTitle, category: saveCategory });
      }
    } catch (e) {
      console.error('保存失败:', e);
    }
  }, [saveTitle, saveCategory, saveInput, saveCombinedOutput, saveTags]);

  const selectedPhase = useMemo<CompiledPhase | null>(() => {
    return pack ? pack.phases[0] ?? null : null;
  }, [pack]);

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
                Workbench
              </Link>
              <span className="px-3 py-1 text-xs font-medium rounded-md bg-[rgba(139,92,246,0.15)] text-[#A78BFA]">
                提示词模式
              </span>
            </div>
          </div>
          {pack && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyPrompt}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[rgba(255,255,255,0.1)] text-[#A1A1AA] hover:text-[#FAFAFA] hover:border-[rgba(255,255,255,0.2)] transition-all flex items-center gap-1.5"
              >
                {copiedPrompt ? (
                  <><svg className="w-3.5 h-3.5 text-[#10B981]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>已复制</>
                ) : (
                  <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>复制 Prompt</>
                )}
              </button>
              <button
                onClick={handleStartTask}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6] text-white hover:shadow-lg hover:shadow-[rgba(139,92,246,0.3)] transition-all flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                开始任务
              </button>
              <button
                onClick={handleSaveAsCandidate}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[rgba(139,92,246,0.3)] text-[#A78BFA] hover:bg-[rgba(139,92,246,0.08)] transition-all"
              >
                保存为候选
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-grow flex max-w-[1600px] mx-auto w-full">
        <aside className="flex w-full md:w-80 lg:w-96 border-r border-[rgba(255,255,255,0.06)] flex-col bg-[#09090B]/50">
          <div className="px-5 pt-4 pb-2 border-b border-[rgba(255,255,255,0.06)]">
            <div className="flex items-center justify-between mb-3">
              {CHAIN_STEPS.map((step, i) => {
                const isActive = activeChainStep === step.key;
                const isDone = reasoningSteps.some(s => s.type === step.key);
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
                    {i < CHAIN_STEPS.length - 1 && (
                      <div className={`w-4 h-px mx-0.5 ${isDone ? 'bg-[#8B5CF6]' : 'bg-[rgba(255,255,255,0.06)]'}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-5 border-b border-[rgba(255,255,255,0.06)]">
            <h2 className="text-sm font-semibold text-[#FAFAFA] mb-1">产品想法</h2>
            <p className="text-xs text-[#71717A] mb-4">输入想法 → 深度推理 → 架构决策 → 生成 Prompt</p>
            <textarea
              value={input}
              onChange={(e) => { setInput(e.target.value); if (flowStep !== 'input') setFlowStep('input'); }}
              placeholder="例如：开发校园二手交易+兴趣社交平台..."
              className="w-full bg-[#111113] border border-[rgba(255,255,255,0.1)] rounded-xl px-4 py-3 text-[#FAFAFA] placeholder-[#71717A] focus:outline-none focus:border-[#8B5CF6] resize-none text-sm leading-relaxed min-h-[100px] max-h-[200px]"
              rows={4}
            />
            <button
              onClick={handleGenerate}
              disabled={!input.trim() || loading}
              className="w-full mt-4 px-4 py-2.5 rounded-lg text-sm font-medium bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6] text-white hover:shadow-lg hover:shadow-[rgba(139,92,246,0.3)] transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {activeChainStep ? CHAIN_STEPS.find(s => s.key === activeChainStep)?.desc : '推理中...'}
                </>
              ) : '深度推理生成'}
            </button>
            {error && <p className="mt-2 text-xs text-[#EF4444]">{error}</p>}
          </div>

          <div className="flex-grow overflow-y-auto p-5">
            {reasoningSteps.length > 0 && (
              <div className="mb-4 space-y-3">
                {reasoningSteps.map((step, i) => (
                  <div key={i} className="p-3 rounded-lg bg-[#0a0a0c] border border-[rgba(255,255,255,0.06)]">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${step.status === 'done' ? 'bg-[#10B981]' : 'bg-[#EF4444]'}`} />
                      <span className="text-[11px] font-semibold text-[#FAFAFA]">{step.label}</span>
                    </div>
                    {step.type === 'intent' && step.status === 'done' && (() => {
                      const r = step.result as IntentResult;
                      return (
                        <div className="space-y-1.5 text-[10px]">
                          <div className="flex justify-between"><span className="text-[#71717A]">业务目标</span><span className="text-[#60A5FA]">{r.businessGoal}</span></div>
                          <div className="flex justify-between"><span className="text-[#71717A]">目标用户</span><span className="text-[#A1A1AA]">{r.userType}</span></div>
                          <div className="flex justify-between"><span className="text-[#71717A]">产品形态</span><span className="text-[#A1A1AA]">{r.productShape}</span></div>
                          <div className="flex justify-between"><span className="text-[#71717A]">项目阶段</span><span className="text-[#A1A1AA]">{r.lifecycle}</span></div>
                          {r.decisionPoints.length > 0 && (
                            <div className="pt-1.5 mt-1.5 border-t border-[rgba(255,255,255,0.04)]">
                              <span className="text-[#71717A]">决策依据：</span>
                              <div className="mt-1 space-y-0.5">
                                {r.decisionPoints.slice(0, 3).map((p, j) => (
                                  <p key={j} className="text-[#A1A1AA]">• {p}</p>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                    {step.type === 'architecture' && step.status === 'done' && (() => {
                      const r = step.result as ArchitectureResult;
                      return (
                        <div className="space-y-1.5 text-[10px]">
                          <div className="flex justify-between"><span className="text-[#71717A]">前端</span><span className="text-[#818cf8]">{r.frontend}</span></div>
                          <div className="flex justify-between"><span className="text-[#71717A]">后端</span><span className="text-[#818cf8]">{r.backend}</span></div>
                          <div className="flex justify-between"><span className="text-[#71717A]">数据库</span><span className="text-[#818cf8]">{r.db}</span></div>
                          {r.infra.length > 0 && (
                            <div className="flex justify-between"><span className="text-[#71717A]">基础设施</span><span className="text-[#A78BFA]">{r.infra.join(', ')}</span></div>
                          )}
                          {r.rejectedAlternatives.length > 0 && (
                            <div className="pt-1.5 mt-1.5 border-t border-[rgba(255,255,255,0.04)]">
                              <span className="text-[#71717A]">被拒绝方案：</span>
                              <div className="mt-1 space-y-0.5">
                                {r.rejectedAlternatives.slice(0, 2).map((a, j) => (
                                  <p key={j} className="text-[#F59E0B]">❌ {a}</p>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                    {step.type === 'compile' && step.status === 'done' && (
                      <p className="text-[10px] text-[#10B981]">✓ Prompt 已生成 ({(step.result as string).length} 字)</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <h3 className="text-xs text-[#71717A] uppercase tracking-wider mb-3">快速示例</h3>
            <div className="space-y-2">
              {EXAMPLES.map((example, i) => (
                <button
                  key={i}
                  onClick={() => setInput(example)}
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

        <main className="flex flex-col flex-grow min-w-0">
          {pack && selectedPhase ? (
            <PromptOutput
              phase={selectedPhase}
              phaseIndex={0}
              totalPhases={1}
            />
          ) : loading ? (
            <div className="flex flex-col items-center justify-center h-full px-8 py-20">
              <div className="w-full max-w-sm space-y-4">
                <h3 className="text-sm font-semibold text-[#FAFAFA] mb-4 text-center">深度推理链</h3>
                {CHAIN_STEPS.map(step => {
                  const isDone = reasoningSteps.some(s => s.type === step.key);
                  const isActive = activeChainStep === step.key;
                  return (
                    <div key={step.key} className="flex items-start gap-3">
                      <div className="mt-0.5 flex-shrink-0">
                        {isDone ? (
                          <svg className="w-4 h-4 text-[#10B981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : isActive ? (
                          <svg className="w-4 h-4 text-[#8B5CF6] animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-[rgba(255,255,255,0.1)]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium ${isDone ? 'text-[#10B981]' : isActive ? 'text-[#A78BFA]' : 'text-[#52525B]'}`}>
                          {step.icon} {step.label}
                        </p>
                        <p className="text-[10px] text-[#71717A] mt-0.5">{step.desc}</p>
                        {isDone && reasoningSteps.find(s => s.type === step.key) && (() => {
                          const doneStep = reasoningSteps.find(s => s.type === step.key)!;
                          if (doneStep.type === 'intent') {
                            const r = doneStep.result as IntentResult;
                            return <p className="text-[10px] text-[#60A5FA] mt-1">{r.businessGoal}</p>;
                          }
                          if (doneStep.type === 'architecture') {
                            const r = doneStep.result as ArchitectureResult;
                            return <p className="text-[10px] text-[#818cf8] mt-1">{r.frontend} + {r.backend} + {r.db}</p>;
                          }
                          if (doneStep.type === 'compile') {
                            return <p className="text-[10px] text-[#10B981] mt-1">Prompt 已就绪</p>;
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center px-8 py-20">
              <div className="w-16 h-16 rounded-2xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-[#71717A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                </svg>
              </div>
              <h3 className="text-[#FAFAFA] font-medium mb-2">输入想法，开始深度推理</h3>
              <p className="text-[#71717A] text-sm">系统将通过三阶段推理链生成差异化的高质量开发 Prompt</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}