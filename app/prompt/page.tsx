'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { IntentResult, ArchitectureResult, ReasoningStep } from '@/lib/prompt-orchestrator/reasoner';
import { compilePromptPack } from '@/lib/prompt-orchestrator/promptCompiler';
import type { CompiledPack } from '@/lib/prompt-orchestrator/promptCompiler';
import { savePrompt } from '@/lib/prompt/history';
import { saveContext } from '@/lib/session/contextStore';
import { trackFunnelEvent } from '@/lib/analytics/funnelTracker';

const EXAMPLES = [
  '校园二手交易+兴趣社交平台',
  'SaaS 团队协作工具，任务管理+文档',
  'AI 驱动的代码审查助手',
  '在线教育平台，视频课程+作业批改',
  '企业级 CRM 客户关系管理',
  '实时数据监控仪表板',
];

const CHAIN = [
  { key: 'intent', label: '意图识别' },
  { key: 'architecture', label: '架构决策' },
  { key: 'compile', label: 'Prompt 编译' },
] as const;

export default function PromptPage() {
  const router = useRouter();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reasoningSteps, setReasoningSteps] = useState<ReasoningStep[]>([]);
  const [activeChainStep, setActiveChainStep] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [pack, setPack] = useState<CompiledPack | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const idea = new URLSearchParams(window.location.search).get('idea');
      if (idea) setInput(idea);
    }
    saveContext({ lastPage: '/prompt' });
    trackFunnelEvent('studio_open');
    return () => { abortRef.current?.abort(); };
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError('');
    setPrompt('');
    setReasoningSteps([]);
    setActiveChainStep('intent');
    setSaved(false);
    setPack(null);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const response = await fetch('/api/prompt-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: input.trim() }),
        signal: ctrl.signal,
      });

      if (!response.ok) throw new Error(`请求失败 (${response.status})`);

      const reader = response.body?.getReader();
      if (!reader) throw new Error('无法读取响应');

      const decoder = new TextDecoder();
      let buffer = '';
      let finalPrompt = '';
      let finalIntent: IntentResult | null = null;
      let finalArch: ArchitectureResult | null = null;
      const steps: ReasoningStep[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'progress') {
              setActiveChainStep(data.step);
            } else if (data.type === 'step') {
              steps.push(data.step);
              setReasoningSteps([...steps]);
            } else if (data.type === 'done') {
              finalPrompt = data.prompt;
              finalIntent = data.intent || null;
              finalArch = data.architecture || null;
            } else if (data.type === 'error') {
              throw new Error(data.error);
            }
          } catch (parseErr) {
            if (parseErr instanceof Error && parseErr.message !== 'Unexpected end of JSON input') {
              throw parseErr;
            }
          }
        }
      }

      if (!finalPrompt) throw new Error('未收到生成结果');

      for (const s of steps) {
        if (s.type === 'intent' && !finalIntent) finalIntent = s.result as IntentResult;
        if (s.type === 'architecture' && !finalArch) finalArch = s.result as ArchitectureResult;
      }

      const intent = finalIntent || { businessGoal: input.trim().slice(0, 30), userType: '待定', productShape: '待定', lifecycle: '待定', ambiguity: '', decisionPoints: [] };
      const arch = finalArch || { frontend: '待定', backend: '待定', db: '待定', infra: [], reasoning: '', rejectedAlternatives: [] };
      const compiled = compilePromptPack(input.trim(), intent, arch, finalPrompt, 'standard');

      setPrompt(finalPrompt);
      setPack(compiled);
      setActiveChainStep(null);

      try {
        const saved = await savePrompt({
          title: intent.businessGoal.slice(0, 50) || input.trim().slice(0, 30),
          category: 'deep-reasoning',
          phase: 'idea',
          input: input.trim(),
          fullPrompt: finalPrompt,
          tags: [arch.frontend, arch.backend, arch.db].filter(Boolean),
        });
        if (saved?.id) setSaved(true);
      } catch { /* auto-save is best-effort */ }

      trackFunnelEvent('generate', undefined, { frontend: arch.frontend, backend: arch.backend });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : '生成失败，请重试');
      setActiveChainStep(null);
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }, [input]);

  const handleCopy = useCallback(async () => {
    if (!prompt) return;
    try { await navigator.clipboard.writeText(prompt); } catch {
      const ta = document.createElement('textarea');
      ta.value = prompt; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [prompt]);

  const intentResult = reasoningSteps.find(s => s.type === 'intent')?.result as IntentResult | undefined;
  const archResult = reasoningSteps.find(s => s.type === 'architecture')?.result as ArchitectureResult | undefined;
  const hasResult = !!prompt;

  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col">
      <div className="border-b border-[rgba(255,255,255,0.06)] px-4 py-2.5">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6]" />
            <span className="text-[#A1A1AA] text-xs font-medium">Prompt Studio</span>
            <span className="text-[#3f3f46] mx-1">|</span>
            <Link href="/playground" className="text-[10px] text-[#71717A] hover:text-[#60A5FA] transition-colors">Workbench</Link>
            <Link href="/prompt/history" className="text-[10px] text-[#71717A] hover:text-[#60A5FA] transition-colors">历史</Link>
          </div>
          {hasResult && (
            <div className="flex items-center gap-1.5">
              <button onClick={handleCopy} className="px-2.5 py-1 text-[11px] rounded-md border border-[rgba(255,255,255,0.1)] text-[#A1A1AA] hover:text-[#FAFAFA] transition-all">
                {copied ? '✓ 已复制' : '复制'}
              </button>
              <button onClick={() => router.push(`/playground?prompt=${encodeURIComponent(prompt)}`)} className="px-2.5 py-1 text-[11px] rounded-md bg-[#8B5CF6] text-white hover:bg-[#7C3AED] transition-all">
                开始任务
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-8">
          {!hasResult && !loading && (
            <div className="mb-8 text-center">
              <h1 className="text-lg font-semibold text-[#FAFAFA] mb-1">描述你的产品想法</h1>
              <p className="text-xs text-[#71717A]">三阶段深度推理 → 生成可直接使用的开发 Prompt</p>
            </div>
          )}

          <div className="mb-6">
            {!hasResult ? (
              <>
                <textarea
                  value={input}
                  onChange={e => { setInput(e.target.value); if (error) setError(''); }}
                  placeholder="例如：开发一个校园二手交易平台，支持即时聊天和信用评价..."
                  className="w-full bg-[#111113] border border-[rgba(255,255,255,0.08)] rounded-xl px-4 py-3 text-sm text-[#FAFAFA] placeholder-[#52525B] focus:outline-none focus:border-[#8B5CF6] resize-none leading-relaxed"
                  rows={3}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleGenerate(); }}
                />
                <div className="flex items-center justify-between mt-3">
                  <div className="flex flex-wrap gap-1.5">
                    {EXAMPLES.map((ex, i) => (
                      <button key={i} onClick={() => setInput(ex)} className="px-2.5 py-1 text-[10px] rounded-full border border-[rgba(255,255,255,0.06)] text-[#71717A] hover:text-[#A1A1AA] hover:border-[rgba(139,92,246,0.3)] transition-all">
                        {ex}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={handleGenerate}
                    disabled={!input.trim() || loading}
                    className="shrink-0 ml-4 px-5 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6] text-white hover:shadow-lg hover:shadow-[rgba(139,92,246,0.25)] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    深度推理生成
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-[#111113] border border-[rgba(255,255,255,0.06)]">
                <p className="text-sm text-[#A1A1AA] flex-1 truncate">{input}</p>
                <button onClick={() => { setPrompt(''); setPack(null); setReasoningSteps([]); setSaved(false); }} className="shrink-0 px-3 py-1.5 text-[11px] rounded-md border border-[rgba(255,255,255,0.1)] text-[#71717A] hover:text-[#A1A1AA] transition-all">
                  重新生成
                </button>
              </div>
            )}
            {error && (
              <div className="mt-3 p-3 rounded-lg bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] flex items-center justify-between">
                <p className="text-xs text-[#EF4444]">{error}</p>
                <button onClick={handleGenerate} className="text-[11px] text-[#EF4444] hover:text-[#F87171] underline ml-4 shrink-0">重试</button>
              </div>
            )}
          </div>

          {loading && (
            <div className="mb-6">
              <div className="flex items-center justify-center gap-3 py-6">
                {CHAIN.map((step, i) => {
                  const isDone = reasoningSteps.some(s => s.type === step.key);
                  const isActive = activeChainStep === step.key;
                  return (
                    <div key={step.key} className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        {isDone ? (
                          <svg className="w-3.5 h-3.5 text-[#10B981]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                        ) : isActive ? (
                          <svg className="w-3.5 h-3.5 text-[#8B5CF6] animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border border-[rgba(255,255,255,0.1)]" />
                        )}
                        <span className={`text-[11px] ${isDone ? 'text-[#10B981]' : isActive ? 'text-[#A78BFA] font-medium' : 'text-[#52525B]'}`}>
                          {step.label}
                        </span>
                      </div>
                      {i < CHAIN.length - 1 && <div className={`w-8 h-px ${isDone ? 'bg-[#10B981]' : 'bg-[rgba(255,255,255,0.06)]'}`} />}
                    </div>
                  );
                })}
              </div>
              {activeChainStep && (
                <p className="text-center text-[11px] text-[#71717A]">
                  {activeChainStep === 'intent' && '正在分析你的业务目标...'}
                  {activeChainStep === 'architecture' && '正在选择最合适的技术方案...'}
                  {activeChainStep === 'compile' && '正在编译开发 Prompt...'}
                </p>
              )}
            </div>
          )}

          {hasResult && (
            <>
              <div className="mb-4">
                <div className="flex items-center justify-center gap-3 py-3">
                  {CHAIN.map((step, i) => {
                    const isDone = reasoningSteps.some(s => s.type === step.key);
                    return (
                      <div key={step.key} className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5 text-[#10B981]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                          <span className="text-[11px] text-[#10B981]">{step.label}</span>
                        </div>
                        {i < CHAIN.length - 1 && <div className="w-8 h-px bg-[#10B981]" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              {saved && (
                <div className="mb-3 flex items-center justify-center gap-1.5">
                  <svg className="w-3 h-3 text-[#10B981]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  <span className="text-[10px] text-[#10B981]">已自动保存到历史</span>
                </div>
              )}

              <div className="mb-6 rounded-xl bg-[#0a0a0c] border border-[rgba(255,255,255,0.06)] overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-[rgba(255,255,255,0.04)] bg-[rgba(255,255,255,0.02)]">
                  <span className="text-[11px] text-[#71717A] font-medium">生成的 Prompt</span>
                  <span className="text-[10px] text-[#52525B]">{prompt.length} 字</span>
                </div>
                <pre className="p-4 text-sm text-[#D4D4D8] leading-relaxed whitespace-pre-wrap font-mono overflow-x-auto max-h-[60vh] overflow-y-auto">
                  {prompt}
                </pre>
              </div>

              <button
                onClick={() => setShowDetail(!showDetail)}
                className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg border border-[rgba(255,255,255,0.06)] text-[11px] text-[#71717A] hover:text-[#A1A1AA] hover:border-[rgba(255,255,255,0.1)] transition-all mb-4"
              >
                <span>推理详情</span>
                <svg className={`w-3.5 h-3.5 transition-transform ${showDetail ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>

              {showDetail && (
                <div className="space-y-3 mb-8">
                  {intentResult && (
                    <div className="p-4 rounded-lg bg-[#111113] border border-[rgba(255,255,255,0.06)]">
                      <h4 className="text-[11px] font-semibold text-[#A1A1AA] mb-2.5">意图分析</h4>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div><span className="text-[#52525B]">业务目标</span><p className="text-[#60A5FA] mt-0.5">{intentResult.businessGoal}</p></div>
                        <div><span className="text-[#52525B]">目标用户</span><p className="text-[#A1A1AA] mt-0.5">{intentResult.userType}</p></div>
                        <div><span className="text-[#52525B]">产品形态</span><p className="text-[#A1A1AA] mt-0.5">{intentResult.productShape}</p></div>
                        <div><span className="text-[#52525B]">项目阶段</span><p className="text-[#A1A1AA] mt-0.5">{intentResult.lifecycle}</p></div>
                      </div>
                    </div>
                  )}
                  {archResult && (
                    <div className="p-4 rounded-lg bg-[#111113] border border-[rgba(255,255,255,0.06)]">
                      <h4 className="text-[11px] font-semibold text-[#A1A1AA] mb-2.5">技术架构</h4>
                      <div className="grid grid-cols-2 gap-2 text-[11px] mb-2">
                        <div><span className="text-[#52525B]">前端</span><p className="text-[#818cf8] mt-0.5">{archResult.frontend}</p></div>
                        <div><span className="text-[#52525B]">后端</span><p className="text-[#818cf8] mt-0.5">{archResult.backend}</p></div>
                        <div><span className="text-[#52525B]">数据库</span><p className="text-[#818cf8] mt-0.5">{archResult.db}</p></div>
                        <div><span className="text-[#52525B]">基础设施</span><p className="text-[#A78BFA] mt-0.5">{archResult.infra.join(', ') || '—'}</p></div>
                      </div>
                      {archResult.reasoning && <p className="text-[10px] text-[#71717A] leading-relaxed">{archResult.reasoning}</p>}
                      {archResult.rejectedAlternatives.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-[rgba(255,255,255,0.04)]">
                          {archResult.rejectedAlternatives.map((a, i) => (
                            <p key={i} className="text-[10px] text-[#F59E0B]">✗ {a}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {!hasResult && !loading && (
            <div className="text-center py-12">
              <div className="w-12 h-12 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-[#52525B]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" /></svg>
              </div>
              <p className="text-xs text-[#52525B]">Ctrl+Enter 快速生成</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}