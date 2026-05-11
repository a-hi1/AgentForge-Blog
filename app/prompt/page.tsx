'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { savePrompt } from '@/lib/prompt/history';
import { compilePromptPack, CompiledPack } from '@/lib/prompt-orchestrator/promptCompiler';
import { IntentResult, ArchitectureResult, DecomposeResult } from '@/lib/prompt-orchestrator/reasoner';
import { evaluatePromptQuality, QualityScore } from '@/lib/prompt/scorer';

const CHAIN = [
  { key: 'intent', label: '意图识别' },
  { key: 'architecture', label: '架构决策' },
  { key: 'decompose', label: '任务拆解' },
  { key: 'compile', label: 'Prompt 编译' },
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
  const [pack, setPack] = useState<CompiledPack | null>(null);
  const [saved, setSaved] = useState(false);
  const [intent, setIntent] = useState<IntentResult | null>(null);
  const [architecture, setArchitecture] = useState<ArchitectureResult | null>(null);
  const [decompose, setDecompose] = useState<DecomposeResult | null>(null);
  const [quality, setQuality] = useState<QualityScore | null>(null);
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
    setPack(null);
    setSaved(false);
    setIntent(null);
    setArchitecture(null);
    setDecompose(null);
    setQuality(null);

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
          try {
            const data = JSON.parse(line.slice(6));

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
                  if (data.step === 'intent') setIntent(data.result as IntentResult);
                  if (data.step === 'architecture') setArchitecture(data.result as ArchitectureResult);
                  if (data.step === 'decompose') setDecompose(data.result as DecomposeResult);
                }
              }
            }

            if (data.type === 'progress' && data.step === 'intent' && data.status === 'done' && data.result) {
              setIntent(data.result as IntentResult);
            }

            if (data.type === 'progress' && data.step === 'architecture' && data.status === 'done' && data.result) {
              setArchitecture(data.result as ArchitectureResult);
            }

            if (data.type === 'done') {
              setResult(data.prompt);
              setCurrentStep(-1);

              const intentData = data.intent || (CHAIN[0] && completedSteps.has('intent') ? intent : null);
              const archData = data.architecture || architecture;
              const decomposeData = data.decompose || null;

              if (intentData) setIntent(intentData);
              if (archData) setArchitecture(archData);
              if (decomposeData) setDecompose(decomposeData);

              if (intentData && archData) {
                const compiled = compilePromptPack(
                  intentData,
                  archData,
                  decomposeData || { tasks: [], phases: [] },
                  data.prompt
                );
                setPack(compiled);

                const q = evaluatePromptQuality(data.prompt, compiled);
                setQuality(q);

                try {
                  const savedRecord = await savePrompt({
                    title: intentData.businessGoal.slice(0, 50) || input.trim().slice(0, 30),
                    category: 'deep-reasoning',
                    phase: 'idea',
                    input: input.trim(),
                    fullPrompt: data.prompt,
                    qualityScore: q.overall,
                    tags: [archData.frontend, archData.backend, archData.db].filter(Boolean),
                  });
                  if (savedRecord?.id) setSaved(true);
                } catch {
                  /* auto-save is best-effort */
                }
              }
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !loading && input.trim()) {
      e.preventDefault();
      handleGenerate();
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
  };

  const getStepState = (stepKey: string) => {
    if (fallbackSteps.has(stepKey)) return 'fallback';
    if (completedSteps.has(stepKey)) return 'done';
    if (CHAIN[currentStep]?.key === stepKey) return 'active';
    return 'pending';
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Prompt Studio</h1>
            <p className="mt-1 text-sm text-slate-400">深度推理编译引擎 — 生成可直接复制到 Cursor 执行的 Agent 指令</p>
          </div>
          <button
            onClick={() => router.push('/prompt/history')}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 transition"
          >
            历史记录
          </button>
        </div>

        <div className="mb-6">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="描述你的开发需求..."
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-5 py-4 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none resize-none"
            rows={4}
          />
          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={handleGenerate}
              disabled={loading || !input.trim()}
              className="rounded-lg bg-cyan-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-cyan-500 disabled:opacity-40 transition"
            >
              {loading ? '编译中...' : '深度编译'}
            </button>
            {loading && (
              <button
                onClick={() => abortRef.current?.abort()}
                className="rounded-lg border border-red-600 px-4 py-2.5 text-sm text-red-400 hover:bg-red-950 transition"
              >
                取消
              </button>
            )}
            {result && (
              <button
                onClick={() => {
                  setResult('');
                  setPack(null);
                  setSaved(false);
                  setQuality(null);
                  setIntent(null);
                  setArchitecture(null);
                  setDecompose(null);
                  setFallbackSteps(new Set());
                }}
                className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm text-slate-400 hover:bg-slate-800 transition"
              >
                重新生成
              </button>
            )}
            <div className="ml-auto flex items-center gap-2">
              {['做Habit App', 'Todo应用', 'AI图库'].map((ex) => (
                <button
                  key={ex}
                  onClick={() => setInput(`帮我${ex}`)}
                  className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-400 hover:bg-slate-800 transition"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading && (
          <div className="mb-6 flex items-center gap-3">
            {CHAIN.map((step, i) => {
              const state = getStepState(step.key);
              return (
                <div key={step.key} className="flex items-center gap-2">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
                    state === 'done' ? 'bg-emerald-600 text-white' :
                    state === 'fallback' ? 'bg-amber-600 text-white' :
                    state === 'active' ? 'bg-cyan-600 text-white animate-pulse' :
                    'bg-slate-700 text-slate-400'
                  }`}>
                    {state === 'done' ? '✓' : state === 'fallback' ? '!' : i + 1}
                  </div>
                  <span className={`text-sm ${state === 'active' ? 'text-cyan-400' : state === 'done' ? 'text-emerald-400' : state === 'fallback' ? 'text-amber-400' : 'text-slate-500'}`}>
                    {step.label}
                    {state === 'fallback' && <span className="text-[10px] ml-1">(降级)</span>}
                  </span>
                  {i < CHAIN.length - 1 && (
                    <div className={`w-8 h-px ${state === 'done' || state === 'fallback' ? 'bg-emerald-600' : 'bg-slate-700'}`} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {quality && (
          <div className="mb-6 rounded-xl border border-slate-700 bg-slate-900/80 p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Prompt Quality</h3>
              <span className={`text-2xl font-bold ${
                quality.overall >= 80 ? 'text-emerald-400' :
                quality.overall >= 60 ? 'text-amber-400' : 'text-red-400'
              }`}>
                {quality.overall}
              </span>
            </div>
            <div className="grid grid-cols-5 gap-3">
              {([
                { key: 'executionPrecision', label: '执行精度' },
                { key: 'boundaryStrictness', label: '约束强度' },
                { key: 'stepControl', label: '步骤控制' },
                { key: 'copyToAgent', label: 'Cursor适配' },
                { key: 'repairability', label: '修复能力' },
              ] as const).map(dim => {
                const val = quality.dimensions[dim.key];
                return (
                  <div key={dim.key} className="text-center">
                    <div className={`text-lg font-bold ${
                      val >= 80 ? 'text-emerald-400' : val >= 60 ? 'text-amber-400' : 'text-red-400'
                    }`}>{val}</div>
                    <div className="text-[11px] text-slate-500">{dim.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {fallbackSteps.size > 0 && result && (
          <div className="mb-6 rounded-xl border border-amber-800 bg-amber-950/50 p-4">
            <p className="text-sm text-amber-300">
              ⚠ 部分推理阶段使用了降级方案（{Array.from(fallbackSteps).map(s => CHAIN.find(c => c.key === s)?.label || s).join('、')}）。
              生成结果仍可用，但精度可能降低。点击「重新生成」可重试。
            </p>
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-xl border border-red-800 bg-red-950 p-4">
            <p className="text-sm text-red-300">{error}</p>
            <button
              onClick={handleGenerate}
              className="mt-2 rounded-lg bg-red-800 px-4 py-1.5 text-xs text-white hover:bg-red-700 transition"
            >
              重试
            </button>
          </div>
        )}

        {result && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-white">编译结果</h2>
              <div className="flex items-center gap-2">
                {saved && (
                  <span className="rounded-full bg-emerald-900/50 px-2.5 py-0.5 text-[11px] text-emerald-400">
                    已保存
                  </span>
                )}
                <button
                  onClick={handleCopy}
                  className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 transition"
                >
                  复制
                </button>
              </div>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-900 p-5 max-h-[500px] overflow-y-auto">
              <pre className="whitespace-pre-wrap font-mono text-sm text-slate-200 leading-relaxed">{result}</pre>
            </div>
          </div>
        )}

        {result && (intent || architecture) && (
          <div className="mb-6">
            <button
              onClick={() => setShowReasoning(!showReasoning)}
              className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition"
            >
              <span>{showReasoning ? '▾' : '▸'}</span>
              推理过程详情
            </button>
            {showReasoning && (
              <div className="mt-3 space-y-3">
                {intent && (
                  <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
                    <h3 className="mb-2 text-xs font-semibold text-cyan-400">意图识别</h3>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><span className="text-slate-500">业务目标：</span><span className="text-slate-300">{intent.businessGoal}</span></div>
                      <div><span className="text-slate-500">用户类型：</span><span className="text-slate-300">{intent.userType}</span></div>
                      <div><span className="text-slate-500">产品形态：</span><span className="text-slate-300">{intent.productShape}</span></div>
                      <div><span className="text-slate-500">生命周期：</span><span className="text-slate-300">{intent.lifecycle}</span></div>
                    </div>
                  </div>
                )}
                {architecture && (
                  <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
                    <h3 className="mb-2 text-xs font-semibold text-emerald-400">架构决策</h3>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div><span className="text-slate-500">前端：</span><span className="text-slate-300">{architecture.frontend}</span></div>
                      <div><span className="text-slate-500">后端：</span><span className="text-slate-300">{architecture.backend}</span></div>
                      <div><span className="text-slate-500">数据库：</span><span className="text-slate-300">{architecture.db}</span></div>
                    </div>
                    {architecture.rejectedAlternatives.length > 0 && (
                      <div className="mt-2 text-xs">
                        <span className="text-slate-500">被拒绝方案：</span>
                        {architecture.rejectedAlternatives.map((alt, i) => (
                          <div key={i} className="ml-2 text-slate-400">• {alt}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {decompose && decompose.tasks.length > 0 && (
                  <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
                    <h3 className="mb-2 text-xs font-semibold text-amber-400">任务拆解</h3>
                    <div className="space-y-1 text-xs">
                      {decompose.tasks.map((task, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className="text-slate-500 shrink-0">Phase {task.phase}</span>
                          <span className="text-slate-400 font-mono">{task.file}</span>
                          <span className="text-slate-500">—</span>
                          <span className="text-slate-300">{task.responsibility}</span>
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
          <div className="mt-16 text-center text-slate-600">
            <div className="text-4xl mb-3">⚡</div>
            <p>输入需求，启动深度推理编译</p>
            <p className="text-sm mt-1">4 步推理链：意图识别 → 架构决策 → 任务拆解 → Prompt 编译</p>
          </div>
        )}
      </div>
    </div>
  );
}
