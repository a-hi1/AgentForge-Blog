'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  getPromptHistory,
  toggleFavorite,
  deletePrompt,
  updatePromptFeedback,
  savePromptVersion,
  PromptHistoryRecord,
} from '@/lib/prompt/history';
import { refinePrompt, RefinementResult } from '@/lib/prompt/refiner';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export default function PromptHistoryPage() {
  const [history, setHistory] = useState<PromptHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [sortBy, setSortBy] = useState<'smart' | 'score' | 'date' | 'favorite'>('smart');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [refinementResult, setRefinementResult] = useState<RefinementResult | null>(null);
  const [showRefinement, setShowRefinement] = useState(false);
  const [refining, setRefining] = useState(false);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const records = await getPromptHistory({
        search: search || undefined,
        onlyFavorites,
        sortBy,
        limit: 100,
      });
      setHistory(records);
    } catch (e) {
      console.error('[PromptHistory] Load failed:', e);
    } finally {
      setLoading(false);
    }
  }, [search, onlyFavorites, sortBy]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleToggleFavorite = async (id: string, current: boolean) => {
    await toggleFavorite(id, !current);
    await loadHistory();
  };

  const handleDelete = async (id: string) => {
    if (confirm('确定要删除这条记录吗？')) {
      await deletePrompt(id);
      setSelectedId(null);
      await loadHistory();
    }
  };

  const handleFeedback = async (feedback: 'excellent' | 'average' | 'failed') => {
    if (!selectedId) return;
    await updatePromptFeedback(selectedId, feedback);
    await loadHistory();
  };

  const handleRefine = async () => {
    if (!selectedRecord) return;
    setRefining(true);
    try {
      const result = refinePrompt({
        originalPrompt: selectedRecord.output,
        score: selectedRecord.score
      });
      setRefinementResult(result);
      setShowRefinement(true);
    } catch (e) {
      console.error('[PromptRefine] Failed:', e);
    } finally {
      setRefining(false);
    }
  };

  const handleSaveImproved = async () => {
    if (!selectedId || !refinementResult) return;
    try {
      await savePromptVersion(selectedId, refinementResult.improvedPrompt);
      setShowRefinement(false);
      setRefinementResult(null);
      await loadHistory();
      alert('优化版本已保存！');
    } catch (e) {
      console.error('[PromptSave] Failed:', e);
    }
  };

  const sendToPlayground = (output: string) => {
    window.location.href = `/playground?prompt=${encodeURIComponent(output)}`;
  };

  const selectedRecord = selectedId ? history.find(r => r.id === selectedId) : null;

  const getVersionChain = (record: PromptHistoryRecord) => {
    const chain: PromptHistoryRecord[] = [];
    let current: PromptHistoryRecord | null = record;
    while (current) {
      chain.unshift(current);
      if (!current.parent_id) break;
      const parent = history.find(r => r.id === current!.parent_id);
      if (!parent) break;
      current = parent;
    }
    return chain;
  };

  const getScoreColor = (score?: number) => {
    if (!score) return 'text-[#71717A]';
    if (score >= 90) return 'text-[#10B981]';
    if (score >= 80) return 'text-[#60A5FA]';
    if (score >= 70) return 'text-[#F59E0B]';
    if (score >= 60) return 'text-[#EF4444]';
    return 'text-[#71717A]';
  };

  const getScoreBg = (score?: number) => {
    if (!score) return 'bg-[rgba(255,255,255,0.05)]';
    if (score >= 90) return 'bg-[rgba(16,185,129,0.15)]';
    if (score >= 80) return 'bg-[rgba(96,165,250,0.15)]';
    if (score >= 70) return 'bg-[rgba(245,158,11,0.15)]';
    if (score >= 60) return 'bg-[rgba(239,68,68,0.15)]';
    return 'bg-[rgba(255,255,255,0.05)]';
  };

  const getGradeLabel = (score?: number) => {
    if (!score) return '未评分';
    if (score >= 90) return '卓越';
    if (score >= 80) return '优秀';
    if (score >= 70) return '良好';
    if (score >= 60) return '一般';
    return '需优化';
  };

  return (
    <div className="min-h-[calc(100vh-80px)] py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#FAFAFA] mb-2">
              提示词历史
            </h1>
            <p className="text-[#71717A]">管理和复用你的提示词生成记录</p>
          </div>
          <Link
            href="/prompt"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6] text-white hover:shadow-lg transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            生成新提示词
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-[#111113] rounded-xl border border-[rgba(255,255,255,0.06)] p-6">
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#71717A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="搜索提示词..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-[#070707] border border-[rgba(255,255,255,0.1)] rounded-lg text-[#FAFAFA] focus:border-[rgba(59,130,246,0.5)] focus:outline-none"
                    />
                  </div>
                </div>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  className="px-4 py-2 bg-[#070707] border border-[rgba(255,255,255,0.1)] rounded-lg text-[#FAFAFA] focus:border-[rgba(59,130,246,0.5)] focus:outline-none"
                >
                  <option value="smart">智能排序</option>
                  <option value="score">按评分</option>
                  <option value="date">按时间</option>
                  <option value="favorite">按收藏</option>
                </select>
                <button
                  onClick={() => setOnlyFavorites(!onlyFavorites)}
                  className={`px-4 py-2 rounded-lg border transition-all flex items-center gap-2 ${
                    onlyFavorites
                      ? 'bg-[rgba(245,158,11,0.15)] text-[#F59E0B] border-[rgba(245,158,11,0.25)]'
                      : 'bg-[#070707] text-[#71717A] border-[rgba(255,255,255,0.1)] hover:text-[#FAFAFA]'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                  {onlyFavorites ? '显示全部' : '仅收藏'}
                </button>
              </div>

              {loading ? (
                <div className="py-12 text-center">
                  <div className="animate-spin w-8 h-8 border-2 border-[#3B82F6] border-t-transparent rounded-full mx-auto mb-4" />
                  <p className="text-[#71717A]">加载中...</p>
                </div>
              ) : history.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-[#71717A] mb-4">暂无提示词记录</p>
                  <Link
                    href="/prompt"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#3B82F6] text-white hover:bg-[#60A5FA] transition-all"
                  >
                    开始生成
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map(record => (
                    <div
                      key={record.id}
                      className={`p-4 rounded-lg border transition-all cursor-pointer ${
                        selectedId === record.id
                          ? 'border-[rgba(59,130,246,0.35)] bg-[rgba(59,130,246,0.05)]'
                          : 'border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] hover:border-[rgba(255,255,255,0.15)]'
                      }`}
                      onClick={() => setSelectedId(record.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-[#FAFAFA] font-medium truncate">
                              {record.title}
                            </h3>
                            {record.favorite && (
                              <svg className="w-4 h-4 text-[#F59E0B] flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                              </svg>
                            )}
                            {record.version && record.version > 1 && (
                              <span className="px-2 py-0.5 text-xs rounded bg-[rgba(139,92,246,0.15)] text-[#A78BFA]">
                                v{record.version}
                              </span>
                            )}
                            {record.score !== undefined && (
                              <span className={`px-2 py-0.5 text-xs rounded ${getScoreBg(record.score)} ${getScoreColor(record.score)} font-medium`}>
                                {record.score}分 · {getGradeLabel(record.score)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-[#71717A] flex-wrap">
                            <span className="px-2 py-0.5 rounded bg-[rgba(255,255,255,0.05)]">
                              {record.project_type}
                            </span>
                            {record.phase && (
                              <span className="px-2 py-0.5 rounded bg-[rgba(255,255,255,0.05)]">
                                {record.phase}
                              </span>
                            )}
                            {record.feedback && (
                              <span className={`px-2 py-0.5 rounded ${
                                record.feedback === 'excellent' ? 'bg-[rgba(16,185,129,0.15)] text-[#10B981]' :
                                record.feedback === 'average' ? 'bg-[rgba(245,158,11,0.15)] text-[#F59E0B]' :
                                'bg-[rgba(239,68,68,0.15)] text-[#EF4444]'
                              }`}>
                                {record.feedback === 'excellent' ? '优秀' :
                                 record.feedback === 'average' ? '一般' : '失败'}
                              </span>
                            )}
                            <span>
                              {formatDistanceToNow(new Date(record.created_at), {
                                addSuffix: true,
                                locale: zhCN,
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            {selectedRecord ? (
              <div className="bg-[#111113] rounded-xl border border-[rgba(255,255,255,0.06)] p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-[#FAFAFA]">
                    详情
                  </h2>
                  <button
                    onClick={() => setSelectedId(null)}
                    className="text-[#71717A] hover:text-[#FAFAFA]"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-[#FAFAFA] mb-2">
                      标题
                    </h3>
                    <p className="text-sm text-[#A1A1AA]">
                      {selectedRecord.title}
                    </p>
                  </div>

                  {selectedRecord.score !== undefined && selectedRecord.score_details && (
                    <div className="p-4 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)]">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-[#FAFAFA]">综合评分</span>
                        <span className={`text-lg font-bold ${getScoreColor(selectedRecord.score)}`}>
                          {selectedRecord.score}分
                        </span>
                      </div>
                      <div className="h-2 w-full bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden mb-3">
                        <div
                          className={`h-full rounded-full transition-all ${
                            selectedRecord.score >= 90 ? 'bg-[#10B981]' :
                            selectedRecord.score >= 80 ? 'bg-[#3B82F6]' :
                            selectedRecord.score >= 70 ? 'bg-[#F59E0B]' :
                            'bg-[#EF4444]'
                          }`}
                          style={{ width: `${selectedRecord.score}%` }}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-[#71717A]">结构</span>
                          <span className={getScoreColor(selectedRecord.score_details.dimensions.structure)}>
                            {selectedRecord.score_details.dimensions.structure}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#71717A]">专业度</span>
                          <span className={getScoreColor(selectedRecord.score_details.dimensions.professionalism)}>
                            {selectedRecord.score_details.dimensions.professionalism}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#71717A]">可执行</span>
                          <span className={getScoreColor(selectedRecord.score_details.dimensions.executability)}>
                            {selectedRecord.score_details.dimensions.executability}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#71717A]">执行率</span>
                          <span className={getScoreColor(selectedRecord.score_details.dimensions.executionSuccess)}>
                            {selectedRecord.score_details.dimensions.executionSuccess}
                          </span>
                        </div>
                      </div>
                      {selectedRecord.score_details.feedback.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-[rgba(255,255,255,0.06)]">
                          <p className="text-xs text-[#71717A] mb-1">改进建议</p>
                          {selectedRecord.score_details.feedback.map((fb, idx) => (
                            <p key={idx} className="text-xs text-[#A1A1AA]">• {fb}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {getVersionChain(selectedRecord).length > 1 && (
                    <div className="p-4 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)]">
                      <h3 className="text-sm font-medium text-[#FAFAFA] mb-2">
                        版本演化
                      </h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        {getVersionChain(selectedRecord).map((version, idx) => (
                          <div
                            key={version.id}
                            className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                              version.id === selectedId
                                ? 'bg-[rgba(59,130,246,0.15)] text-[#60A5FA] border border-[rgba(59,130,246,0.35)]'
                                : 'bg-[rgba(255,255,255,0.05)] text-[#71717A] cursor-pointer hover:text-[#FAFAFA]'
                            }`}
                            onClick={() => version.id !== selectedId && setSelectedId(version.id)}
                          >
                            v{version.version || 1}
                            {idx < getVersionChain(selectedRecord).length - 1 && (
                              <svg className="w-3 h-3 mx-1 text-[#71717A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="text-sm font-medium text-[#FAFAFA] mb-2">
                      输入
                    </h3>
                    <p className="text-xs text-[#71717A] line-clamp-4 whitespace-pre-wrap break-all">
                      {selectedRecord.input}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-[#FAFAFA] mb-2">
                      输出
                    </h3>
                    <p className="text-xs text-[#71717A] line-clamp-8 whitespace-pre-wrap break-all">
                      {selectedRecord.output}
                    </p>
                  </div>

                  {!selectedRecord.feedback && (
                    <div className="p-4 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)]">
                      <h3 className="text-sm font-medium text-[#FAFAFA] mb-3">
                        执行效果如何？
                      </h3>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={() => handleFeedback('excellent')}
                          className="px-3 py-2 rounded-lg bg-[rgba(16,185,129,0.15)] border border-[rgba(16,185,129,0.25)] text-[#10B981] text-xs hover:bg-[rgba(16,185,129,0.25)] transition-all"
                        >
                          优秀
                        </button>
                        <button
                          onClick={() => handleFeedback('average')}
                          className="px-3 py-2 rounded-lg bg-[rgba(245,158,11,0.15)] border border-[rgba(245,158,11,0.25)] text-[#F59E0B] text-xs hover:bg-[rgba(245,158,11,0.25)] transition-all"
                        >
                          一般
                        </button>
                        <button
                          onClick={() => handleFeedback('failed')}
                          className="px-3 py-2 rounded-lg bg-[rgba(239,68,68,0.15)] border border-[rgba(239,68,68,0.25)] text-[#EF4444] text-xs hover:bg-[rgba(239,68,68,0.25)] transition-all"
                        >
                          失败
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t border-[rgba(255,255,255,0.06)]">
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <button
                        onClick={() => sendToPlayground(selectedRecord.output)}
                        className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6] text-white text-sm hover:shadow-lg transition-all"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        发送执行
                      </button>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(selectedRecord.output);
                          alert('已复制到剪贴板');
                        }}
                        className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#070707] border border-[rgba(255,255,255,0.1)] text-[#71717A] hover:text-[#FAFAFA] text-sm transition-all"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                        </svg>
                        复制
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <button
                        onClick={() =>
                          handleToggleFavorite(selectedRecord.id, selectedRecord.favorite)
                        }
                        className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                          selectedRecord.favorite
                            ? 'bg-[rgba(245,158,11,0.15)] text-[#F59E0B] border-[rgba(245,158,11,0.25)]'
                            : 'bg-[#070707] border-[rgba(255,255,255,0.1)] text-[#71717A] hover:text-[#FAFAFA]'
                        }`}
                      >
                        <svg className="w-4 h-4" fill={selectedRecord.favorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                        {selectedRecord.favorite ? '取消收藏' : '收藏'}
                      </button>
                      <button
                        onClick={handleRefine}
                        disabled={refining}
                        className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[rgba(139,92,246,0.15)] border border-[rgba(139,92,246,0.25)] text-[#A78BFA] text-sm hover:bg-[rgba(139,92,246,0.25)] transition-all disabled:opacity-50"
                      >
                        {refining ? (
                          <div className="animate-spin w-4 h-4 border-2 border-[#A78BFA] border-t-transparent rounded-full" />
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        )}
                        智能优化
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleDelete(selectedRecord.id)}
                        className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[rgba(239,68,68,0.15)] border border-[rgba(239,68,68,0.25)] text-[#EF4444] text-sm hover:bg-[rgba(239,68,68,0.25)] transition-all"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        删除
                      </button>
                      <Link
                        href={`/prompt?idea=${encodeURIComponent(selectedRecord.input)}`}
                        className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#070707] border border-[rgba(255,255,255,0.1)] text-[#71717A] hover:text-[#FAFAFA] text-sm transition-all"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        重新生成
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-[#111113] rounded-xl border border-[rgba(255,255,255,0.06)] p-6">
                <div className="text-center py-8">
                  <p className="text-[#71717A]">选择一条记录查看详情</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {showRefinement && refinementResult && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-[#111113] rounded-xl border border-[rgba(255,255,255,0.06)] max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-[rgba(255,255,255,0.06)]">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-[#FAFAFA]">智能优化结果</h2>
                  <button
                    onClick={() => setShowRefinement(false)}
                    className="text-[#71717A] hover:text-[#FAFAFA]"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-[#FAFAFA] mb-2">问题分析</h3>
                  <ul className="space-y-1">
                    {refinementResult.originalIssues.map((issue, idx) => (
                      <li key={idx} className="text-sm text-[#A1A1AA]">• {issue}</li>
                    ))}
                  </ul>
                </div>
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-[#FAFAFA] mb-2">优化策略</h3>
                  <p className="text-sm text-[#A1A1AA] whitespace-pre-wrap">{refinementResult.strategy}</p>
                </div>
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-[#FAFAFA] mb-2">改进点</h3>
                  <ul className="space-y-1">
                    {refinementResult.improvements.map((imp, idx) => (
                      <li key={idx} className="text-sm text-[#10B981]">✓ {imp}</li>
                    ))}
                  </ul>
                </div>
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-[#FAFAFA] mb-2">优化后的提示词</h3>
                  <pre className="text-xs text-[#A1A1AA] whitespace-pre-wrap bg-[#070707] border border-[rgba(255,255,255,0.1)] rounded-lg p-4 max-h-60 overflow-y-auto">
                    {refinementResult.improvedPrompt}
                  </pre>
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setShowRefinement(false)}
                    className="px-4 py-2 rounded-lg bg-[#070707] border border-[rgba(255,255,255,0.1)] text-[#71717A] hover:text-[#FAFAFA] text-sm transition-all"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleSaveImproved}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6] text-white text-sm hover:shadow-lg transition-all"
                  >
                    保存为新版本
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
