'use client';

import React, { useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  DiscoverySession,
  DiscoveryPhase,
  DirectionReport,
} from '@/lib/idea-discovery';
import { getPhaseName } from '@/lib/idea-discovery/stateMachine';
import { PhaseCard } from '@/components/idea-discovery/PhaseCard';
import { QuestionRenderer } from '@/components/idea-discovery/QuestionRenderer';
import { Sidebar } from '@/components/idea-discovery/Sidebar';
import {
  DiscoveryRecord,
  saveDiscoveryToHistory,
  clearAllDiscoveryHistory,
} from '@/lib/idea-discovery/storage';

export default function IdeaDiscoveryPage() {
  const [idea, setIdea] = useState('');
  const [session, setSession] = useState<DiscoverySession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentAnswers, setCurrentAnswers] = useState<Record<string, unknown>>({});
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [finalReport, setFinalReport] = useState<DirectionReport | undefined>();

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

          if (data.type === 'session_update') {
            setSession(data.session);
            if (data.report) {
              setFinalReport(data.report);
            }
          } else if (data.type === 'complete') {
            setSession(data.session);
            if (data.report) {
              setFinalReport(data.report);
            }
          } else if (data.type === 'error') {
            throw new Error(data.error || '未知错误');
          }
        } catch (parseError) {
          console.error('SSE parse error:', parseError);
        }
      }
    }
  }, []);

  const handleStartDiscovery = useCallback(async () => {
    if (!idea.trim()) return;

    setLoading(true);
    setError('');
    setSession(null);
    setCurrentAnswers({});
    setFinalReport(undefined);

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

  const loadRecord = useCallback((record: DiscoveryRecord) => {
    setSession(record.session);
    setFinalReport(record.report);
    setIdea(record.originalIdea);
    setError('');
  }, []);

  const reset = useCallback(() => {
    setIdea('');
    setSession(null);
    setLoading(false);
    setError('');
    setCurrentAnswers({});
    setFinalReport(undefined);
    abortRef.current?.abort();
  }, []);

  const handleClearHistory = () => {
    if (confirm('确定要清除所有历史记录并重置吗？')) {
      clearAllDiscoveryHistory();
      reset();
    }
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

  const renderPhaseContent = () => {
    if (!session) return null;

    const elements: React.ReactNode[] = [];

    for (const phase of allPhases) {
      const status = getPhaseStatus(phase);
      const phaseData = session.collectedFacts[phase as keyof typeof session.collectedFacts];

      if (phaseData && status !== 'pending') {
        elements.push(
          <PhaseCard
            key={phase}
            phase={phase}
            isActive={status === 'active'}
            isCompleted={status === 'completed'}
            analysis={(phaseData as any)?.analysis}
            data={phaseData as Record<string, unknown>}
          />
        );
      }
    }

    return elements;
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex">
      <Sidebar
        currentSessionId={session?.id}
        onSelectRecord={loadRecord}
        onNewDiscovery={reset}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-white">方向探索</h1>
                <p className="mt-1 text-sm text-zinc-400">
                  AI 联合创始人 — 把模糊想法收缩成可验证的产品方向
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleClearHistory}
                  className="rounded-lg border border-red-800/50 px-3 py-2 text-xs text-red-400 hover:bg-red-950/50 transition"
                >
                  清除历史
                </button>
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
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !loading) {
                      handleStartDiscovery();
                    }
                  }}
                  placeholder="你现在最想解决什么问题？描述你的想法..."
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-5 py-4 text-white placeholder-zinc-500 focus:border-violet-500 focus:outline-none resize-none"
                  rows={4}
                />
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleStartDiscovery}
                    disabled={loading || !idea.trim()}
                    className="rounded-lg bg-violet-600 px-6 py-3 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-40 transition"
                  >
                    {loading ? '探索中...' : '开始探索'}
                  </button>
                  {['想做习惯追踪 App', '想做笔记工具', '想做 AI 工具站'].map((ex) => (
                    <button
                      key={ex}
                      onClick={() => setIdea(ex)}
                      className="rounded-full border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 transition"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="mb-6 rounded-xl border border-red-800 bg-red-950 p-4">
              <p className="text-sm text-red-300">{error}</p>
              <button
                onClick={reset}
                className="mt-2 rounded-lg bg-red-800 px-4 py-1.5 text-xs text-white hover:bg-red-700 transition"
              >
                重试
              </button>
            </div>
          )}

          {session && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {allPhases.map((phase) => {
                  const status = getPhaseStatus(phase);
                  return (
                    <div
                      key={phase}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${
                        status === 'active'
                          ? 'bg-violet-500/20 text-violet-300 border border-violet-500/50'
                          : status === 'completed'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                          : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                      }`}
                    >
                      {status === 'completed' && '✓'}
                      {getPhaseName(phase)}
                    </div>
                  );
                })}
              </div>

              <div className="space-y-4">
                {renderPhaseContent()}
              </div>

              {session.unresolvedQuestions.length > 0 && (
                <div className="rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-500/10 to-violet-500/5 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-semibold text-violet-300">
                        ✨ 请回答以下问题
                      </h3>
                      <p className="text-sm text-violet-400/70 mt-1">
                        {session.unresolvedQuestions.length > 1
                          ? `还剩 ${session.unresolvedQuestions.length} 个问题`
                          : '最后一个问题了！'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    {session.unresolvedQuestions.map((question, idx) => (
                      <div key={question.id}>
                        <QuestionRenderer
                          question={question}
                          answer={currentAnswers[question.id]}
                          onChange={(value) =>
                            setCurrentAnswers((prev) => ({
                              ...prev,
                              [question.id]: value,
                            }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-8 pt-6 border-t border-violet-500/20">
                    <button
                      onClick={handleSubmitAnswers}
                      disabled={loading}
                      className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-8 py-3.5 text-sm font-semibold text-white hover:from-violet-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 hover:scale-[1.02] active:scale-[0.98]"
                    >
                      {loading ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          <span>处理中...</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <span>继续探索</span>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {session.currentPhase === 'complete' && finalReport && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6">
                  <div className="text-center mb-6">
                    <div className="text-4xl mb-4">🎉</div>
                    <h3 className="text-xl font-semibold text-emerald-300 mb-2">
                      探索完成！
                    </h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="rounded-lg bg-zinc-800/50 p-4">
                      <h4 className="text-sm font-medium text-zinc-300 mb-2">核心判断</h4>
                      <p className={`text-lg font-semibold ${
                        finalReport.worthDoing.includes('值得') ? 'text-emerald-400' :
                        finalReport.worthDoing.includes('验证') ? 'text-amber-400' :
                        'text-red-400'
                      }`}>
                        {finalReport.worthDoing}
                      </p>
                    </div>
                    
                    <div className="rounded-lg bg-zinc-800/50 p-4">
                      <h4 className="text-sm font-medium text-zinc-300 mb-2">关键洞察</h4>
                      <p className="text-zinc-400">{finalReport.summary}</p>
                    </div>
                    
                    <div className="rounded-lg bg-zinc-800/50 p-4">
                      <h4 className="text-sm font-medium text-zinc-300 mb-2">从这里开始</h4>
                      <p className="text-zinc-400">{finalReport.whereToStart}</p>
                    </div>
                    
                    <div className="rounded-lg bg-zinc-800/50 p-4">
                      <h4 className="text-sm font-medium text-zinc-300 mb-2">风险提示</h4>
                      <p className="text-zinc-400">{finalReport.risks}</p>
                    </div>

                    <div className="rounded-lg bg-violet-500/10 border border-violet-500/30 p-4">
                      <h4 className="text-sm font-medium text-violet-300 mb-3">📋 项目描述（可直接复制到AI导出）</h4>
                      <textarea
                        value={`${session.collectedFacts.originalIdea}\n\n项目方向：${session.collectedFacts.selectedDirection?.name || '简洁实用版'}\n${session.collectedFacts.selectedDirection?.whyFits || ''}\n\n核心功能：${session.collectedFacts.mvp?.mustHave?.join('、') || ''}\n\n从这里开始：${finalReport.whereToStart}\n\n验证方式：${finalReport.minimalValidation || session.collectedFacts.mvp?.fastestValidation || ''}`}
                        readOnly
                        className="w-full h-40 bg-zinc-900/50 border border-zinc-700 rounded-lg p-3 text-zinc-300 text-sm resize-none"
                      />
                    </div>
                  </div>

                  <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                      onClick={() => {
                        const text = `${session.collectedFacts.originalIdea}\n\n项目方向：${session.collectedFacts.selectedDirection?.name || '简洁实用版'}\n${session.collectedFacts.selectedDirection?.whyFits || ''}\n\n核心功能：${session.collectedFacts.mvp?.mustHave?.join('、') || ''}\n\n从这里开始：${finalReport.whereToStart}\n\n验证方式：${finalReport.minimalValidation || session.collectedFacts.mvp?.fastestValidation || ''}`;
                        navigator.clipboard.writeText(text);
                      }}
                      className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 transition"
                    >
                      复制项目描述
                    </button>
                    <Link
                      href="/prompt"
                      className="inline-block rounded-lg bg-violet-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-violet-500 transition"
                    >
                      去AI导出，开始开发
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
