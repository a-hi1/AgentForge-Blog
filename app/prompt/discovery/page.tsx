'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  DiscoverySession,
  DiscoveryPhase,
  DirectionReport,
} from '@/lib/idea-discovery';
import { getPhaseName } from '@/lib/idea-discovery/stateMachine';
import { PhaseCard } from '@/components/idea-discovery/PhaseCard';
import { PhaseTimeline } from '@/components/idea-discovery/PhaseTimeline';
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
  const [warnings, setWarnings] = useState<string[]>([]);

  const abortRef = useRef<AbortController | null>(null);

  // 自动保存探索记录到 localStorage
  useEffect(() => {
    if (session) {
      saveDiscoveryToHistory(session, finalReport);
    }
  }, [session, finalReport]);

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
          } else if (data.type === 'phase_warning') {
            setWarnings(prev => [...prev, data.message]);
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
    setWarnings([]);

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
          session: session,
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
    setWarnings([]);
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

  // phase snake_case -> collectedFacts camelCase 映射
  const phaseToFactKey: Record<string, string> = {
    idea_deconstruction: 'ideaDeconstruction',
    reality_assessment: 'marketReality',
    differentiation_analysis: 'differentiation',
    mvp_shrink: 'mvp',
    validation_path: 'possibleDirections',
    final_confirmation: 'finalReport',
  };

  // 是否处于探索中状态（有session且未完成）
  const isExploring = session && session.currentPhase !== 'complete';

  return (
    <div className="relative z-10 min-h-[calc(100dvh-72px)] flex bg-transparent">
      <Sidebar
        currentSessionId={session?.id}
        onSelectRecord={loadRecord}
        onNewDiscovery={reset}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <div className="flex-1 overflow-hidden flex flex-col">
        {/* 顶部标题栏 */}
        <div className="shrink-0 border-b border-[var(--border)] bg-[rgba(5,5,7,0.5)] backdrop-blur-md px-5 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="badge badge-violet mb-2">Idea Discovery</div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">方向探索</h1>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">AI 联合创始人 · 把模糊想法收缩成可验证的产品方向</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleClearHistory}
                className="btn-ghost text-red-300 hover:bg-red-500/10"
              >
                清除历史
              </button>
              {loading && (
                <button
                  onClick={() => abortRef.current?.abort()}
                  className="btn-ghost text-red-300 hover:bg-red-500/10"
                >
                  取消
                </button>
              )}
              {session && (
                <button
                  onClick={reset}
                  className="btn-secondary"
                >
                  重新开始
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 主内容区 */}
        <div className="flex-1 overflow-hidden flex">
          {/* 无session时：居中显示输入区 */}
          {!session && (
            <div className="flex-1 flex items-center justify-center px-5 sm:px-6">
              <div className="w-full max-w-xl">
                <div className="text-center mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-violet-500/12 border border-violet-500/25 flex items-center justify-center mx-auto mb-5 text-violet-300">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v2m6.364.636l-1.414 1.414M21 12h-2M18.364 18.364l-1.414-1.414M12 21v-2M5.636 18.364l1.414-1.414M3 12h2M5.636 5.636L7.05 7.05" /></svg>
                  </div>
                  <span className="badge badge-violet mb-4">Start with a thought</span>
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">描述你的想法</h2>
                  <p className="text-sm text-[var(--text-secondary)]">AI 会引导你一步步把模糊想法变成可执行的方向</p>
                </div>

                {error && (
                  <div className="mb-4 rounded-xl border border-red-500/25 bg-red-500/10 p-4" role="alert">
                    <p className="text-sm text-red-300">{error}</p>
                    <button onClick={reset} className="mt-2 rounded-lg bg-red-800 px-4 py-1.5 text-xs text-white hover:bg-red-700 transition">重试</button>
                  </div>
                )}

                {warnings.length > 0 && (
                  <div className="mb-4 rounded-xl border border-amber-500/25 bg-amber-500/10 p-4" role="status">
                    {warnings.map((w, i) => <p key={i} className="text-xs text-amber-400/80">{w}</p>)}
                  </div>
                )}

                <textarea
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !loading) {
                      handleStartDiscovery();
                    }
                  }}
                  placeholder="你现在最想解决什么问题？描述你的想法..."
                  className="input-field min-h-[132px] resize-y"
                  rows={4}
                />
                <div className="flex items-center gap-2 flex-wrap mt-4">
                  <button
                    onClick={handleStartDiscovery}
                    disabled={loading || !idea.trim()}
                    className="btn-primary"
                  >
                    {loading ? '探索中...' : '开始探索'}
                  </button>
                  {['想做习惯追踪 App', '想做笔记工具', '想做 AI 工具站'].map((ex) => (
                    <button
                      key={ex}
                      onClick={() => setIdea(ex)}
                      className="px-2.5 py-1.5 rounded-lg border border-[var(--border)] text-xs text-[var(--text-tertiary)] hover:text-white hover:border-[var(--border-strong)] transition-colors cursor-pointer"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 有session时：双栏布局 */}
          {session && (
            <>
              {/* 左侧：垂直时间线 */}
              <div className="w-56 shrink-0 border-r border-[var(--border)] bg-[rgba(12,12,16,0.35)] p-4 overflow-y-auto hidden md:block">
                <PhaseTimeline
                  allPhases={allPhases}
                  getPhaseStatus={getPhaseStatus}
                  collectedFacts={session.collectedFacts}
                />
              </div>

              {/* 右侧：当前阶段内容 + 问题 */}
              <div className="flex-1 overflow-y-auto">
                <div className="max-w-2xl mx-auto px-5 sm:px-6 py-6 space-y-4">
                  {/* 移动端：水平进度条 */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:hidden">
                    {allPhases.map((phase) => {
                      const status = getPhaseStatus(phase);
                      return (
                        <div
                          key={phase}
                          className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs whitespace-nowrap ${
                            status === 'active'
                              ? 'bg-violet-500/20 text-violet-300 border border-violet-500/50'
                              : status === 'completed'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                              : 'bg-white/[0.04] text-[var(--text-muted)] border border-[var(--border)]'
                          }`}
                        >
                          {status === 'completed' && '✓'}
                          {getPhaseName(phase)}
                        </div>
                      );
                    })}
                  </div>

                  {/* 错误和警告 */}
                  {error && (
                    <div className="rounded-xl border border-red-800 bg-red-950 p-4">
                      <p className="text-sm text-red-300">{error}</p>
                      <button onClick={reset} className="btn-ghost mt-2 text-red-300">重试</button>
                    </div>
                  )}

                  {warnings.length > 0 && (
                    <div className="rounded-xl border border-amber-800/50 bg-amber-950/30 p-4">
                      {warnings.map((w, i) => <p key={i} className="text-xs text-amber-400/80">{w}</p>)}
                    </div>
                  )}

                  {/* 已完成阶段：compact模式 */}
                  {allPhases.map((phase) => {
                    const status = getPhaseStatus(phase);
                    if (status !== 'completed') return null;
                    const factKey = phaseToFactKey[phase];
                    const phaseData = factKey
                      ? (session.collectedFacts as Record<string, unknown>)[factKey]
                      : undefined;
                    if (!phaseData) return null;

                    return (
                      <PhaseCard
                        key={phase}
                        phase={phase}
                        isActive={false}
                        isCompleted={true}
                        analysis={(phaseData as any)?.analysis}
                        collectedFacts={session.collectedFacts}
                        mode="compact"
                      />
                    );
                  })}

                  {/* 当前阶段：expanded模式 */}
                  {(() => {
                    const activePhase = allPhases.find(p => getPhaseStatus(p) === 'active');
                    if (!activePhase) return null;
                    const factKey = phaseToFactKey[activePhase];
                    const phaseData = factKey
                      ? (session.collectedFacts as Record<string, unknown>)[factKey]
                      : undefined;

                    return (
                      <PhaseCard
                        key={activePhase}
                        phase={activePhase}
                        isActive={true}
                        isCompleted={false}
                        analysis={(phaseData as any)?.analysis}
                        collectedFacts={session.collectedFacts}
                        mode="expanded"
                      />
                    );
                  })()}

                  {/* 问题区：紧跟当前阶段 */}
                  {session.unresolvedQuestions.length > 0 && (
                    <div className="rounded-xl border border-violet-500/30 bg-gradient-to-br from-violet-500/10 to-violet-500/5 p-5">
                      <h3 className="text-lg font-semibold text-violet-300 mb-4">
                        请回答以下问题
                      </h3>

                      <div className="space-y-5">
                        {session.unresolvedQuestions.map((question) => (
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

                      <div className="mt-6 pt-4 border-t border-violet-500/20">
                        <button
                          onClick={handleSubmitAnswers}
                          disabled={loading}
                          className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:from-violet-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-violet-500/20"
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

                  {/* 最终报告 */}
                  {session.currentPhase === 'complete' && finalReport && (
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6">
                      <div className="text-center mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/12 border border-emerald-500/25 flex items-center justify-center mx-auto mb-4 text-emerald-300">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <h3 className="text-xl font-semibold text-emerald-300 mb-1">探索完成</h3>
                        <p className="text-sm text-[var(--text-muted)]">以下是你的方向建议报告</p>
                      </div>

                      <div className="space-y-3">
                        <div className="rounded-lg bg-white/[0.03] p-4">
                          <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-2">核心判断</h4>
                          <p className={`text-lg font-semibold ${
                            finalReport.worthDoing.includes('值得') ? 'text-emerald-400' :
                            finalReport.worthDoing.includes('验证') ? 'text-amber-400' :
                            'text-red-400'
                          }`}>
                            {finalReport.worthDoing}
                          </p>
                        </div>

                        <div className="rounded-lg bg-white/[0.03] p-4">
                          <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-2">关键洞察</h4>
                          <p className="text-[var(--text-tertiary)] text-sm">{finalReport.summary}</p>
                        </div>

                        <div className="rounded-lg bg-white/[0.03] p-4">
                          <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-2">从这里开始</h4>
                          <p className="text-[var(--text-tertiary)] text-sm">{finalReport.whereToStart}</p>
                        </div>

                        <div className="rounded-lg bg-white/[0.03] p-4">
                          <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-2">风险提示</h4>
                          <p className="text-[var(--text-tertiary)] text-sm">{finalReport.risks}</p>
                        </div>

                        <div className="rounded-lg bg-violet-500/10 border border-violet-500/30 p-4">
                          <h4 className="text-sm font-medium text-violet-300 mb-3">项目描述（可直接复制到 AI 导出）</h4>
                          <textarea
                            value={`${session.collectedFacts.originalIdea}\n\n项目方向：${session.collectedFacts.selectedDirection?.name || '简洁实用版'}\n${session.collectedFacts.selectedDirection?.whyFits || ''}\n\n核心功能：${session.collectedFacts.mvp?.mustHave?.join('、') || ''}\n\n从这里开始：${finalReport.whereToStart}\n\n验证方式：${finalReport.minimalValidation || session.collectedFacts.mvp?.fastestValidation || ''}`}
                            readOnly
                            className="input-field min-h-[128px] resize-y"
                          />
                        </div>
                      </div>

                      <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-3">
                        <button
                          onClick={() => {
                            const text = `${session.collectedFacts.originalIdea}\n\n项目方向：${session.collectedFacts.selectedDirection?.name || '简洁实用版'}\n${session.collectedFacts.selectedDirection?.whyFits || ''}\n\n核心功能：${session.collectedFacts.mvp?.mustHave?.join('、') || ''}\n\n从这里开始：${finalReport.whereToStart}\n\n验证方式：${finalReport.minimalValidation || session.collectedFacts.mvp?.fastestValidation || ''}`;
                            navigator.clipboard.writeText(text);
                          }}
                          className="btn-secondary"
                        >
                          复制项目描述
                        </button>
                        <Link
                          href="/prompt"
                          className="btn-primary"
                        >
                          去AI导出，开始开发
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
