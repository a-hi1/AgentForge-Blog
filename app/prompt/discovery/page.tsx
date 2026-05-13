'use client';

import React, { useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  DiscoverySession,
  DiscoveryPhase,
} from '@/lib/idea-discovery';
import { getPhaseName } from '@/lib/idea-discovery/stateMachine';
import { PhaseCard } from '@/components/idea-discovery/PhaseCard';
import { QuestionRenderer } from '@/components/idea-discovery/QuestionRenderer';

export default function IdeaDiscoveryPage() {
  const [idea, setIdea] = useState('');
  const [session, setSession] = useState<DiscoverySession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentAnswers, setCurrentAnswers] = useState<Record<string, unknown>>({});
  const [phaseHistory, setPhaseHistory] = useState<
    Array<{ phase: DiscoveryPhase; data: Record<string, unknown>; analysis?: string }>
  >([]);

  const abortRef = useRef<AbortController | null>(null);

  const processSSEStream = useCallback(async (response: Response) => {
    if (!response.body) throw new Error('No response body');
    const reader = response.body.getReader();
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
        if (!payload || !payload.startsWith('{')) continue;

        try {
          const data = JSON.parse(payload);

          if (data.type === 'phase_analysis') {
            setPhaseHistory((prev) => [
              ...prev,
              { phase: data.phase, data: data.data || {}, analysis: data.data?.analysis },
            ]);
          } else if (data.type === 'phase_fallback') {
            setError('部分阶段使用降级方案，结果可能不够精确。');
          } else if (data.type === 'complete') {
            setSession(data.session);
          } else if (data.type === 'error') {
            throw new Error(data.error || '未知错误');
          }
        } catch { /* ignore parse errors */ }
      }
    }
  }, []);

  const handleStartDiscovery = useCallback(async () => {
    if (!idea.trim()) return;

    setLoading(true);
    setError('');
    setSession(null);
    setCurrentAnswers({});
    setPhaseHistory([]);

    abortRef.current = new AbortController();

    try {
      const response = await fetch('/api/idea-discovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea: idea.trim() }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) throw new Error('请求失败，请重试');

      await processSSEStream(response);
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err.message || '发生错误');
      }
    } finally {
      setLoading(false);
    }
  }, [idea, processSSEStream]);

  const handleSubmitAnswers = useCallback(async () => {
    if (!session) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/idea-discovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          answers: currentAnswers,
        }),
      });

      if (!response.ok) throw new Error('请求失败，请重试');

      await processSSEStream(response);
      setCurrentAnswers({});
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err.message || '发生错误');
      }
    } finally {
      setLoading(false);
    }
  }, [session, currentAnswers, processSSEStream]);

  const reset = useCallback(() => {
    setIdea('');
    setSession(null);
    setLoading(false);
    setError('');
    setCurrentAnswers({});
    setPhaseHistory([]);
    abortRef.current?.abort();
  }, []);

  const allPhases: DiscoveryPhase[] = [
    'idea_deconstruction',
    'reality_assessment',
    'differentiation_analysis',
    'mvp_shrink',
    'validation_path',
    'final_confirmation',
  ];

  const getPhaseStatus = (phase: DiscoveryPhase) => {
    if (!session) return 'pending';
    const phaseIndex = allPhases.indexOf(phase);
    const currentPhaseIndex = allPhases.indexOf(session.currentPhase);

    if (phaseIndex < currentPhaseIndex) return 'completed';
    if (phaseIndex === currentPhaseIndex) return 'active';
    return 'pending';
  };

  return (
    <div className="min-h-screen bg-zinc-950 py-8">
      <div className="mx-auto max-w-4xl px-6">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-white">方向探索</h1>
              <p className="mt-1 text-sm text-zinc-400">
                AI 联合创始人 — 把模糊想法收缩成可验证的产品方向
              </p>
            </div>
            <div className="flex items-center gap-2">
              {loading && (
                <button
                  onClick={() => abortRef.current?.abort()}
                  className="rounded-lg border border-red-800 px-4 py-2 text-sm text-red-400 hover:bg-red-950 transition"
                >
                  取消
                </button>
              )}
              {session && (
                <button
                  onClick={reset}
                  className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition"
                >
                  重新开始
                </button>
              )}
            </div>
          </div>

          {!session && (
            <div className="space-y-4">
              <textarea
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                placeholder="你现在最想解决什么问题？描述你的想法..."
                className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-5 py-4 text-white placeholder-zinc-500 focus:border-violet-500 focus:outline-none resize-none"
                rows={4}
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleStartDiscovery}
                  disabled={loading || !idea.trim()}
                  className="rounded-lg bg-violet-600 px-6 py-3 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-40 transition"
                >
                  {loading ? '探索中...' : '开始探索'}
                </button>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-800 bg-red-950 p-4">
            <p className="text-sm text-red-300">{error}</p>
            <button onClick={reset} className="mt-2 rounded-lg bg-red-800 px-4 py-1.5 text-xs text-white hover:bg-red-700 transition">重试</button>
          </div>
        )}

        {session && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {allPhases.map((phase) => {
                const status = getPhaseStatus(phase);
                return (
                  <div key={phase} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${
                    status === 'active' ? 'bg-violet-500/20 text-violet-300 border border-violet-500/50' :
                    status === 'completed' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50' :
                    'bg-zinc-800 text-zinc-500 border border-zinc-700'
                  }`}>
                    {status === 'completed' && '✓'}
                    {getPhaseName(phase)}
                  </div>
                );
              })}
            </div>

            {phaseHistory.map((entry, index) => (
              <PhaseCard key={index} phase={entry.phase} isActive={false} isCompleted={true} analysis={entry.analysis} data={entry.data} />
            ))}

            {session.unresolvedQuestions.length > 0 && (
              <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-6">
                <h3 className="text-lg font-semibold text-violet-300 mb-4">请回答以下问题</h3>
                <div className="space-y-6">
                  {session.unresolvedQuestions.map((question) => (
                    <QuestionRenderer key={question.id} question={question}
                      answer={(currentAnswers as Record<string, unknown>)[question.id]}
                      onChange={(value) => setCurrentAnswers((prev) => ({ ...prev, [question.id]: value }))}
                    />
                  ))}
                </div>
                <button onClick={handleSubmitAnswers} disabled={loading}
                  className="mt-6 rounded-lg bg-violet-600 px-6 py-3 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-40 transition">
                  {loading ? '处理中...' : '继续'}
                </button>
              </div>
            )}

            {session.currentPhase === 'complete' && session.collectedFacts.finalReport && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-center">
                <div className="text-4xl mb-4">🎉</div>
                <h3 className="text-xl font-semibold text-emerald-300 mb-2">探索完成！</h3>
                <p className="text-zinc-300">{session.collectedFacts.finalReport.summary}</p>
                <Link href="/prompt" className="mt-4 inline-block rounded-lg bg-violet-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-violet-500 transition">
                  确认方向，开始开发
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
