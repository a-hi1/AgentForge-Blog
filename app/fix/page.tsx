'use client';

import { useState, useCallback, useEffect } from 'react';
import { generateFixPrompt } from '@/lib/prompt-orchestrator/fixGenerator';
import type { FixPrompt } from '@/lib/prompt-orchestrator/fixGenerator';
import CopyPromptButton from '@/components/prompt/CopyPromptButton';

const FIX_EXAMPLES = [
  'Next.js hydration failed',
  'TypeScript error: Property does not exist on type',
  'React hooks can only be called inside of the body of a function component',
  'Supabase RLS policy violation',
  'Next.js build error: Module not found',
  'Vercel deployment failed with exit code 1',
  'CORS error when calling API',
  'Authentication session expired',
];

interface HistoryEntry {
  id: string;
  input: string;
  category: string;
  label: string;
  timestamp: number;
}

const HISTORY_KEY = 'agentforge_fix_history';
const MAX_HISTORY = 30;

function loadHistory(): HistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(entry: HistoryEntry) {
  try {
    const history = loadHistory();
    history.unshift(entry);
    if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {
    // non-critical
  }
}

function clearHistory() {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch {
    // non-critical
  }
}

export default function FixPage() {
  const [input, setInput] = useState('');
  const [fixResult, setFixResult] = useState<FixPrompt | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError('');
    setFixResult(null);

    try {
      const result = await generateFixPrompt(input);
      setFixResult(result);

      saveHistory({
        id: `fix_${Date.now()}`,
        input: input.trim(),
        category: result.category,
        label: result.label,
        timestamp: Date.now(),
      });
      setHistory(loadHistory());
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败，请重试');
    } finally {
      setLoading(false);
    }
  }, [input]);

  const handleExampleClick = useCallback((example: string) => {
    setInput(example);
  }, []);

  const handleHistoryClick = useCallback((entry: HistoryEntry) => {
    setInput(entry.input);
    setShowHistory(false);
  }, []);

  const handleClearHistory = useCallback(() => {
    clearHistory();
    setHistory([]);
  }, []);

  const handleExport = useCallback(() => {
    if (!fixResult) return;
    const blob = new Blob([fixResult.prompt], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fix-${fixResult.category}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [fixResult]);

  const CATEGORY_COLORS: Record<string, string> = {
    nextjs_error: '#FAFAFA',
    typescript_error: '#3B82F6',
    react_error: '#06B6D4',
    supabase_error: '#10B981',
    auth_error: '#F59E0B',
    build_error: '#EF4444',
    hydration_error: '#F97316',
    vercel_deploy: '#8B5CF6',
    css_styling: '#EC4899',
    api_error: '#14B8A6',
    general: '#71717A',
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col">
      <div className="border-b border-[rgba(255,255,255,0.06)] px-4 py-3">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-[#EF4444] animate-pulse" />
            <span className="text-[#A1A1AA] text-sm font-medium hidden sm:inline">Issue Solver</span>
            <span className="text-[#71717A] text-xs hidden sm:inline">|</span>
            <span className="text-[#71717A] text-xs hidden sm:inline">输入错误 → 生成修复提示词</span>
          </div>
          {history.length > 0 && (
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#71717A] hover:text-[#A1A1AA] border border-[rgba(255,255,255,0.06)] rounded-lg hover:border-[rgba(255,255,255,0.12)] transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              历史 ({history.length})
            </button>
          )}
        </div>
      </div>

      <div className="flex-grow max-w-[1200px] mx-auto w-full px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-[#FAFAFA] mb-2">问题修复提示词生成</h1>
            <p className="text-sm text-[#71717A]">
              输入错误日志或开发问题，AI 实时生成精准修复提示词，覆盖 Next.js / React / TypeScript / Supabase / Vercel 等场景
            </p>
          </div>

          <div className="mb-6">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={'粘贴错误日志或描述开发问题...\n\n例如：\n- Error: Hydration failed because the initial UI does not match\n- Type error: Property \'name\' does not exist on type \'User\'\n- Supabase: new row violates row-level security policy'}
              className="w-full bg-[#111113] border border-[rgba(255,255,255,0.1)] rounded-xl px-5 py-4 text-[#FAFAFA] placeholder-[#71717A] focus:outline-none focus:border-[#EF4444] resize-none text-sm leading-relaxed min-h-[140px] max-h-[300px]"
              rows={6}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  handleGenerate();
                }
              }}
            />
            <div className="flex items-center justify-between mt-3">
              <p className="text-[10px] text-[#71717A]">Ctrl + Enter 快速生成</p>
              <button
                onClick={handleGenerate}
                disabled={!input.trim() || loading}
                className="px-6 py-2.5 rounded-lg text-sm font-medium bg-gradient-to-r from-[#EF4444] to-[#F97316] text-white hover:shadow-lg hover:shadow-[rgba(239,68,68,0.3)] transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    分析中...
                  </>
                ) : '生成修复提示词'}
              </button>
            </div>
            {error && <p className="mt-2 text-xs text-[#EF4444]">{error}</p>}
          </div>

          <div className="mb-8">
            <p className="text-xs text-[#71717A] mb-2">快速示例</p>
            <div className="flex flex-wrap gap-2">
              {FIX_EXAMPLES.map((example, i) => (
                <button
                  key={i}
                  onClick={() => handleExampleClick(example)}
                  className="px-3 py-1.5 text-xs text-[#71717A] border border-[rgba(255,255,255,0.06)] rounded-lg hover:border-[rgba(239,68,68,0.3)] hover:text-[#A1A1AA] hover:bg-[rgba(239,68,68,0.05)] transition-all"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>

          {showHistory && history.length > 0 && (
            <div className="mb-8 p-5 rounded-xl bg-[#0a0a0c] border border-[rgba(255,255,255,0.06)]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-[#FAFAFA]">历史记录</h3>
                <button
                  onClick={handleClearHistory}
                  className="text-[10px] text-[#71717A] hover:text-[#EF4444] transition-colors"
                >
                  清空
                </button>
              </div>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {history.map(entry => (
                  <button
                    key={entry.id}
                    onClick={() => handleHistoryClick(entry)}
                    className="w-full text-left p-3 rounded-lg border border-[rgba(255,255,255,0.04)] hover:border-[rgba(255,255,255,0.1)] transition-all"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                        style={{ color: CATEGORY_COLORS[entry.category] || '#71717A', backgroundColor: 'rgba(255,255,255,0.05)' }}
                      >
                        {entry.label}
                      </span>
                      <span className="text-[10px] text-[#71717A]">
                        {new Date(entry.timestamp).toLocaleDateString('zh-CN')}
                      </span>
                    </div>
                    <p className="text-xs text-[#A1A1AA] truncate">{entry.input}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {fixResult && (
            <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0a0a0c] overflow-hidden">
              <div className="p-5 border-b border-[rgba(255,255,255,0.06)]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span
                      className="text-sm font-semibold"
                      style={{ color: CATEGORY_COLORS[fixResult.category] || '#71717A' }}
                    >
                      {fixResult.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleExport}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#71717A] border border-[rgba(255,255,255,0.06)] rounded-lg hover:border-[#3B82F6] hover:text-[#60A5FA] transition-all"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      导出
                    </button>
                    <CopyPromptButton text={fixResult.prompt} label="复制" />
                  </div>
                </div>
                {fixResult.diagnostics.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {fixResult.diagnostics.map((d, i) => (
                      <span key={i} className="px-2 py-0.5 text-[10px] text-[#A1A1AA] bg-[rgba(255,255,255,0.04)] rounded">
                        {d}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-6">
                <div className="prose prose-invert max-w-none">
                  {fixResult.prompt.split('\n').map((line, i) => {
                    if (line.startsWith('# ')) {
                      return <h1 key={i} className="text-xl font-bold text-[#FAFAFA] mt-6 mb-3 first:mt-0">{line.replace(/^# /, '')}</h1>;
                    }
                    if (line.startsWith('## ')) {
                      return <h2 key={i} className="text-base font-semibold text-[#FAFAFA] mt-5 mb-2">{line.replace(/^## /, '')}</h2>;
                    }
                    if (line.startsWith('- ')) {
                      return <li key={i} className="text-sm text-[#A1A1AA] ml-4 mb-1">{line.replace(/^- /, '')}</li>;
                    }
                    if (line.startsWith('> ')) {
                      return <blockquote key={i} className="border-l-2 border-[rgba(139,92,246,0.4)] pl-3 py-1 my-2 text-sm text-[#71717A] italic">{line.replace(/^> /, '')}</blockquote>;
                    }
                    if (line.trim() === '---') {
                      return <hr key={i} className="border-[rgba(255,255,255,0.06)] my-4" />;
                    }
                    if (line.trim() === '') {
                      return <div key={i} className="h-2" />;
                    }
                    return <p key={i} className="text-sm text-[#A1A1AA] leading-relaxed mb-1">{line}</p>;
                  })}
                </div>
              </div>
            </div>
          )}

          {!fixResult && !loading && (
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.15)] flex items-center justify-center">
                <svg className="w-8 h-8 text-[#EF4444]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <p className="text-sm text-[#71717A] mb-1">输入错误日志或开发问题</p>
              <p className="text-xs text-[#52525B]">支持 Next.js / React / TypeScript / Supabase / Vercel 等</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
