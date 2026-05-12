'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
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
  const [currentAnswers, setCurrentAnswers] = useState<
    Record<string, any>
  >({});
  const [phaseHistory, setPhaseHistory] = useState<
    Array<{ phase: DiscoveryPhase; data: any }>
  >([]);

  const abortRef = useRef<AbortController | null>(null);

  const startDiscovery = useCallback(async () => {
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

      if (!response.ok || !response.body) {
        throw new Error('请求失败');
      }

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
          if (!payload) continue;

          try {
            const data = JSON.parse(payload);

            if (data.type === 'phase_start') {
              // 阶段开始
            } else if (data.type === 'phase_analysis') {
              // 分析中，记录数据
              setPhaseHistory((prev) => [
                ...prev,
                { phase: data.phase, data: data.data },
              ]);
            } else if (data.type === 'phase_complete') {
              // 阶段完成
            } else if (data.type === 'complete') {
              setSession(data.session);
            } else if (data.type === 'error') {
              throw new Error(data.error);
            }
          } catch (parseError) {
            console.error('Parse error:', parseError);
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err.message || '发生错误');
      }
    } finally {
      setLoading(false);
    }
  }, [idea]);

  const submitAnswers = useCallback(async () => {
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

      if (!response.ok || !response.body) {
        throw new Error('请求失败');
      }

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
          if (!payload) continue;

          try {
            const data = JSON.parse(payload);

            if (data.type === 'phase_analysis') {
              setPhaseHistory((prev) => [
                ...prev,
                { phase: data.phase, data: data.data },
              ]);
            } else if (data.type === 'complete') {
              setSession(data.session);
              setCurrentAnswers({});
            } else if (data.type === 'error') {
              throw new Error(data.error);
            }
          } catch (parseError) {
            console.error('Parse error:', parseError);
          }
        }
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || '发生错误');
      }
    } finally {
      setLoading(false);
    }
  }, [session, currentAnswers]);

  const reset = useCallback(() => {
    setIdea('');
    setSession(null);
    setLoading(false);
    setError('');
    setCurrentAnswers({});
    setPhaseHistory([]);
    abortRef.current?.abort();
  }, []);

  // 从历史记录中获取阶段数据
  const getPhaseData = (phase: DiscoveryPhase) => {
    const entry = phaseHistory.find((h) => h.phase === phase);
    return entry?.data;
  };

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
    <div className="min-h-screen bg-slate-950 py-8">
      <div className="mx-auto max-w-4xl px-6">
        {/* 头部 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-white">方向探索</h1>
              <p className="mt-1 text-sm text-slate-400">
                把模糊的想法收缩成可验证的产品方向
              </p>
            </div>
            {session && (
              <button
                onClick={reset}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 transition"
              >
                重新开始
              </button>
            )}
          </div>

          {/* 初始输入 */}
          {!session && (
            <div className="space-y-4">
              <textarea
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !loading) {
                    startDiscovery();
                  }
                }}
                placeholder="你现在最想解决什么问题？描述你的想法..."
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-5 py-4 text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none resize-none"
                rows={5}
              />
              <button
                onClick={startDiscovery}
                disabled={loading || !idea.trim()}
                className="rounded-lg bg-purple-600 px-6 py-3 text-sm font-medium text-white hover:bg-purple-500 disabled:opacity-40 transition"
              >
                {loading ? '探索中...' : '开始探索'}
              </button>
            </div>
          )}
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-800 bg-red-950 p-4">
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {/* 阶段卡片 */}
        {session && (
          <div className="space-y-4">
            {/* 进度指示器 */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {allPhases.map((phase) => {
                const status = getPhaseStatus(phase);
                return (
                  <React.Fragment key={phase}>
                    <div
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${
                        status === 'active'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50'
                          : status === 'completed'
                          ? 'bg-green-500/20 text-green-300 border border-green-500/50'
                          : 'bg-slate-800 text-slate-500 border border-slate-700'
                      }`}
                    >
                      {status === 'completed' && '✓'}
                      {getPhaseName(phase)}
                    </div>
                  </React.Fragment>
                );
              })}
            </div>

            {/* 已完成的阶段 */}
            {phaseHistory.map((entry, index) => (
              <PhaseCard
                key={index}
                phase={entry.phase}
                isActive={false}
                isCompleted={true}
                analysis={entry.data.analysis}
                data={entry.data}
              />
            ))}

            {/* 当前阶段的问题 */}
            {session.unresolvedQuestions.length > 0 && (
              <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-6">
                <h3 className="text-lg font-semibold text-purple-300 mb-4">
                  请回答以下问题
                </h3>
                <div className="space-y-6">
                  {session.unresolvedQuestions.map((question) => (
                    <QuestionRenderer
                      key={question.id}
                      question={question}
                      answer={currentAnswers[question.id]}
                      onChange={(value) =>
                        setCurrentAnswers((prev) => ({
                          ...prev,
                          [question.id]: value,
                        }))
                      }
                    />
                  ))}
                </div>
                <button
                  onClick={submitAnswers}
                  disabled={loading}
                  className="mt-6 rounded-lg bg-purple-600 px-6 py-3 text-sm font-medium text-white hover:bg-purple-500 disabled:opacity-40 transition"
                >
                  {loading ? '处理中...' : '继续'}
                </button>
              </div>
            )}

            {/* 完成状态 */}
            {session.currentPhase === 'complete' &&
              session.collectedFacts.finalReport && (
                <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-6 text-center">
                  <div className="text-4xl mb-4">🎉</div>
                  <h3 className="text-xl font-semibold text-green-300 mb-2">
                    探索完成！
                  </h3>
                  <p className="text-slate-300">
                    {session.collectedFacts.finalReport.summary}
                  </p>
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  );
}
