'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  getPromptHistory,
  getSystemTemplates,
  toggleFavorite,
  deletePrompt,
  updatePromptFeedback,
  savePromptVersion,
  PromptAsset,
  PromptPhase,
} from '@/lib/prompt/history';
import { refinePrompt, RefinementResult } from '@/lib/prompt/refiner';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

type TabKey = 'my' | 'system' | 'favorite' | 'recent';

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'my', label: '我的 Prompt', icon: '📝' },
  { key: 'system', label: '系统模板', icon: '📦' },
  { key: 'favorite', label: '收藏夹', icon: '⭐' },
  { key: 'recent', label: '最近使用', icon: '🕐' },
];

const PHASE_LABELS: Record<string, string> = {
  idea: '💡 想法',
  architecture: '🏗️ 架构',
  implementation: '⚙️ 实现',
  optimization: '🚀 优化',
  debug: '🐛 调试',
  deployment: '🚢 部署',
};

const FLOW_STEPS = [
  { step: 1, text: '在 Prompt Studio 生成', href: '/prompt' },
  { step: 2, text: '自动保存到我的资产' },
  { step: 3, text: '发送到 Playground', href: '/playground' },
  { step: 4, text: '执行后反馈结果' },
  { step: 5, text: '成为可复用经验' },
];

export default function PromptHistoryPage() {
  const [allAssets, setAllAssets] = useState<PromptAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('my');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [refinementResult, setRefinementResult] = useState<RefinementResult | null>(null);
  const [showRefinement, setShowRefinement] = useState(false);
  const [refining, setRefining] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showFlowGuide, setShowFlowGuide] = useState(true);
  const [editSave, setEditSave] = useState<{ id: string; title: string } | null>(null);
  const [editSaveTitle, setEditSaveTitle] = useState('');
  const promptRef = useRef<HTMLPreElement>(null);

  const loadAssets = useCallback(async () => {
    setLoading(true);
    try {
      const records = await getPromptHistory({ limit: 200 });
      setAllAssets(records);
    } catch (e) {
      console.error('[PromptHistory] Load failed:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  const systemTemplates = getSystemTemplates();

  const filteredAssets = (() => {
    let list: PromptAsset[] = [];
    switch (activeTab) {
      case 'my':
        list = allAssets.filter(a => a.source === 'user-generated');
        break;
      case 'system':
        list = systemTemplates;
        break;
      case 'favorite':
        list = allAssets.filter(a => a.favorite);
        break;
      case 'recent':
        list = [...allAssets].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
    }
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(
        a =>
          a.title.toLowerCase().includes(s) ||
          a.input.toLowerCase().includes(s) ||
          a.fullPrompt.toLowerCase().includes(s) ||
          a.tags.some(t => t.toLowerCase().includes(s))
      );
    }
    return list;
  })();

  const selectedRecord = selectedId
    ? [...allAssets, ...systemTemplates].find(a => a.id === selectedId)
    : null;

  const handleToggleFavorite = async (id: string, current: boolean) => {
    await toggleFavorite(id, !current);
    await loadAssets();
  };

  const handleDelete = async (id: string) => {
    if (confirm('确定要删除这条 Prompt 资产吗？')) {
      await deletePrompt(id);
      if (selectedId === id) setSelectedId(null);
      await loadAssets();
    }
  };

  const handleFeedback = async (feedback: 'excellent' | 'average' | 'failed') => {
    if (!selectedId) return;
    await updatePromptFeedback(selectedId, feedback);
    await loadAssets();
  };

  const handleRefine = async () => {
    if (!selectedRecord) return;
    setRefining(true);
    try {
      const result = refinePrompt({
        originalPrompt: selectedRecord.fullPrompt,
        score: selectedRecord.score,
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
      await loadAssets();
    } catch (e) {
      console.error('[PromptSave] Failed:', e);
    }
  };

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleDoubleClick = (asset: PromptAsset) => {
    handleCopy(asset.fullPrompt, asset.id);
  };

  const handleSelectAllPrompt = () => {
    if (promptRef.current) {
      const range = document.createRange();
      range.selectNodeContents(promptRef.current);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  };

  const sendToPlayground = (asset: PromptAsset) => {
    window.location.href = `/playground?prompt=${encodeURIComponent(asset.fullPrompt)}&assetId=${asset.id}`;
  };

  const handleEditSave = async () => {
    if (!editSave || !editSaveTitle.trim()) return;
    const original = [...allAssets, ...systemTemplates].find(a => a.id === editSave.id);
    if (!original) return;
    const { savePrompt } = await import('@/lib/prompt/history');
    await savePrompt({
      title: editSaveTitle,
      category: original.category,
      phase: original.phase,
      projectId: original.projectId,
      input: original.input,
      fullPrompt: original.fullPrompt,
      tags: [...original.tags],
      source: 'user-generated',
      clarifications: [...original.clarifications],
    });
    setEditSave(null);
    setEditSaveTitle('');
    await loadAssets();
  };

  const getScoreColor = (score?: number) => {
    if (!score) return 'text-[#71717A]';
    if (score >= 90) return 'text-[#10B981]';
    if (score >= 80) return 'text-[#60A5FA]';
    if (score >= 70) return 'text-[#F59E0B]';
    return 'text-[#EF4444]';
  };

  const getScoreBg = (score?: number) => {
    if (!score) return 'bg-[rgba(255,255,255,0.05)]';
    if (score >= 90) return 'bg-[rgba(16,185,129,0.15)]';
    if (score >= 80) return 'bg-[rgba(96,165,250,0.15)]';
    if (score >= 70) return 'bg-[rgba(245,158,11,0.15)]';
    return 'bg-[rgba(239,68,68,0.15)]';
  };

  return (
    <div className="min-h-[calc(100vh-80px)] py-6 px-4">
      <div className="max-w-7xl mx-auto">
        {showFlowGuide && (
          <div className="mb-6 p-4 rounded-xl bg-[rgba(139,92,246,0.05)] border border-[rgba(139,92,246,0.15)]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[#A78BFA]">📋 使用流程</h3>
              <button
                onClick={() => setShowFlowGuide(false)}
                className="text-[#71717A] hover:text-[#A1A1AA] text-xs"
              >
                收起
              </button>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {FLOW_STEPS.map((s, i) => (
                <div key={s.step} className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-[rgba(139,92,246,0.2)] text-[#A78BFA] text-[10px] flex items-center justify-center font-bold">
                      {s.step}
                    </span>
                    {s.href ? (
                      <Link href={s.href} className="text-xs text-[#A1A1AA] hover:text-[#A78BFA] transition-colors">
                        {s.text}
                      </Link>
                    ) : (
                      <span className="text-xs text-[#A1A1AA]">{s.text}</span>
                    )}
                  </div>
                  {i < FLOW_STEPS.length - 1 && (
                    <svg className="w-3 h-3 text-[#52525B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#FAFAFA] mb-1">Prompt 资产库</h1>
            <p className="text-sm text-[#71717A]">管理、复用你的 Prompt 资产</p>
          </div>
          <Link
            href="/prompt"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6] text-white text-sm hover:shadow-lg transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            生成新 Prompt
          </Link>
        </div>

        <div className="flex items-center gap-1 mb-4 border-b border-[rgba(255,255,255,0.06)]">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setSelectedId(null); }}
              className={`px-4 py-2.5 text-sm font-medium transition-all border-b-2 ${
                activeTab === tab.key
                  ? 'text-[#A78BFA] border-[#8B5CF6]'
                  : 'text-[#71717A] border-transparent hover:text-[#A1A1AA]'
              }`}
            >
              <span className="mr-1.5">{tab.icon}</span>
              {tab.label}
              {tab.key === 'my' && (
                <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-[rgba(139,92,246,0.15)] text-[#A78BFA]">
                  {allAssets.filter(a => a.source === 'user-generated').length}
                </span>
              )}
              {tab.key === 'favorite' && (
                <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-[rgba(245,158,11,0.15)] text-[#F59E0B]">
                  {allAssets.filter(a => a.favorite).length}
                </span>
              )}
              {tab.key === 'system' && (
                <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-[rgba(255,255,255,0.05)] text-[#71717A]">
                  {systemTemplates.length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex gap-6">
          <div className={`${selectedRecord ? 'w-full lg:w-[55%]' : 'w-full'} transition-all`}>
            <div className="mb-4 flex gap-3">
              <div className="flex-1 relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="搜索 Prompt..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-[#111113] border border-[rgba(255,255,255,0.1)] rounded-lg text-[#FAFAFA] text-sm focus:border-[rgba(139,92,246,0.5)] focus:outline-none"
                />
              </div>
            </div>

            {loading ? (
              <div className="py-16 text-center">
                <div className="animate-spin w-8 h-8 border-2 border-[#8B5CF6] border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-[#71717A]">加载中...</p>
              </div>
            ) : filteredAssets.length === 0 ? (
              <div className="py-16 text-center bg-[#111113] rounded-xl border border-[rgba(255,255,255,0.06)]">
                <p className="text-[#71717A] mb-4">
                  {activeTab === 'my' ? '还没有 Prompt 资产' :
                   activeTab === 'favorite' ? '还没有收藏的 Prompt' :
                   activeTab === 'system' ? '暂无系统模板' : '暂无记录'}
                </p>
                {activeTab === 'my' && (
                  <Link href="/prompt" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#8B5CF6] text-white text-sm">
                    开始生成
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredAssets.map(asset => (
                  <div
                    key={asset.id}
                    className={`group relative p-4 rounded-lg border transition-all cursor-pointer ${
                      selectedId === asset.id
                        ? 'border-[rgba(139,92,246,0.4)] bg-[rgba(139,92,246,0.06)]'
                        : 'border-[rgba(255,255,255,0.06)] bg-[#111113] hover:border-[rgba(255,255,255,0.15)]'
                    }`}
                    onClick={() => setSelectedId(asset.id)}
                    onDoubleClick={() => handleDoubleClick(asset)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <h3 className="text-[#FAFAFA] font-medium text-sm truncate">{asset.title}</h3>
                          {asset.source === 'system-template' && (
                            <span className="px-1.5 py-0.5 text-[10px] rounded bg-[rgba(59,130,246,0.15)] text-[#60A5FA]">
                              系统
                            </span>
                          )}
                          {asset.favorite && (
                            <svg className="w-3.5 h-3.5 text-[#F59E0B]" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                          )}
                          {asset.version && asset.version > 1 && (
                            <span className="px-1.5 py-0.5 text-[10px] rounded bg-[rgba(139,92,246,0.15)] text-[#A78BFA]">v{asset.version}</span>
                          )}
                          {asset.score !== undefined && (
                            <span className={`px-1.5 py-0.5 text-[10px] rounded font-medium ${getScoreBg(asset.score)} ${getScoreColor(asset.score)}`}>
                              {asset.score}分
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-[#71717A] flex-wrap">
                          <span className="px-1.5 py-0.5 rounded bg-[rgba(255,255,255,0.05)]">{asset.category}</span>
                          {asset.phase && <span className="px-1.5 py-0.5 rounded bg-[rgba(255,255,255,0.05)]">{PHASE_LABELS[asset.phase] || asset.phase}</span>}
                          {asset.executionUsed && (
                            <span className={`px-1.5 py-0.5 rounded ${
                              asset.executionSuccess ? 'bg-[rgba(16,185,129,0.15)] text-[#10B981]' : 'bg-[rgba(239,68,68,0.15)] text-[#EF4444]'
                            }`}>
                              {asset.executionSuccess ? '✓ 已执行' : '✗ 执行失败'}
                            </span>
                          )}
                          {asset.rating && (
                            <span className="text-[#F59E0B]">{'★'.repeat(asset.rating)}{'☆'.repeat(5 - asset.rating)}</span>
                          )}
                          <span>{formatDistanceToNow(new Date(asset.createdAt), { addSuffix: true, locale: zhCN })}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          onClick={e => { e.stopPropagation(); handleCopy(asset.fullPrompt, asset.id); }}
                          className="p-1.5 rounded-md hover:bg-[rgba(255,255,255,0.08)] text-[#71717A] hover:text-[#FAFAFA] transition-all"
                          title="复制"
                        >
                          {copiedId === asset.id ? (
                            <svg className="w-4 h-4 text-[#10B981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                            </svg>
                          )}
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); sendToPlayground(asset); }}
                          className="p-1.5 rounded-md hover:bg-[rgba(139,92,246,0.15)] text-[#71717A] hover:text-[#A78BFA] transition-all"
                          title="发送到 Playground"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </button>
                        {asset.source === 'system-template' && (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setEditSave({ id: asset.id, title: asset.title + ' (副本)' });
                              setEditSaveTitle(asset.title + ' (副本)');
                            }}
                            className="p-1.5 rounded-md hover:bg-[rgba(59,130,246,0.15)] text-[#71717A] hover:text-[#60A5FA] transition-all"
                            title="编辑后另存"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedRecord && (
            <div className="hidden lg:block w-[45%] shrink-0">
              <div className="bg-[#111113] rounded-xl border border-[rgba(255,255,255,0.06)] sticky top-4 max-h-[calc(100vh-120px)] overflow-y-auto">
                <div className="sticky top-0 bg-[#111113] z-10 p-4 pb-3 border-b border-[rgba(255,255,255,0.06)] flex items-center justify-between">
                  <h2 className="text-base font-semibold text-[#FAFAFA] truncate flex-1 mr-3">{selectedRecord.title}</h2>
                  <button onClick={() => setSelectedId(null)} className="text-[#71717A] hover:text-[#FAFAFA] shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="p-4 space-y-5">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[#71717A] block mb-0.5">分类</span>
                      <span className="text-[#A1A1AA]">{selectedRecord.category}</span>
                    </div>
                    <div>
                      <span className="text-[#71717A] block mb-0.5">阶段</span>
                      <span className="text-[#A1A1AA]">{PHASE_LABELS[selectedRecord.phase] || selectedRecord.phase}</span>
                    </div>
                    <div>
                      <span className="text-[#71717A] block mb-0.5">来源</span>
                      <span className="text-[#A1A1AA]">{selectedRecord.source === 'system-template' ? '系统模板' : '用户生成'}</span>
                    </div>
                    <div>
                      <span className="text-[#71717A] block mb-0.5">创建时间</span>
                      <span className="text-[#A1A1AA]">{new Date(selectedRecord.createdAt).toLocaleString('zh-CN')}</span>
                    </div>
                    {selectedRecord.projectId && (
                      <div className="col-span-2">
                        <span className="text-[#71717A] block mb-0.5">关联项目</span>
                        <Link href={`/projects/${selectedRecord.projectId}`} className="text-[#60A5FA] hover:underline">
                          {selectedRecord.projectId}
                        </Link>
                      </div>
                    )}
                  </div>

                  {selectedRecord.score !== undefined && selectedRecord.scoreDetails && (
                    <div className="p-3 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)]">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-[#FAFAFA]">综合评分</span>
                        <span className={`text-sm font-bold ${getScoreColor(selectedRecord.score)}`}>{selectedRecord.score}分</span>
                      </div>
                      <div className="h-1.5 w-full bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden mb-2">
                        <div
                          className={`h-full rounded-full ${
                            selectedRecord.score >= 90 ? 'bg-[#10B981]' :
                            selectedRecord.score >= 80 ? 'bg-[#3B82F6]' :
                            selectedRecord.score >= 70 ? 'bg-[#F59E0B]' : 'bg-[#EF4444]'
                          }`}
                          style={{ width: `${selectedRecord.score}%` }}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                        <div className="flex justify-between"><span className="text-[#71717A]">结构</span><span className={getScoreColor(selectedRecord.scoreDetails.dimensions.structure)}>{selectedRecord.scoreDetails.dimensions.structure}</span></div>
                        <div className="flex justify-between"><span className="text-[#71717A]">专业度</span><span className={getScoreColor(selectedRecord.scoreDetails.dimensions.professionalism)}>{selectedRecord.scoreDetails.dimensions.professionalism}</span></div>
                        <div className="flex justify-between"><span className="text-[#71717A]">可执行</span><span className={getScoreColor(selectedRecord.scoreDetails.dimensions.executability)}>{selectedRecord.scoreDetails.dimensions.executability}</span></div>
                        <div className="flex justify-between"><span className="text-[#71717A]">执行率</span><span className={getScoreColor(selectedRecord.scoreDetails.dimensions.executionSuccess)}>{selectedRecord.scoreDetails.dimensions.executionSuccess}</span></div>
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="text-xs font-medium text-[#FAFAFA] mb-2">原始需求</h3>
                    <p className="text-xs text-[#A1A1AA] whitespace-pre-wrap break-all leading-relaxed bg-[rgba(255,255,255,0.02)] rounded-lg p-3 border border-[rgba(255,255,255,0.06)]">
                      {selectedRecord.input}
                    </p>
                  </div>

                  {selectedRecord.clarifications.length > 0 && (
                    <div>
                      <h3 className="text-xs font-medium text-[#FAFAFA] mb-2">澄清过程</h3>
                      <div className="space-y-1.5">
                        {selectedRecord.clarifications.map((q, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs">
                            <span className="text-[#F59E0B] shrink-0">Q{i + 1}:</span>
                            <span className="text-[#A1A1AA]">{q}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-medium text-[#FAFAFA]">完整 Prompt</h3>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleSelectAllPrompt}
                          className="text-[10px] text-[#71717A] hover:text-[#A1A1AA] transition-colors"
                        >
                          全选
                        </button>
                        <button
                          onClick={() => handleCopy(selectedRecord.fullPrompt, 'drawer')}
                          className="inline-flex items-center gap-1 text-[10px] text-[#60A5FA] hover:text-[#93C5FD] transition-colors"
                        >
                          {copiedId === 'drawer' ? '✓ 已复制' : '复制'}
                        </button>
                      </div>
                    </div>
                    <pre
                      ref={promptRef}
                      className="text-xs text-[#A1A1AA] whitespace-pre-wrap break-all leading-relaxed bg-[#070707] rounded-lg p-4 border border-[rgba(255,255,255,0.1)] max-h-[400px] overflow-y-auto select-text font-mono"
                    >
                      {selectedRecord.fullPrompt}
                    </pre>
                  </div>

                  <div>
                    <h3 className="text-xs font-medium text-[#FAFAFA] mb-2">使用记录</h3>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="p-2 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] text-center">
                        <div className="text-[#71717A] text-[10px] mb-0.5">执行状态</div>
                        <div className={selectedRecord.executionUsed ? (selectedRecord.executionSuccess ? 'text-[#10B981]' : 'text-[#EF4444]') : 'text-[#71717A]'}>
                          {selectedRecord.executionUsed ? (selectedRecord.executionSuccess ? '成功' : '未成功') : '未执行'}
                        </div>
                      </div>
                      <div className="p-2 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] text-center">
                        <div className="text-[#71717A] text-[10px] mb-0.5">评分</div>
                        <div className={selectedRecord.rating ? 'text-[#F59E0B]' : 'text-[#71717A]'}>
                          {selectedRecord.rating ? `${'★'.repeat(selectedRecord.rating)}` : '未评分'}
                        </div>
                      </div>
                      <div className="p-2 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] text-center">
                        <div className="text-[#71717A] text-[10px] mb-0.5">反馈</div>
                        <div className={
                          selectedRecord.feedback === 'excellent' ? 'text-[#10B981]' :
                          selectedRecord.feedback === 'average' ? 'text-[#F59E0B]' :
                          selectedRecord.feedback === 'failed' ? 'text-[#EF4444]' : 'text-[#71717A]'
                        }>
                          {selectedRecord.feedback === 'excellent' ? '优秀' :
                           selectedRecord.feedback === 'average' ? '一般' :
                           selectedRecord.feedback === 'failed' ? '失败' : '无'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {!selectedRecord.feedback && selectedRecord.source === 'user-generated' && (
                    <div className="p-3 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)]">
                      <h3 className="text-xs font-medium text-[#FAFAFA] mb-2">执行效果如何？</h3>
                      <div className="grid grid-cols-3 gap-2">
                        <button onClick={() => handleFeedback('excellent')} className="px-2 py-1.5 rounded-lg bg-[rgba(16,185,129,0.15)] border border-[rgba(16,185,129,0.25)] text-[#10B981] text-xs hover:bg-[rgba(16,185,129,0.25)] transition-all">优秀</button>
                        <button onClick={() => handleFeedback('average')} className="px-2 py-1.5 rounded-lg bg-[rgba(245,158,11,0.15)] border border-[rgba(245,158,11,0.25)] text-[#F59E0B] text-xs hover:bg-[rgba(245,158,11,0.25)] transition-all">一般</button>
                        <button onClick={() => handleFeedback('failed')} className="px-2 py-1.5 rounded-lg bg-[rgba(239,68,68,0.15)] border border-[rgba(239,68,68,0.25)] text-[#EF4444] text-xs hover:bg-[rgba(239,68,68,0.25)] transition-all">失败</button>
                      </div>
                    </div>
                  )}

                  {selectedRecord.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedRecord.tags.map(tag => (
                        <span key={tag} className="px-2 py-0.5 text-[10px] rounded-full bg-[rgba(139,92,246,0.1)] text-[#A78BFA] border border-[rgba(139,92,246,0.2)]">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="pt-4 border-t border-[rgba(255,255,255,0.06)] space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleCopy(selectedRecord.fullPrompt, 'action-copy')}
                        className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#070707] border border-[rgba(255,255,255,0.1)] text-[#A1A1AA] hover:text-[#FAFAFA] text-xs transition-all"
                      >
                        {copiedId === 'action-copy' ? (
                          <><svg className="w-3.5 h-3.5 text-[#10B981]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>已复制</>
                        ) : (
                          <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>复制</>
                        )}
                      </button>
                      <button
                        onClick={() => sendToPlayground(selectedRecord)}
                        className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6] text-white text-xs hover:shadow-lg transition-all"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        发送到 Playground
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => handleToggleFavorite(selectedRecord.id, selectedRecord.favorite)}
                        className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg border text-xs transition-all ${
                          selectedRecord.favorite
                            ? 'bg-[rgba(245,158,11,0.15)] text-[#F59E0B] border-[rgba(245,158,11,0.25)]'
                            : 'bg-[#070707] border-[rgba(255,255,255,0.1)] text-[#71717A] hover:text-[#FAFAFA]'
                        }`}
                      >
                        <svg className="w-3.5 h-3.5" fill={selectedRecord.favorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                        {selectedRecord.favorite ? '取消收藏' : '收藏'}
                      </button>
                      <button
                        onClick={() => {
                          setEditSave({ id: selectedRecord.id, title: selectedRecord.title });
                          setEditSaveTitle(selectedRecord.title);
                        }}
                        className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg bg-[#070707] border border-[rgba(255,255,255,0.1)] text-[#71717A] hover:text-[#FAFAFA] text-xs transition-all"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        编辑另存
                      </button>
                      <button
                        onClick={() => handleDelete(selectedRecord.id)}
                        className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] text-[#EF4444] text-xs hover:bg-[rgba(239,68,68,0.2)] transition-all"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        删除
                      </button>
                    </div>
                    {selectedRecord.source === 'user-generated' && (
                      <Link
                        href={`/prompt?idea=${encodeURIComponent(selectedRecord.input)}`}
                        className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#070707] border border-[rgba(255,255,255,0.1)] text-[#71717A] hover:text-[#A78BFA] text-xs transition-all w-full"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        重新生成
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {showRefinement && refinementResult && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-[#111113] rounded-xl border border-[rgba(255,255,255,0.06)] max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-5 border-b border-[rgba(255,255,255,0.06)] flex items-center justify-between">
                <h2 className="text-lg font-bold text-[#FAFAFA]">智能优化结果</h2>
                <button onClick={() => setShowRefinement(false)} className="text-[#71717A] hover:text-[#FAFAFA]">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-[#FAFAFA] mb-2">问题分析</h3>
                  <ul className="space-y-1">{refinementResult.originalIssues.map((issue, idx) => <li key={idx} className="text-sm text-[#A1A1AA]">• {issue}</li>)}</ul>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-[#FAFAFA] mb-2">优化策略</h3>
                  <p className="text-sm text-[#A1A1AA] whitespace-pre-wrap">{refinementResult.strategy}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-[#FAFAFA] mb-2">改进点</h3>
                  <ul className="space-y-1">{refinementResult.improvements.map((imp, idx) => <li key={idx} className="text-sm text-[#10B981]">✓ {imp}</li>)}</ul>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-[#FAFAFA] mb-2">优化后的 Prompt</h3>
                  <pre className="text-xs text-[#A1A1AA] whitespace-pre-wrap bg-[#070707] border border-[rgba(255,255,255,0.1)] rounded-lg p-4 max-h-60 overflow-y-auto">{refinementResult.improvedPrompt}</pre>
                </div>
                <div className="flex gap-3 justify-end">
                  <button onClick={() => setShowRefinement(false)} className="px-4 py-2 rounded-lg bg-[#070707] border border-[rgba(255,255,255,0.1)] text-[#71717A] hover:text-[#FAFAFA] text-sm transition-all">取消</button>
                  <button onClick={handleSaveImproved} className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6] text-white text-sm hover:shadow-lg transition-all">保存为新版本</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {editSave && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-[#111113] rounded-xl border border-[rgba(255,255,255,0.06)] max-w-md w-full p-5">
              <h2 className="text-lg font-bold text-[#FAFAFA] mb-4">保存到资产库</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-[#71717A] block mb-1">标题</label>
                  <input
                    type="text"
                    value={editSaveTitle}
                    onChange={e => setEditSaveTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-[#070707] border border-[rgba(255,255,255,0.1)] rounded-lg text-[#FAFAFA] text-sm focus:border-[rgba(139,92,246,0.5)] focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-3 justify-end mt-5">
                <button onClick={() => { setEditSave(null); setEditSaveTitle(''); }} className="px-4 py-2 rounded-lg bg-[#070707] border border-[rgba(255,255,255,0.1)] text-[#71717A] hover:text-[#FAFAFA] text-sm transition-all">取消</button>
                <button onClick={handleEditSave} className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6] text-white text-sm hover:shadow-lg transition-all">保存</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
