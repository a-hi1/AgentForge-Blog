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
    <div className="page-shell py-12 sm:py-16">
        <div className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-5 animate-fade-up">
          <div>
            <span className="badge badge-blue mb-4">Project Memory</span>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">项目记忆</h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">导入 GitHub 仓库，沉淀代码结构、技术决策与会话上下文。</p>
          </div>
          <button
            onClick={() => setShowImport(!showImport)}
            className={showImport ? 'btn-secondary' : 'btn-primary'}
          >
            {showImport ? '取消导入' : '导入仓库'}
          </button>
        </div>

        {/* Import Form */}
        {showImport && (
          <div className="glass-card mesh-panel mb-6 p-5 sm:p-6 animate-fade-up">
            <label htmlFor="repo-url" className="block text-sm font-medium text-white mb-2">GitHub 仓库地址</label>
            <p className="text-xs text-[var(--text-tertiary)] mb-4">支持公开仓库；设置 GITHUB_TOKEN 可提高 API 限额。</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                id="repo-url"
                type="url"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !importLoading) handleImport(); }}
                placeholder="https://github.com/user/repo"
                className="input-field flex-1 font-mono"
              />
              <button
                onClick={handleImport}
                disabled={importLoading || !importUrl.trim()}
                className="btn-primary shrink-0"
              >
                {importLoading ? '分析中...' : '导入并分析'}
              </button>
            </div>
            {importError && (
              <div className="mt-4 rounded-xl border border-red-500/25 bg-red-500/10 p-4" role="alert">
                <p className="text-sm text-red-300">{importError}</p>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6 animate-fade-up animate-delay-1">
          {/* Left: Repo List */}
          <div className="w-full lg:w-72 shrink-0">
            {repos.length === 0 ? (
              <div className="glass-card text-center py-10 px-5">
                <div className="w-11 h-11 rounded-xl bg-white/[0.03] border border-[var(--border)] flex items-center justify-center mx-auto mb-4 text-[var(--text-muted)]">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7l9-4 9 4-9 4-9-4zm0 0v10l9 4 9-4V7M12 11v10" /></svg>
                </div>
                <p className="text-sm text-[var(--text-secondary)]">还没有导入仓库</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">点击「导入仓库」开始</p>
              </div>
            ) : (
              <div className="space-y-2">
                {repos.map(repo => (
                  <div
                    key={repo.id}
                    onClick={() => setActiveId(repo.id)}
                    className={`group relative rounded-xl border p-4 cursor-pointer transition-all duration-200 ${
                      activeId === repo.id
                        ? 'border-violet-500/50 bg-violet-500/10 shadow-glow-sm'
                        : 'border-[var(--border)] bg-white/[0.02] hover:border-[var(--border-strong)] hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white truncate">{repo.meta.owner}/{repo.meta.name}</p>
                        <p className="text-xs text-[var(--text-tertiary)] mt-0.5 truncate">{repo.meta.description || '无描述'}</p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(repo.id); }}
                        className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 text-[var(--text-muted)] hover:text-red-400 transition-opacity ml-2 shrink-0 p-1.5 rounded-lg hover:bg-red-500/10"
                        title="删除"
                        aria-label={`删除 ${repo.meta.name}`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[10px] text-[var(--text-muted)]">{repo.meta.language || '-'}</span>
                      <span className="text-[10px] text-[var(--text-muted)]">Stars {repo.meta.stars}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                        repo.maturity.score >= 71 ? 'text-emerald-400 bg-emerald-500/10'
                        : repo.maturity.score >= 51 ? 'text-amber-400 bg-amber-500/10'
                        : 'text-red-400 bg-red-500/10'
                      }`}>{repo.maturity.score}分</span>
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)] mt-1.5">
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
                <div className="glass-card p-5 sm:p-6">
                  <h3 className="text-sm font-semibold text-white mb-1">导出给 AI</h3>
                  <p className="text-xs text-[var(--text-tertiary)] mb-4">复制针对不同工具优化的项目上下文。</p>
                  <div className="flex flex-wrap items-center gap-3">
                    {(['claude', 'cursor', 'gpt'] as ExportTarget[]).map(target => {
                      const labels: Record<ExportTarget, string> = { claude: 'Claude', cursor: 'Cursor', gpt: 'GPT' };
                      return (
                        <button
                          key={target}
                          onClick={() => handleCopy(target)}
                          className="btn-secondary"
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
                <div className="glass-card p-5 sm:p-6">
                  <h3 className="text-sm font-semibold text-white mb-2">会话记忆</h3>
                  <p className="text-sm text-[var(--text-tertiary)] mb-4">粘贴 Cursor / Claude / GPT 对话，保留技术决策、Bug 修复与约束。</p>
                  <SessionMemoryInput repoId={activeRepo.id} />
                </div>
              </div>
            ) : (
              <div className="glass-card text-center py-16 px-6">
                <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-4 text-violet-300">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" /></svg>
                </div>
                <p className="text-sm text-[var(--text-secondary)]">选择仓库查看详情</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">或导入新的 GitHub 项目</p>
              </div>
            )}
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
        className="input-field resize-none"
        rows={4}
      />
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={!text.trim()}
          className="btn-primary"
        >
          保存到项目记忆
        </button>
        {saved && <span className="text-xs text-emerald-400">已保存</span>}
      </div>
    </div>
  );
}
