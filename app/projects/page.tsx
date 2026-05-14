'use client';

import { useState, useCallback, useEffect } from 'react';
import { parseRepoUrl, fetchRepoMeta, fetchRepoTree, RepoMeta } from '@/lib/github/importer';
import { analyzeCodebase, CodeAnalysis } from '@/lib/github/codeAnalyzer';
import { analyzeMaturity, generateRecommendationPrompts, MaturityResult } from '@/lib/projects/maturityAnalyzer';
import { buildContextPack, ExportTarget } from '@/lib/export/contextPack';
import RepoInsights from '@/components/projects/RepoInsights';

const STORAGE_KEY = 'agentforge_saved_repos';

interface SavedRepo {
  id: string;
  url: string;
  meta: RepoMeta;
  analysis: CodeAnalysis;
  maturity: MaturityResult;
  recommendations: { title: string; prompt: string }[];
  savedAt: number;
}

function loadRepos(): SavedRepo[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveRepos(repos: SavedRepo[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(repos));
}

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const min = 60 * 1000;
  const hour = 60 * min;
  const day = 24 * hour;
  if (diff < min) return '刚刚';
  if (diff < hour) return `${Math.floor(diff / min)} 分钟前`;
  if (diff < day) return `${Math.floor(diff / hour)} 小时前`;
  if (diff < 30 * day) return `${Math.floor(diff / day)} 天前`;
  return new Date(ts).toLocaleDateString('zh-CN');
}

export default function ProjectsPage() {
  const [importUrl, setImportUrl] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState('');
  const [repos, setRepos] = useState<SavedRepo[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [copiedLabel, setCopiedLabel] = useState('');
  const [showImport, setShowImport] = useState(false);

  // Load saved repos on mount
  useEffect(() => {
    setRepos(loadRepos());
  }, []);

  const activeRepo = repos.find(r => r.id === activeId) || null;

  const handleImport = useCallback(async () => {
    try {
      setImportError('');
      setImportLoading(true);
      const { owner, repo } = parseRepoUrl(importUrl);
      const m = await fetchRepoMeta(owner, repo);
      const tree = await fetchRepoTree(owner, repo, m.defaultBranch);
      const a = analyzeCodebase(tree);
      const mat = analyzeMaturity(m, tree, a);
      const recs = generateRecommendationPrompts(a, mat);

      const id = `${owner}/${repo}`;
      const newRepo: SavedRepo = {
        id,
        url: `https://github.com/${owner}/${repo}`,
        meta: m,
        analysis: a,
        maturity: mat,
        recommendations: recs,
        savedAt: Date.now(),
      };

      setRepos(prev => {
        const filtered = prev.filter(r => r.id !== id);
        const updated = [newRepo, ...filtered];
        saveRepos(updated);
        return updated;
      });

      setActiveId(id);
      setImportUrl('');
      setShowImport(false);
    } catch (err: unknown) {
      setImportError(err instanceof Error ? err.message : '导入失败');
    } finally {
      setImportLoading(false);
    }
  }, [importUrl]);

  const handleRefresh = useCallback(async (repoId: string) => {
    const repo = repos.find(r => r.id === repoId);
    if (!repo) return;
    try {
      const { owner, repo: repoName } = parseRepoUrl(repo.url);
      const m = await fetchRepoMeta(owner, repoName);
      const tree = await fetchRepoTree(owner, repoName, m.defaultBranch);
      const a = analyzeCodebase(tree);
      const mat = analyzeMaturity(m, tree, a);
      const recs = generateRecommendationPrompts(a, mat);

      const updated: SavedRepo = { ...repo, meta: m, analysis: a, maturity: mat, recommendations: recs, savedAt: Date.now() };
      setRepos(prev => {
        const newList = prev.map(r => r.id === repoId ? updated : r);
        saveRepos(newList);
        return newList;
      });
    } catch { /* ignore */ }
  }, [repos]);

  const handleDelete = useCallback((repoId: string) => {
    setRepos(prev => {
      const updated = prev.filter(r => r.id !== repoId);
      saveRepos(updated);
      return updated;
    });
    if (activeId === repoId) setActiveId(null);
  }, [activeId]);

  const handleCopy = async (target: ExportTarget) => {
    if (!activeRepo) return;
    const text = buildContextPack(target, activeRepo.meta, activeRepo.analysis);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    const labels: Record<ExportTarget, string> = { claude: 'Claude', cursor: 'Cursor', gpt: 'GPT' };
    setCopiedLabel(`${labels[target]} 已复制`);
    setTimeout(() => setCopiedLabel(''), 2000);
  };

  return (
    <div className="min-h-[calc(100vh-80px)] py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">项目记忆</h1>
            <p className="mt-1 text-sm text-zinc-400">导入并管理你的 GitHub 仓库</p>
          </div>
          <button
            onClick={() => setShowImport(!showImport)}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 transition"
          >
            {showImport ? '取消' : '+ 导入仓库'}
          </button>
        </div>

        {/* Import Form */}
        {showImport && (
          <div className="mb-6 space-y-3">
            <input
              type="text"
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !importLoading) handleImport(); }}
              placeholder="https://github.com/user/repo"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-5 py-4 text-white placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
            />
            <button
              onClick={handleImport}
              disabled={importLoading || !importUrl.trim()}
              className="rounded-lg bg-violet-600 px-6 py-3 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-40 transition"
            >
              {importLoading ? '分析中...' : '导入并分析'}
            </button>
            {importError && (
              <div className="rounded-xl border border-red-800 bg-red-950 p-4">
                <p className="text-sm text-red-300">{importError}</p>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-6">
          {/* Left: Repo List */}
          <div className="w-72 shrink-0">
            {repos.length === 0 ? (
              <div className="text-center py-12 text-zinc-600">
                <div className="text-4xl mb-3">📦</div>
                <p className="text-sm">还没有导入过仓库</p>
                <p className="text-xs mt-1">点击"导入仓库"开始</p>
              </div>
            ) : (
              <div className="space-y-2">
                {repos.map(repo => (
                  <div
                    key={repo.id}
                    onClick={() => setActiveId(repo.id)}
                    className={`group relative rounded-xl border p-4 cursor-pointer transition-all ${
                      activeId === repo.id
                        ? 'border-violet-500 bg-violet-500/10'
                        : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white truncate">{repo.meta.owner}/{repo.meta.name}</p>
                        <p className="text-xs text-zinc-500 mt-0.5 truncate">{repo.meta.description || '无描述'}</p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(repo.id); }}
                        className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-opacity ml-2 shrink-0"
                        title="删除"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[10px] text-zinc-600">{repo.meta.language || '-'}</span>
                      <span className="text-[10px] text-zinc-600">⭐ {repo.meta.stars}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        repo.maturity.score >= 71 ? 'text-emerald-400 bg-emerald-500/10'
                        : repo.maturity.score >= 51 ? 'text-yellow-400 bg-yellow-500/10'
                        : 'text-red-400 bg-red-500/10'
                      }`}>{repo.maturity.score}分</span>
                    </div>
                    <p className="text-[10px] text-zinc-600 mt-1.5">
                      更新于 {formatRelativeTime(repo.savedAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Detail Panel */}
          <div className="flex-1 min-w-0">
            {activeRepo ? (
              <div className="space-y-6">
                <RepoInsights
                  repoMeta={activeRepo.meta}
                  codeAnalysis={activeRepo.analysis}
                  maturity={activeRepo.maturity}
                  recommendations={activeRepo.recommendations}
                  onRefresh={() => handleRefresh(activeRepo.id)}
                />

                {/* Export Section */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
                  <h3 className="text-sm font-semibold text-white mb-4">导出给 AI</h3>
                  <div className="flex items-center gap-3">
                    {(['claude', 'cursor', 'gpt'] as ExportTarget[]).map(target => {
                      const labels: Record<ExportTarget, string> = { claude: 'Claude', cursor: 'Cursor', gpt: 'GPT' };
                      return (
                        <button
                          key={target}
                          onClick={() => handleCopy(target)}
                          className="rounded-lg border border-zinc-700 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition"
                        >
                          复制给 {labels[target]}
                        </button>
                      );
                    })}
                    {copiedLabel && (
                      <span className="text-xs text-emerald-400">{copiedLabel}</span>
                    )}
                  </div>
                </div>

                {/* Session Memory */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
                  <h3 className="text-sm font-semibold text-white mb-3">会话记忆</h3>
                  <p className="text-sm text-zinc-500 mb-4">粘贴 Cursor / Claude / GPT 的对话记录，AI 自动提取技术决策和约束</p>
                  <SessionMemoryInput repoId={activeRepo.id} />
                </div>
              </div>
            ) : (
              <div className="text-center py-20 text-zinc-600">
                <div className="text-4xl mb-3">👈</div>
                <p>选择左侧仓库查看详情</p>
                <p className="text-sm mt-1">或点击"导入仓库"添加新项目</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SessionMemoryInput({ repoId }: { repoId: string }) {
  const [text, setText] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (!text.trim()) return;
    try {
      const key = `agentforge_session_memory_${repoId}`;
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      existing.push({ text: text.trim(), timestamp: Date.now() });
      localStorage.setItem(key, JSON.stringify(existing.slice(-20)));
      setSaved(true);
      setText('');
      setTimeout(() => setSaved(false), 2000);
    } catch { /* ignore */ }
  };

  return (
    <div className="space-y-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="粘贴 AI 对话中关于技术决策、Bug 修复、代码约束的部分..."
        className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder-zinc-500 focus:border-violet-500 focus:outline-none resize-none"
        rows={4}
      />
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={!text.trim()}
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-40 transition"
        >
          保存到项目记忆
        </button>
        {saved && <span className="text-xs text-emerald-400">已保存</span>}
      </div>
    </div>
  );
}
