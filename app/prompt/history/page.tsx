'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  getPromptHistory,
  getSystemTemplates,
  toggleFavorite,
  toggleArchive,
  deletePrompt,
  updatePromptFeedback,
  savePromptVersion,
  getVersionChain,
  rollbackToVersion,
  suggestVersionUpgrade,
  PromptAsset,
  PromptPhase,
} from '@/lib/prompt/history';
import { refinePrompt, RefinementResult } from '@/lib/prompt/refiner';
import { calculatePromptScore } from '@/lib/prompt/scorer';
import { loadSkills, removeSkill, type Skill } from '@/lib/session/skillStore';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

type TabKey = 'drafts' | 'verified' | 'skills';
type SortKey = 'recent' | 'score' | 'usage' | 'success';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'skills', label: 'Skills' },
  { key: 'verified', label: 'Verified' },
  { key: 'drafts', label: 'Drafts' },
];

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'recent', label: '最近创建' },
  { key: 'score', label: '评分最高' },
  { key: 'usage', label: '使用最多' },
  { key: 'success', label: '成功率最高' },
];

const PHASE_LABELS: Record<string, string> = {
  idea: '想法',
  architecture: '架构',
  implementation: '实现',
  optimization: '优化',
  debug: '调试',
  deployment: '部署',
};

const PHASE_USAGE_TIPS: Record<string, { suitable: string; notSuitable: string; prerequisite: string }> = {
  idea: { suitable: '产品早期探索、验证方向可行性', notSuitable: '已有明确需求的直接开发', prerequisite: '无特殊要求' },
  architecture: { suitable: '确定技术方案、规划系统架构、团队技术对齐', notSuitable: '简单页面修改、样式调整', prerequisite: '已完成需求分析' },
  implementation: { suitable: '具体功能开发、MVP 构建、页面实现', notSuitable: '架构决策、性能调优', prerequisite: '已确定技术栈和架构方案' },
  optimization: { suitable: '性能优化、代码重构、体验提升', notSuitable: '新功能开发、初次搭建', prerequisite: '已有可运行的代码基础' },
  debug: { suitable: 'Bug 修复、错误排查、异常处理', notSuitable: '新功能开发、架构设计', prerequisite: '能复现问题或提供错误信息' },
  deployment: { suitable: '生产环境部署、CI/CD 配置、域名 SSL', notSuitable: '本地开发、功能测试', prerequisite: '代码已通过测试' },
};

const FLOW_STEPS = [
  { step: 1, text: '在 AI 导出中生成上下文', href: '/prompt' },
  { step: 2, text: '复制到 AI 工具执行' },
  { step: 3, text: '验证通过 → 沉淀为 Skill' },
];

export default function PromptHistoryPage() {
  const [allAssets, setAllAssets] = useState<PromptAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('skills');
  const [sortBy, setSortBy] = useState<SortKey>('recent');
  const [phaseFilter, setPhaseFilter] = useState<string>('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [refinementResult, setRefinementResult] = useState<RefinementResult | null>(null);
  const [showRefinement, setShowRefinement] = useState(false);
  const [refining, setRefining] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showFlowGuide, setShowFlowGuide] = useState(true);
  const [editSave, setEditSave] = useState<{ id: string; title: string } | null>(null);
  const [editSaveTitle, setEditSaveTitle] = useState('');
  const [versionChain, setVersionChain] = useState<PromptAsset[]>([]);
  const [showDiff, setShowDiff] = useState(false);
  const [diffTarget, setDiffTarget] = useState<{ a: PromptAsset; b: PromptAsset } | null>(null);
  const [upgradeSuggestion, setUpgradeSuggestion] = useState<{
    shouldUpgrade: boolean;
    reason: string;
    suggestions: string[];
  } | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [deleteSkillConfirm, setDeleteSkillConfirm] = useState<string | null>(null);
  const promptRef = useRef<HTMLPreElement>(null);

  const loadAssets = useCallback(async () => {
    setLoading(true);
    try {
      const records = await getPromptHistory({ limit: 200 });
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const draftsToDelete = records.filter(
        a => a.source === 'user-generated' && !a.feedback && !a.executionSuccess && new Date(a.createdAt).getTime() < sevenDaysAgo
      );
      for (const draft of draftsToDelete) {
        await deletePrompt(draft.id);
      }
      const cleaned = draftsToDelete.length > 0
        ? records.filter(a => !draftsToDelete.find(d => d.id === a.id))
        : records;
      setAllAssets(cleaned);
      setSkills(loadSkills());
    } catch (e) {
      console.error('[SkillVault] Load failed:', e);
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
      case 'drafts':
        list = allAssets.filter(a => a.source === 'user-generated' && !a.feedback && !a.executionSuccess);
        break;
      case 'verified':
        list = allAssets.filter(a => a.feedback === 'excellent' || a.executionSuccess === true);
        break;
      case 'skills':
        list = [];
        break;
    }
    if (phaseFilter) {
      list = list.filter(a => a.phase === phaseFilter);
    }
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(
        a =>
          a.title.toLowerCase().includes(s) ||
          a.input.toLowerCase().includes(s) ||
          a.fullPrompt.toLowerCase().includes(s) ||
          a.tags.some(t => t.toLowerCase().includes(s)) ||
          (a.phase && a.phase.toLowerCase().includes(s)) ||
          (a.projectId && a.projectId.toLowerCase().includes(s))
      );
    }
    switch (sortBy) {
      case 'score':
        list = [...list].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
        break;
      case 'usage':
        list = [...list].sort((a, b) => (b.executionUsed ? 1 : 0) - (a.executionUsed ? 1 : 0));
        break;
      case 'success':
        list = [...list].sort((a, b) => (b.executionSuccess ? 1 : 0) - (a.executionSuccess ? 1 : 0));
        break;
      default:
        break;
    }
    return list;
  })();

  const selectedRecord = selectedId
    ? [...allAssets, ...systemTemplates].find(a => a.id === selectedId)
    : null;

  useEffect(() => {
    if (!selectedId || !selectedRecord || selectedRecord.source === 'system-template') {
      setVersionChain([]);
      setUpgradeSuggestion(null);
      return;
    }
    getVersionChain(selectedId).then(chain => setVersionChain(chain)).catch(() => setVersionChain([]));
    suggestVersionUpgrade(selectedId).then(s => setUpgradeSuggestion(s)).catch(() => setUpgradeSuggestion(null));
  }, [selectedId, selectedRecord?.feedback, selectedRecord?.score]);

  const handleToggleFavorite = async (id: string, current: boolean) => {
    await toggleFavorite(id, !current);
    await loadAssets();
  };

  const handleToggleArchive = async (id: string, current?: boolean) => {
    await toggleArchive(id, !current);
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

      // Compute before/after scores
      const originalScore = calculatePromptScore({
        prompt: selectedRecord.fullPrompt,
        executionSuccess: selectedRecord.executionSuccess,
        userFeedback: selectedRecord.feedback,
      });
      const improvedScore = calculatePromptScore({
        prompt: result.improvedPrompt,
        executionSuccess: selectedRecord.executionSuccess,
        userFeedback: selectedRecord.feedback,
      });

      setRefinementResult({
        ...result,
        originalScore,
        improvedScore,
      });
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
      await savePromptVersion(selectedId, refinementResult.improvedPrompt, '智能优化');
      setShowRefinement(false);
      setRefinementResult(null);
      await loadAssets();
    } catch (e) {
      console.error('[PromptSave] Failed:', e);
    }
  };

  const handleRollback = async (targetId: string) => {
    try {
      const rolled = await rollbackToVersion(targetId);
      setSelectedId(rolled.id);
      await loadAssets();
    } catch (e) {
      console.error('[Rollback] Failed:', e);
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
    navigator.clipboard.writeText(asset.fullPrompt);
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
    <div className="page-shell py-10 sm:py-14">
      <div className="max-w-7xl mx-auto">
        {showFlowGuide && (
          <div className="mb-6 p-4 rounded-xl bg-violet-500/5 border border-violet-500/15">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-violet-300">使用流程</h3>
              <button
                type="button"
                onClick={() => setShowFlowGuide(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] text-xs cursor-pointer"
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

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <span className="badge badge-violet mb-3">Skill Vault</span>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Prompt 历史</h1>
            <p className="text-sm text-[var(--text-secondary)]">管理已验证的 Prompt 和沉淀的 Skill</p>
          </div>
          <Link href="/prompt" className="btn-primary">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            生成新 Prompt
          </Link>
        </div>

        <div className="flex items-center gap-1 mb-4 border-b border-[var(--border)] overflow-x-auto">
          {TABS.map(tab => (
            <button
              type="button"
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setSelectedId(null); }}
              className={`px-4 py-2.5 text-sm font-medium transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                activeTab === tab.key
                  ? 'text-violet-300 border-violet-500'
                  : 'text-[var(--text-muted)] border-transparent hover:text-[var(--text-secondary)]'
              }`}
            >
              {tab.label}
              {tab.key === 'skills' && (
                <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-[rgba(139,92,246,0.15)] text-[#A78BFA]">
                  {skills.length}
                </span>
              )}
              {tab.key === 'verified' && (
                <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-[rgba(16,185,129,0.15)] text-[#10B981]">
                  {allAssets.filter(a => a.feedback === 'excellent' || a.executionSuccess === true).length}
                </span>
              )}
              {tab.key === 'drafts' && (
                <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-[rgba(255,255,255,0.05)] text-[#71717A]">
                  {allAssets.filter(a => a.source === 'user-generated' && !a.feedback && !a.executionSuccess).length}
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
                  placeholder="搜索 Prompt（标题、内容、标签、阶段、项目）..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-[#111113] border border-[rgba(255,255,255,0.1)] rounded-lg text-[#FAFAFA] text-sm focus:border-[rgba(139,92,246,0.5)] focus:outline-none"
                />
              </div>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as SortKey)}
                className="px-3 py-2 bg-[#111113] border border-[rgba(255,255,255,0.1)] rounded-lg text-[#A1A1AA] text-xs focus:border-[rgba(139,92,246,0.5)] focus:outline-none"
              >
                {SORT_OPTIONS.map(opt => (
                  <option key={opt.key} value={opt.key}>{opt.label}</option>
                ))}
              </select>
              <select
                value={phaseFilter}
                onChange={e => setPhaseFilter(e.target.value)}
                className="px-3 py-2 bg-[#111113] border border-[rgba(255,255,255,0.1)] rounded-lg text-[#A1A1AA] text-xs focus:border-[rgba(139,92,246,0.5)] focus:outline-none"
              >
                <option value="">全部阶段</option>
                {Object.entries(PHASE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            {loading ? (
              <div className="py-16 text-center">
                <div className="animate-spin w-8 h-8 border-2 border-[#8B5CF6] border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-[#71717A]">加载中...</p>
              </div>
            ) : activeTab === 'skills' ? (
              skills.length === 0 ? (
                <div className="py-16 text-center bg-[#111113] rounded-xl border border-[rgba(255,255,255,0.06)]">
                  <p className="text-[#71717A] mb-2">还没有沉淀的 Skill</p>
                  <p className="text-[10px] text-[#52525B] mb-4">在 AI 导出中生成上下文后，可沉淀为可复用 Skill</p>
                  <Link href="/prompt" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#8B5CF6] text-white text-sm">
                    前往 AI 导出
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {skills.map(skill => (
                    <div
                      key={skill.id}
                      className="group p-4 rounded-lg border border-[rgba(139,92,246,0.2)] bg-[rgba(139,92,246,0.03)] hover:border-[rgba(139,92,246,0.4)] transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0 pr-4">
                          <div className="flex items-center gap-2 mb-1.5">
                            <svg className="w-3 h-3 text-amber-300" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                            <h3 className="text-[#FAFAFA] font-medium text-sm truncate">{skill.title}</h3>
                            <span className="px-1.5 py-0.5 text-[10px] rounded bg-[rgba(139,92,246,0.15)] text-[#A78BFA]">{skill.category}</span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-[#71717A]">
                            <span>使用 {skill.usageCount} 次</span>
                            <span>成功率 {Math.round(skill.successRate * 100)}%</span>
                            <span>稳定性 {Math.round(skill.stabilityScore * 100)}%</span>
                            <span>{formatDistanceToNow(new Date(skill.promotedAt), { addSuffix: true, locale: zhCN })}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(skill.prompt);
                            }}
                            className="p-1.5 rounded text-[#71717A] hover:text-[#A78BFA] hover:bg-[rgba(139,92,246,0.1)] transition-all"
                            title="复制 Prompt"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setDeleteSkillConfirm(skill.id)}
                            className="p-1.5 rounded text-[#71717A] hover:text-[#EF4444] hover:bg-[rgba(239,68,68,0.1)] transition-all opacity-0 group-hover:opacity-100"
                            title="删除 Skill"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      {deleteSkillConfirm === skill.id && (
                        <div className="mt-3 pt-3 border-t border-[rgba(255,255,255,0.06)] flex items-center justify-end gap-2">
                          <span className="text-[11px] text-[#71717A] mr-auto">确定删除此 Skill？</span>
                          <button
                            onClick={() => setDeleteSkillConfirm(null)}
                            className="px-3 py-1 text-[11px] rounded border border-[rgba(255,255,255,0.1)] text-[#71717A] hover:text-[#A1A1AA]"
                          >
                            取消
                          </button>
                          <button
                            onClick={() => {
                              removeSkill(skill.id);
                              setSkills(loadSkills());
                              setDeleteSkillConfirm(null);
                            }}
                            className="px-3 py-1 text-[11px] rounded bg-[rgba(239,68,68,0.15)] text-[#EF4444] hover:bg-[rgba(239,68,68,0.25)]"
                          >
                            删除
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
            ) : filteredAssets.length === 0 ? (
              <div className="py-16 text-center bg-[#111113] rounded-xl border border-[rgba(255,255,255,0.06)]">
                <p className="text-[#71717A] mb-4">
                  {activeTab === 'drafts' ? '没有未验证的草稿' :
                   activeTab === 'verified' ? '还没有已验证的 Prompt' : '暂无记录'}
                </p>
                {activeTab === 'drafts' && (
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
                          {asset.provenance && (
                            <span className={`px-1.5 py-0.5 text-[10px] rounded font-medium ${
                              asset.provenance.realExecution && asset.executionSuccess !== false
                                ? 'bg-[rgba(16,185,129,0.15)] text-[#10B981]'
                                : asset.executionSuccess === false
                                  ? 'bg-[rgba(239,68,68,0.15)] text-[#EF4444]'
                                  : 'bg-[rgba(245,158,11,0.15)] text-[#F59E0B]'
                            }`}>
                              {asset.provenance.realExecution && asset.executionSuccess !== false
                                ? 'Real Verified'
                                : asset.executionSuccess === false
                                  ? '🔴 Failed'
                                  : '🟡 Simulated'}
                            </span>
                          )}
                          {asset.provenance?.externalAgent && (
                            <span className="px-1.5 py-0.5 text-[10px] rounded bg-[rgba(255,255,255,0.05)] text-[#71717A]">
                              {asset.provenance.externalAgent}
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
                              {asset.executionSuccess ? '已执行' : '执行失败'}
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
                          {copiedId === 'drawer' ? '已复制' : '复制'}
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

                  {(() => {
                    const tips = PHASE_USAGE_TIPS[selectedRecord.phase];
                    if (!tips) return null;
                    return (
                      <div className="p-3 rounded-lg bg-[rgba(59,130,246,0.05)] border border-[rgba(59,130,246,0.15)]">
                        <h3 className="text-xs font-medium text-[#60A5FA] mb-2">使用建议</h3>
                        <div className="space-y-1.5 text-[11px]">
                          <p className="text-[#A1A1AA]"><span className="text-[#71717A]">适用于：</span>{tips.suitable}</p>
                          <p className="text-[#A1A1AA]"><span className="text-[#71717A]">不适用于：</span>{tips.notSuitable}</p>
                          <p className="text-[#A1A1AA]"><span className="text-[#71717A]">推荐前置：</span>{tips.prerequisite}</p>
                        </div>
                      </div>
                    );
                  })()}

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

                  {upgradeSuggestion?.shouldUpgrade && (
                    <div className="p-3 rounded-lg bg-[rgba(245,158,11,0.05)] border border-[rgba(245,158,11,0.2)]">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-4 h-4 text-[#F59E0B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                        <h3 className="text-xs font-medium text-[#F59E0B]">版本升级建议</h3>
                      </div>
                      <p className="text-[11px] text-[#A1A1AA] mb-2">{upgradeSuggestion.reason}</p>
                      <ul className="space-y-1 mb-3">
                        {upgradeSuggestion.suggestions.map((s, i) => (
                          <li key={i} className="text-[11px] text-[#71717A]">• {s}</li>
                        ))}
                      </ul>
                      <button
                        onClick={handleRefine}
                        disabled={refining}
                        className="w-full px-3 py-2 rounded-lg bg-[rgba(245,158,11,0.15)] border border-[rgba(245,158,11,0.25)] text-[#F59E0B] text-xs font-medium hover:bg-[rgba(245,158,11,0.25)] transition-all disabled:opacity-50"
                      >
                        {refining ? '生成中...' : '生成优化版本'}
                      </button>
                    </div>
                  )}

                  {versionChain.length > 1 && selectedRecord.source === 'user-generated' && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-medium text-[#FAFAFA]">版本演化链</h3>
                        {versionChain.length >= 2 && (
                          <button
                            onClick={() => {
                              const sorted = [...versionChain].sort((a, b) => (a.version || 1) - (b.version || 1));
                              if (sorted.length >= 2) {
                                setDiffTarget({ a: sorted[sorted.length - 2], b: sorted[sorted.length - 1] });
                                setShowDiff(true);
                              }
                            }}
                            className="text-[10px] text-[#60A5FA] hover:text-[#93C5FD] transition-colors"
                          >
                            查看最新差异
                          </button>
                        )}
                      </div>
                      <div className="relative pl-4">
                        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-[rgba(139,92,246,0.3)]" />
                        {versionChain.map((v, i) => {
                          const isCurrent = v.id === selectedRecord.id;
                          return (
                            <div key={v.id} className="relative flex items-start gap-3 pb-3 last:pb-0">
                              <div className={`relative z-10 w-3.5 h-3.5 rounded-full border-2 shrink-0 mt-0.5 ${
                                isCurrent
                                  ? 'bg-[#8B5CF6] border-[#A78BFA]'
                                  : 'bg-[#111113] border-[rgba(139,92,246,0.4)]'
                              }`} />
                              <div className={`flex-1 min-w-0 p-2 rounded-lg border transition-all cursor-pointer ${
                                isCurrent
                                  ? 'bg-[rgba(139,92,246,0.08)] border-[rgba(139,92,246,0.3)]'
                                  : 'bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.06)] hover:border-[rgba(139,92,246,0.3)]'
                              }`} onClick={() => setSelectedId(v.id)}>
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] font-medium text-[#A78BFA]">v{v.version || 1}</span>
                                  {isCurrent && <span className="text-[9px] px-1 py-0.5 rounded bg-[rgba(139,92,246,0.2)] text-[#A78BFA]">当前</span>}
                                  {v.score !== undefined && (
                                    <span className={`text-[10px] ${getScoreColor(v.score)}`}>{v.score}分</span>
                                  )}
                                  {v.feedback && (
                                    <span className={`text-[10px] ${
                                      v.feedback === 'excellent' ? 'text-[#10B981]' :
                                      v.feedback === 'average' ? 'text-[#F59E0B]' :
                                      'text-[#EF4444]'
                                    }`}>
                                      {v.feedback === 'excellent' ? '优' : v.feedback === 'average' ? '中' : '差'}
                                    </span>
                                  )}
                                </div>
                                {v.mutationReason && (
                                  <div className="text-[10px] text-[#71717A] mt-0.5 truncate">{v.mutationReason}</div>
                                )}
                                {v.diffSummary && (
                                  <div className="text-[10px] text-[#52525B] mt-0.5 truncate">{v.diffSummary}</div>
                                )}
                              </div>
                              {!isCurrent && (
                                <div className="flex gap-1 shrink-0 mt-0.5">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const currentIdx = versionChain.findIndex(c => c.id === selectedRecord.id);
                                      if (currentIdx > i) {
                                        setDiffTarget({ a: v, b: versionChain[currentIdx] });
                                      } else if (currentIdx < versionChain.length - 1) {
                                        setDiffTarget({ a: v, b: versionChain[currentIdx] });
                                      }
                                      setShowDiff(true);
                                    }}
                                    className="p-1 rounded hover:bg-[rgba(59,130,246,0.15)] text-[#71717A] hover:text-[#60A5FA] transition-all"
                                    title="查看差异"
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRollback(v.id);
                                    }}
                                    className="p-1 rounded hover:bg-[rgba(245,158,11,0.15)] text-[#71717A] hover:text-[#F59E0B] transition-all"
                                    title="回滚到此版本"
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                    </svg>
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
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
                    <div className="grid grid-cols-4 gap-2">
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
                        onClick={() => handleToggleArchive(selectedRecord.id, selectedRecord.archived)}
                        className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg border text-xs transition-all ${
                          selectedRecord.archived
                            ? 'bg-[rgba(59,130,246,0.15)] text-[#60A5FA] border-[rgba(59,130,246,0.25)]'
                            : 'bg-[#070707] border-[rgba(255,255,255,0.1)] text-[#71717A] hover:text-[#FAFAFA]'
                        }`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                        </svg>
                        {selectedRecord.archived ? '取消归档' : '归档'}
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
                  <ul className="space-y-1">{refinementResult.improvements.map((imp, idx) => (
                    <li key={idx} className="text-sm text-[#10B981] flex items-start gap-1.5">
                      <svg className="w-3.5 h-3.5 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      <span>{imp}</span>
                    </li>
                  ))}</ul>
                </div>

                {refinementResult.originalScore && refinementResult.improvedScore && (
                  <div className="p-4 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)]">
                    <h3 className="text-sm font-medium text-[#FAFAFA] mb-3">评分对比</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <p className="text-xs text-[#71717A] mb-1">优化前</p>
                        <p className={`text-2xl font-bold ${getScoreColor(refinementResult.originalScore.overall)}`}>
                          {refinementResult.originalScore.overall}
                        </p>
                        <div className="grid grid-cols-2 gap-1 text-[10px] mt-2 text-[#71717A]">
                          <div>结构: <span className={getScoreColor(refinementResult.originalScore.dimensions.structure)}>{refinementResult.originalScore.dimensions.structure}</span></div>
                          <div>专业: <span className={getScoreColor(refinementResult.originalScore.dimensions.professionalism)}>{refinementResult.originalScore.dimensions.professionalism}</span></div>
                          <div>可执行: <span className={getScoreColor(refinementResult.originalScore.dimensions.executability)}>{refinementResult.originalScore.dimensions.executability}</span></div>
                          <div>执行率: <span className={getScoreColor(refinementResult.originalScore.dimensions.executionSuccess)}>{refinementResult.originalScore.dimensions.executionSuccess}</span></div>
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-[#71717A] mb-1">优化后</p>
                        <p className={`text-2xl font-bold ${getScoreColor(refinementResult.improvedScore.overall)}`}>
                          {refinementResult.improvedScore.overall}
                        </p>
                        <div className="grid grid-cols-2 gap-1 text-[10px] mt-2 text-[#71717A]">
                          <div>结构: <span className={getScoreColor(refinementResult.improvedScore.dimensions.structure)}>{refinementResult.improvedScore.dimensions.structure}</span></div>
                          <div>专业: <span className={getScoreColor(refinementResult.improvedScore.dimensions.professionalism)}>{refinementResult.improvedScore.dimensions.professionalism}</span></div>
                          <div>可执行: <span className={getScoreColor(refinementResult.improvedScore.dimensions.executability)}>{refinementResult.improvedScore.dimensions.executability}</span></div>
                          <div>执行率: <span className={getScoreColor(refinementResult.improvedScore.dimensions.executionSuccess)}>{refinementResult.improvedScore.dimensions.executionSuccess}</span></div>
                        </div>
                      </div>
                    </div>
                    {refinementResult.improvedScore.overall > refinementResult.originalScore.overall && (
                      <p className="text-center text-xs text-[#10B981] mt-3 font-medium">
                        +{refinementResult.improvedScore.overall - refinementResult.originalScore.overall} 分提升
                      </p>
                    )}
                    {refinementResult.improvedScore.overall <= refinementResult.originalScore.overall && (
                      <p className="text-center text-xs text-[#71717A] mt-3">
                        结构已优化，执行效果取决于实际使用
                      </p>
                    )}
                  </div>
                )}

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

        {showDiff && diffTarget && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-[#111113] rounded-xl border border-[rgba(255,255,255,0.06)] max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-5 border-b border-[rgba(255,255,255,0.06)] flex items-center justify-between shrink-0">
                <h2 className="text-lg font-bold text-[#FAFAFA]">
                  版本差异：v{diffTarget.a.version || 1} → v{diffTarget.b.version || 1}
                </h2>
                <button onClick={() => setShowDiff(false)} className="text-[#71717A] hover:text-[#FAFAFA]">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                {(() => {
                  const aLines = diffTarget.a.fullPrompt.split('\n');
                  const bLines = diffTarget.b.fullPrompt.split('\n');
                  const maxLen = Math.max(aLines.length, bLines.length);
                  const diffLines: { type: 'same' | 'added' | 'removed' | 'changed'; a: string; b: string; lineNum: number }[] = [];
                  for (let i = 0; i < maxLen; i++) {
                    const a = aLines[i] ?? '';
                    const b = bLines[i] ?? '';
                    let type: 'same' | 'added' | 'removed' | 'changed' = 'same';
                    if (a === b) type = 'same';
                    else if (!a && b) type = 'added';
                    else if (a && !b) type = 'removed';
                    else type = 'changed';
                    diffLines.push({ type, a, b, lineNum: i + 1 });
                  }
                  const changedLines = diffLines.filter(d => d.type !== 'same');
                  const displayLines = changedLines.length > 0 ? changedLines : diffLines.slice(0, 20);
                  return (
                    <div className="space-y-1">
                      {diffTarget.a.diffSummary && (
                        <div className="mb-3 p-2 rounded-lg bg-[rgba(139,92,246,0.05)] border border-[rgba(139,92,246,0.15)] text-[11px] text-[#A78BFA]">
                          {diffTarget.a.diffSummary}
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs font-medium text-[#EF4444] mb-2 flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                            </svg>
                            v{diffTarget.a.version || 1}
                          </div>
                          <pre className="text-[11px] text-[#A1A1AA] whitespace-pre-wrap bg-[#070707] rounded-lg p-3 border border-[rgba(255,255,255,0.1)] max-h-[50vh] overflow-y-auto font-mono">
                            {displayLines.map((d, i) => (
                              <div key={i} className={`${d.type !== 'same' ? 'bg-[rgba(239,68,68,0.1)]' : ''} px-1`}>
                                <span className="text-[#52525B] select-none mr-2 inline-block w-6 text-right">{d.lineNum}</span>
                                {d.a || ' '}
                              </div>
                            ))}
                          </pre>
                        </div>
                        <div>
                          <div className="text-xs font-medium text-[#10B981] mb-2 flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            v{diffTarget.b.version || 1}
                          </div>
                          <pre className="text-[11px] text-[#A1A1AA] whitespace-pre-wrap bg-[#070707] rounded-lg p-3 border border-[rgba(255,255,255,0.1)] max-h-[50vh] overflow-y-auto font-mono">
                            {displayLines.map((d, i) => (
                              <div key={i} className={`${d.type === 'added' || d.type === 'changed' ? 'bg-[rgba(16,185,129,0.1)]' : d.type === 'removed' ? 'bg-[rgba(239,68,68,0.05)]' : ''} px-1`}>
                                <span className="text-[#52525B] select-none mr-2 inline-block w-6 text-right">{d.lineNum}</span>
                                {d.type === 'removed' ? '' : d.b || ' '}
                              </div>
                            ))}
                          </pre>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
              <div className="p-4 border-t border-[rgba(255,255,255,0.06)] flex gap-3 justify-end shrink-0">
                <button
                  onClick={() => {
                    handleRollback(diffTarget.a.id);
                    setShowDiff(false);
                  }}
                  className="px-4 py-2 rounded-lg bg-[rgba(245,158,11,0.15)] border border-[rgba(245,158,11,0.25)] text-[#F59E0B] text-sm hover:bg-[rgba(245,158,11,0.25)] transition-all"
                >
                  回滚到 v{diffTarget.a.version || 1}
                </button>
                <button
                  onClick={() => setShowDiff(false)}
                  className="px-4 py-2 rounded-lg bg-[#070707] border border-[rgba(255,255,255,0.1)] text-[#71717A] hover:text-[#FAFAFA] text-sm transition-all"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
