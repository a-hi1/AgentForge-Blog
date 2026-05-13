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
import { QuestionRenderer } from '@/components/idea-discovery/QuestionRenderer';
import {
  DiscoveryRecord,
  getDiscoveryHistory,
  saveDiscoveryToHistory,
  toggleDiscoveryFavorite,
  deleteDiscoveryRecord,
} from '@/lib/idea-discovery/storage';

export default function IdeaDiscoveryPage() {
  const [idea, setIdea] = useState('');
  const [session, setSession] = useState<DiscoverySession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentAnswers, setCurrentAnswers] = useState<Record<string, unknown>>({});
  const [phaseHistory, setPhaseHistory] = useState<
    Array<{ phase: DiscoveryPhase; data: Record<string, unknown>; analysis?: string }>
  >([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [records, setRecords] = useState<DiscoveryRecord[]>([]);
  const [showHistorySidebar, setShowHistorySidebar] = useState(true);

  const abortRef = useRef<AbortController | null>(null);
  const sessionRef = useRef(session);

  useEffect(() => { sessionRef.current = session; }, [session]);

  const loadRecords = useCallback(() => {
    setRecords(getDiscoveryHistory());
  }, []);

  useEffect(() => {
    loadRecords();
    const interval = setInterval(loadRecords, 2000);
    return () => clearInterval(interval);
  }, [loadRecords]);

  const saveCurrentSession = useCallback(() => {
    const s = sessionRef.current;
    if (!s || s.currentPhase === 'initial') return;
    const report = s.collectedFacts.finalReport;
    saveDiscoveryToHistory(s, report);
    loadRecords();
  }, [loadRecords]);

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
            setTimeout(() => {
              const s = data.session as DiscoverySession;
              if (s && s.currentPhase !== 'initial') {
                saveDiscoveryToHistory(s, s.collectedFacts.finalReport);
                loadRecords();
              }
            }, 100);
          } else if (data.type === 'error') {
            throw new Error(data.error || '未知错误');
          }
        } catch { /* ignore parse errors */ }
      }
    }
  }, [loadRecords]);

  const handleStartDiscovery = useCallback(async () => {
    if (!idea.trim()) return;

    setLoading(true);
    setError('');
    setSession(null);
    setCurrentAnswers({});
    setPhaseHistory([]);
    setShowHistorySidebar(false);

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
      saveCurrentSession();

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
  }, [session, currentAnswers, processSSEStream, saveCurrentSession]);

  const handleSelectRecord = useCallback((record: DiscoveryRecord) => {
    abortRef.current?.abort();
    setSession(record.session);
    setIdea(record.originalIdea);
    setError('');
    setCurrentAnswers({});
    setPhaseHistory(record.session.phaseHistory
      .filter(h => h.output && h.phase !== 'initial')
      .flatMap(h => [{ phase: h.phase, data: h.output as unknown as Record<string, unknown>, analysis: h.output.analysis }])
    );
    setShowHistorySidebar(false);
  }, []);

  const handleNewDiscovery = useCallback(() => {
    abortRef.current?.abort();
    setIdea('');
    setSession(null);
    setLoading(false);
    setError('');
    setCurrentAnswers({});
    setPhaseHistory([]);
  }, []);

  const reset = useCallback(() => {
    setIdea('');
    setSession(null);
    setLoading(false);
    setError('');
    setCurrentAnswers({});
    setPhaseHistory([]);
    setShowHistorySidebar(true);
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

  const showSidebarList = showHistorySidebar || (!session && !loading);

  return (
    <div className="min-h-screen bg-zinc-950 flex">
      {/* Sidebar */}
      <aside className={`${sidebarCollapsed ? 'w-14' : 'w-72'} shrink-0 bg-zinc-900 border-r border-zinc-800 flex flex-col transition-all duration-200`}>
        <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
          {!sidebarCollapsed && <h2 className="text-sm font-semibold text-white">探索记录</h2>}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1.5 text-zinc-400 hover:text-white rounded transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sidebarCollapsed ? 'M13 5l7 7-7 7' : 'M11 19l-7-7 7-7'} />
            </svg>
          </button>
        </div>

        {!sidebarCollapsed && (
          <>
            <div className="p-3 border-b border-zinc-800">
              <button
                onClick={handleNewDiscovery}
                className="w-full py-2 rounded-lg border border-violet-500/30 bg-violet-500/10 text-violet-300 text-sm font-medium hover:bg-violet-500/20 transition flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                新建探索
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {records.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-zinc-500 text-sm">还没有探索记录</p>
                  <p className="text-zinc-600 text-xs mt-1">开始一次方向探索吧</p>
                </div>
              ) : (
                <div className="py-1">
                  {records.map((record) => {
                    const isActive = session?.id === record.id;
                    return (
                      <div
                        key={record.id}
                        onClick={() => handleSelectRecord(record)}
                        className={`group mx-2 my-0.5 rounded-lg px-3 py-2.5 cursor-pointer transition-all ${
                          isActive
                            ? 'bg-violet-500/10 border border-violet-500/20'
                            : 'hover:bg-zinc-800/50 border border-transparent'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-zinc-300 truncate">{record.originalIdea}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] text-zinc-600">
                                {formatRelativeTime(record.updatedAt)}
                              </span>
                              {record.session.currentPhase && record.session.currentPhase !== 'initial' && (
                                <span className="text-[10px] text-zinc-500">
                                  {getPhaseName(record.session.currentPhase)}
                                </span>
                              )}
                            </div>
                            {record.report?.worthDoing && (
                              <span className={`inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded-full ${
                                record.report.worthDoing.includes('值得') ? 'bg-emerald-500/20 text-emerald-400' :
                                record.report.worthDoing.includes('验证') ? 'bg-amber-500/20 text-amber-400' :
                                'bg-red-500/20 text-red-400'
                              }`}>
                                {record.report.worthDoing}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleDiscoveryFavorite(record.id);
                                loadRecords();
                              }}
                              className={`p-1 rounded ${record.favorite ? 'text-amber-400' : 'text-zinc-600 hover:text-zinc-400'}`}
                            >
                              <svg className="w-3.5 h-3.5" fill={record.favorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                              </svg>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('确定删除？')) {
                                  deleteDiscoveryRecord(record.id);
                                  loadRecords();
                                  if (session?.id === record.id) handleNewDiscovery();
                                }
                              }}
                              className="p-1 rounded text-zinc-600 hover:text-red-400"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </aside>

      {/* Main Content */}
      <div className="flex-1 py-8 px-6 max-w-3xl mx-auto w-full">
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
                rows={3}
              />
              <div className="flex items-center gap-2">
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
            <button onClick={reset} className="mt-2 rounded-lg bg-red-800 px-4 py-1.5 text-xs text-white hover:bg-red-700 transition">重试</button>
          </div>
        )}

        {session && (
          <div className="space-y-4">
            {/* Session info bar */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-900/50 border border-zinc-800 text-xs text-zinc-500">
              <span className="text-zinc-400">{session.collectedFacts.originalIdea}</span>
              <span>·</span>
              <span>ID: {session.id.slice(-6)}</span>
            </div>

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
                <button
                  onClick={() => {
                    saveCurrentSession();
                    setShowHistorySidebar(true);
                  }}
                  className="mt-4 mr-3 inline-block rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition"
                >
                  保存到历史记录
                </button>
                <Link href="/prompt" className="mt-4 inline-block rounded-lg bg-violet-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-violet-500 transition">
                  确认方向，开始开发
                </Link>
              </div>
            )}
          </div>
        )}

        {!session && !loading && records.length === 0 && (
          <div className="mt-16 text-center text-zinc-600">
            <div className="text-4xl mb-3">🧭</div>
            <p>输入你的想法，让 AI 联合创始人帮你探索方向</p>
          </div>
        )}
      </div>
    </div>
  );
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins} 分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天前`;
  return `${Math.floor(days / 30)} 个月前`;
}
