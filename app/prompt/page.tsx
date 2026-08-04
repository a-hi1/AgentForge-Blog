'use client';

import { useState, useCallback, useEffect, useRef, Component, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { savePrompt } from '@/lib/prompt/history';
import { IntentResult, DecomposeResult } from '@/lib/prompt-orchestrator/reasoner';
import CopyPromptButton from '@/components/prompt/CopyPromptButton';

interface UnifiedIntent extends IntentResult {
  techStack: {
    frontend: string;
    backend: string;
    db: string;
    infra: string[];
  };
}

class ErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

const CHAIN = [
  { key: 'intent', label: '理解需求' },
  { key: 'decompose', label: '任务拆解' },
  { key: 'compile', label: '编译输出' },
] as const;

export default function PromptPage() {
  const router = useRouter();
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState(-1);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [fallbackSteps, setFallbackSteps] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState(false);
  const [intent, setIntent] = useState<UnifiedIntent | null>(null);
  const [decompose, setDecompose] = useState<DecomposeResult | null>(null);
  const [showReasoning, setShowReasoning] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!input.trim()) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError('');
    setResult('');
    setCurrentStep(0);
    setCompletedSteps(new Set());
    setFallbackSteps(new Set());
    setSaved(false);
    setIntent(null);
    setDecompose(null);

    try {
      const resp = await fetch('/api/prompt-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userInput: input.trim() }),
        signal: controller.signal,
      });

      if (!resp.ok || !resp.body) {
        throw new Error('请求失败，请重试');
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (!payload.startsWith('{')) continue;
          try {
            const data = JSON.parse(payload);

            if (data.type === 'progress') {
              const idx = CHAIN.findIndex(c => c.key === data.step);
              if (data.status === 'running' && idx >= 0) {
                setCurrentStep(idx);
              }
              if (data.status === 'done' && idx >= 0) {
                setCompletedSteps(prev => new Set([...Array.from(prev), data.step]));
              }
              if (data.status === 'fallback' && idx >= 0) {
                setCompletedSteps(prev => new Set([...Array.from(prev), data.step]));
                setFallbackSteps(prev => new Set([...Array.from(prev), data.step]));
                if (data.result) {
                  if (data.step === 'intent') setIntent(data.result as UnifiedIntent);
                  if (data.step === 'decompose') setDecompose(data.result as DecomposeResult);
                }
              }
            }

            if (data.type === 'progress' && data.step === 'intent' && data.status === 'done' && data.result) {
              setIntent(data.result as UnifiedIntent);
            }

            if (data.type === 'progress' && data.step === 'decompose' && data.status === 'done' && data.result) {
              setDecompose(data.result as DecomposeResult);
            }

            if (data.type === 'done') {
              const promptText = typeof data.prompt === 'string' ? data.prompt : '';
              setResult(promptText);
              setCurrentStep(-1);

              const intentData = data.intent && typeof data.intent === 'object' ? data.intent as UnifiedIntent : intent;
              const decomposeData = data.decompose && typeof data.decompose === 'object' ? data.decompose as DecomposeResult : null;

              if (intentData) setIntent(intentData);
              if (decomposeData) setDecompose(decomposeData);

              if (intentData && promptText) {
                try {
                  const savedRecord = await savePrompt({
                    title: String(intentData.businessGoal || '').slice(0, 50) || input.trim().slice(0, 30),
                    category: 'context-pack',
                    phase: 'idea',
                    input: input.trim(),
                    fullPrompt: promptText,
                    qualityScore: 0,
                    tags: [intentData.techStack.frontend, intentData.techStack.backend, intentData.techStack.db].filter(Boolean) as string[],
                  });
                  if (savedRecord?.id) setSaved(true);
                } catch {
                  /* auto-save is best-effort */
                }
              }
            }

            if (data.type === 'step_error') {
              throw new Error(data.error || '分析超时，请重试');
            }

            if (data.type === 'error') {
              throw new Error(data.error);
            }
          } catch (parseErr) {
            if (parseErr instanceof Error && parseErr.message !== 'Unexpected end of JSON input' && !parseErr.message.includes('请求失败') && !parseErr.message.includes('超时')) {
              throw parseErr;
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [input]);

  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  // Pre-fill from Discovery result
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('agentforge_discovery_result');
      if (stored) {
        const data = JSON.parse(stored);
        if (data.enrichedInput) {
          setInput(data.enrichedInput);
        }
        sessionStorage.removeItem('agentforge_discovery_result');
      }
    } catch { /* ignore */ }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !loading && input.trim()) {
      e.preventDefault();
      handleGenerate();
    }
  };

  const getStepState = (stepKey: string) => {
    if (fallbackSteps.has(stepKey)) return 'fallback';
    if (completedSteps.has(stepKey)) return 'done';
    if (CHAIN[currentStep]?.key === stepKey) return 'active';
    return 'pending';
  };

  return (
    <ErrorBoundary fallback={
      <div className="page-shell min-h-[60vh] flex items-center justify-center">
        <div className="glass-card p-8 text-center max-w-sm">
          <p className="text-lg font-semibold text-white mb-2">渲染出错</p>
          <p className="text-sm text-[var(--text-secondary)] mb-5">请刷新页面重试</p>
          <button onClick={() => window.location.reload()} className="btn-primary mx-auto">刷新页面</button>
        </div>
      </div>
    }>
    <div className="page-shell py-12 sm:py-16">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4 animate-fade-up">
          <div>
            <span className="badge badge-violet mb-4">Context Compiler</span>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">AI 导出</h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">输入需求，生成 AI 可消费的项目上下文。</p>
          </div>
          <button onClick={() => router.push('/prompt/history')} className="btn-secondary shrink-0">历史记录</button>
        </div>

        <div className="glass-card mesh-panel p-5 sm:p-6 mb-6 animate-fade-up animate-delay-1">
          <label htmlFor="prompt-input" className="block text-sm font-medium text-white mb-3">开发需求</label>
          <textarea
            id="prompt-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="例如：做一个支持邮箱登录、文章发布和评论的博客系统..."
            className="input-field min-h-[132px] resize-y"
            rows={4}
          />
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button onClick={handleGenerate} disabled={loading || !input.trim()} className="btn-primary">
              {loading ? '编译中...' : '生成上下文'}
              {!loading && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>}
            </button>
            <button onClick={() => router.push('/prompt/discovery')} disabled={loading} className="btn-secondary">先做方向探索</button>
            {loading && <button onClick={() => abortRef.current?.abort()} className="btn-ghost text-red-300 hover:bg-red-500/10">取消</button>}
            {result && <button onClick={() => { setResult(''); setSaved(false); setIntent(null); setDecompose(null); setFallbackSteps(new Set()); }} className="btn-ghost">重新生成</button>}
            <div className="w-full sm:w-auto sm:ml-auto flex flex-wrap gap-2">
              {['习惯追踪 App', 'AI 写作助手', 'Chrome 书签插件'].map((ex) => (
                <button key={ex} onClick={() => setInput(ex)} className="px-2.5 py-1 rounded-lg border border-[var(--border)] text-xs text-[var(--text-tertiary)] hover:text-white hover:border-[var(--border-strong)] transition-colors cursor-pointer">{ex}</button>
              ))}
            </div>
          </div>
          <p className="text-[11px] text-[var(--text-muted)] mt-3">快捷键：Ctrl / ⌘ + Enter 生成</p>
        </div>

        {loading && (
          <div className="mb-6 flex flex-wrap items-center gap-2.5">
            {CHAIN.map((step, i) => {
              const state = getStepState(step.key);
              return (
                <div key={step.key} className="flex items-center gap-2">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium border ${
                    state === 'done' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' :
                    state === 'fallback' ? 'bg-amber-500/15 border-amber-500/30 text-amber-300' :
                    state === 'active' ? 'bg-violet-500/20 border-violet-500/40 text-violet-200 animate-pulse' :
                    'bg-white/[0.04] border-[var(--border)] text-[var(--text-muted)]'
                  }`}>
                    {state === 'done' ? '✓' : state === 'fallback' ? '!' : i + 1}
                  </div>
                  <span className={`text-sm ${state === 'active' ? 'text-violet-300' : state === 'done' ? 'text-emerald-300' : state === 'fallback' ? 'text-amber-300' : 'text-[var(--text-muted)]'}`}>
                    {step.label}
                    {state === 'fallback' && <span className="text-[10px] ml-1">(降级)</span>}
                  </span>
                  {i < CHAIN.length - 1 && (
                    <div className={`w-8 h-px ${state === 'done' || state === 'fallback' ? 'bg-emerald-500/60' : 'bg-[var(--border)]'}`} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {fallbackSteps.size > 0 && result && (
          <div className="mb-6 rounded-xl border border-amber-500/25 bg-amber-500/10 p-4" role="status">
            <p className="text-sm text-amber-200/80">
              部分阶段使用了降级方案（{Array.from(fallbackSteps).map(s => CHAIN.find(c => c.key === s)?.label || s).join('、')}），
              结果仍可用但精度可能降低。
            </p>
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/25 bg-red-500/10 p-4" role="alert">
            <p className="text-sm text-red-200">{error}</p>
            <button onClick={handleGenerate} className="btn-ghost mt-2 text-red-300">重试</button>
          </div>
        )}

        {result && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-white">Context Pack</h2>
              <div className="flex items-center gap-2">
                {saved && <span className="badge badge-green">已保存</span>}
                <CopyPromptButton text={result} label="复制" variant="compact" />
                <button
                  onClick={() => {
                    const blob = new Blob([result], { type: 'text/markdown' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `context-pack-${Date.now()}.md`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="btn-secondary"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  下载
                </button>
              </div>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[#09090D] p-5 max-h-[500px] overflow-y-auto">
              <pre className="whitespace-pre-wrap font-mono text-sm text-[var(--text-secondary)] leading-relaxed">{result}</pre>
            </div>
          </div>
        )}

        {result && intent && (
          <div className="mb-6">
            <button onClick={() => setShowReasoning(!showReasoning)} className="btn-ghost px-0">
              <span>{showReasoning ? '▾' : '▸'}</span>
              推理详情
            </button>
            {showReasoning && (
              <div className="mt-3 space-y-3">
                <div className="glass-card p-4">
                  <h3 className="mb-2 text-xs font-semibold text-cyan-400">意图 + 架构</h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-[var(--text-muted)]">业务目标：</span><span className="text-[var(--text-secondary)]">{String(intent.businessGoal || '-')}</span></div>
                    <div><span className="text-[var(--text-muted)]">用户类型：</span><span className="text-[var(--text-secondary)]">{String(intent.userType || '-')}</span></div>
                    <div><span className="text-[var(--text-muted)]">产品形态：</span><span className="text-[var(--text-secondary)]">{String(intent.productShape || '-')}</span></div>
                    <div><span className="text-[var(--text-muted)]">生命周期：</span><span className="text-[var(--text-secondary)]">{String(intent.lifecycle || '-')}</span></div>
                    <div><span className="text-[var(--text-muted)]">前端：</span><span className="text-[var(--text-secondary)]">{String(intent.techStack.frontend || '-')}</span></div>
                    <div><span className="text-[var(--text-muted)]">后端：</span><span className="text-[var(--text-secondary)]">{String(intent.techStack.backend || '-')}</span></div>
                    <div><span className="text-[var(--text-muted)]">数据库：</span><span className="text-[var(--text-secondary)]">{String(intent.techStack.db || '-')}</span></div>
                    <div><span className="text-[var(--text-muted)]">基础设施：</span><span className="text-[var(--text-secondary)]">{intent.techStack.infra.join('、') || '-'}</span></div>
                  </div>
                </div>
                {decompose && Array.isArray(decompose.tasks) && decompose.tasks.length > 0 && (
                  <div className="glass-card p-4">
                    <h3 className="mb-2 text-xs font-semibold text-amber-400">任务拆解</h3>
                    <div className="space-y-1 text-xs">
                      {decompose.tasks.map((task, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className="text-[var(--text-muted)] shrink-0">P{task.phase}</span>
                          <span className="text-[var(--text-tertiary)] font-mono">{task.file}</span>
                          <span className="text-[var(--text-muted)]">—</span>
                          <span className="text-[var(--text-secondary)]">{task.responsibility}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {!result && !loading && !error && (
          <div className="mt-16 text-center text-[var(--text-muted)]">
            <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-4 text-violet-300">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <p>输入需求，生成 AI 可消费的项目上下文</p>
            <p className="text-sm mt-1">3 步流程：理解需求 → 任务拆解 → 编译输出</p>
          </div>
        )}
      </div>
    </div>
    </ErrorBoundary>
  );
}
