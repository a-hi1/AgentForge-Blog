'use client';

import { useState, useCallback, useEffect } from 'react';
import { parseRepoUrl, fetchRepoMeta, fetchRepoTree, RepoMeta } from '@/lib/github/importer';
import { analyzeCodebase, CodeAnalysis } from '@/lib/github/codeAnalyzer';
import { analyzeMaturity, generateRecommendationPrompts, MaturityResult } from '@/lib/projects/maturityAnalyzer';
import { buildContextPack, ExportTarget } from '@/lib/export/contextPack';
import RepoInsights from '@/components/projects/RepoInsights';

const STORAGE_KEY = 'agentforge_imported_repo';

export default function ProjectsPage() {
  const [importUrl, setImportUrl] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState('');
  const [meta, setMeta] = useState<RepoMeta | null>(null);
  const [analysis, setAnalysis] = useState<CodeAnalysis | null>(null);
  const [maturity, setMaturity] = useState<MaturityResult | null>(null);
  const [recommendations, setRecommendations] = useState<{ title: string; prompt: string }[]>([]);
  const [copiedLabel, setCopiedLabel] = useState('');

  // Restore from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.meta && data.analysis) {
          setMeta(data.meta);
          setAnalysis(data.analysis);
          setMaturity(data.maturity || null);
          setRecommendations(data.recommendations || []);
          setImportUrl(data.importUrl || '');
        }
      }
    } catch { /* ignore */ }
  }, []);

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

      setMeta(m);
      setAnalysis(a);
      setMaturity(mat);
      setRecommendations(recs);

      // Persist to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        meta: m,
        analysis: a,
        maturity: mat,
        recommendations: recs,
        importUrl,
      }));
    } catch (err: unknown) {
      setImportError(err instanceof Error ? err.message : '导入失败');
    } finally {
      setImportLoading(false);
    }
  }, [importUrl]);

  const handleCopy = async (target: ExportTarget) => {
    if (!meta || !analysis) return;
    const text = buildContextPack(target, meta, analysis);
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

  const reset = () => {
    setMeta(null);
    setAnalysis(null);
    setMaturity(null);
    setRecommendations([]);
    setImportUrl('');
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <div className="min-h-[calc(100vh-80px)] py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">项目记忆</h1>
          <p className="mt-1 text-sm text-zinc-400">导入 GitHub 仓库，让 AI 理解你的项目</p>
        </div>

        {!meta && (
          <div className="space-y-4">
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

        {meta && analysis && maturity && (
          <div className="space-y-6">
            <RepoInsights
              repoMeta={meta}
              codeAnalysis={analysis}
              maturity={maturity}
              recommendations={recommendations}
              onRefresh={handleImport}
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
              <SessionMemoryInput onSave={() => {}} />
            </div>

            <button onClick={reset} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition">
              重新导入
            </button>
          </div>
        )}

        {!meta && !importLoading && (
          <div className="mt-16 text-center text-zinc-600">
            <div className="text-4xl mb-3">📦</div>
            <p>导入 GitHub 仓库，自动提取技术栈、决策和结构</p>
            <p className="text-sm mt-1">一键复制给 Claude / Cursor / GPT</p>
          </div>
        )}
      </div>
    </div>
  );
}

function SessionMemoryInput({ onSave }: { onSave: () => void }) {
  const [text, setText] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (!text.trim()) return;
    try {
      const existing = JSON.parse(localStorage.getItem('agentforge_session_memory') || '[]');
      existing.push({ text: text.trim(), timestamp: Date.now() });
      localStorage.setItem('agentforge_session_memory', JSON.stringify(existing.slice(-20)));
      setSaved(true);
      setText('');
      onSave();
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
