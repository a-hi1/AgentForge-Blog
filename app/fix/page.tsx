'use client';

import { useState, useCallback, useEffect, useMemo, type ReactNode } from 'react';
import { generateFixPrompt } from '@/lib/prompt-orchestrator/fixGenerator';
import type { FixPrompt } from '@/lib/prompt-orchestrator/fixGenerator';
import CopyPromptButton from '@/components/prompt/CopyPromptButton';
import PromptDebugger from '@/components/prompt/PromptDebugger';

type AnalysisMode = 'category' | 'debugger';

interface Category {
  id: string;
  name: string;
  icon: ReactNode;
  subcategories: { name: string; example: string }[];
}

const CATEGORIES: Category[] = [
  {
    id: 'frontend',
    name: '前端问题',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    subcategories: [
      { name: '布局错乱', example: '组件布局错位、响应式失效' },
      { name: '响应式问题', example: '移动端显示异常、断点失效' },
      { name: 'Hydration 错误', example: 'React hydration mismatch' },
      { name: '样式冲突', example: 'CSS 优先级、Tailwind 问题' },
    ],
  },
  {
    id: 'backend',
    name: '后端问题',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
      </svg>
    ),
    subcategories: [
      { name: 'API 错误', example: '接口请求失败、CORS 问题' },
      { name: '认证问题', example: '登录失败、Session 过期' },
      { name: '数据库问题', example: '查询失败、连接错误' },
      { name: 'Supabase 问题', example: 'RLS 策略、权限错误' },
    ],
  },
  {
    id: 'build',
    name: '构建部署',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
    ),
    subcategories: [
      { name: 'Vercel 部署', example: '部署失败、构建错误' },
      { name: 'Next.js 构建', example: 'Module not found、TypeScript 错误' },
      { name: '环境变量', example: '配置缺失、变量未生效' },
      { name: 'Edge Runtime', example: '边缘运行时错误' },
    ],
  },
  {
    id: 'performance',
    name: '性能优化',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    subcategories: [
      { name: 'Bundle 过大', example: '包体积过大、代码分割' },
      { name: '重复渲染', example: 'React 组件重渲染优化' },
      { name: '查询性能', example: '数据库查询优化、缓存' },
      { name: '加载速度', example: '首屏加载、LCP 优化' },
    ],
  },
];

function detectCategoryFromInput(text: string): string | null {
  const lower = text.toLowerCase();
  if (/\b(TypeError|ReferenceError|SyntaxError|undefined is not|cannot read|null is not|is not a function|is not defined|hydration|useEffect|useState|render|hook|jsx)\b/i.test(lower)) return 'frontend';
  if (/\b(401|403|404|500|502|503|fetch failed|CORS|timeout|rate limit|ECONNREFUSED|RLS|supabase|pg_|column.*does not exist)\b/i.test(lower)) return 'backend';
  if (/\b(build error|next\.config|Cannot find module|Module not found|webpack|turbopack|prerender|vercel|deploy|edge runtime)\b/i.test(lower)) return 'build';
  if (/\b(performance|bundle|re-?render|LCP|CLS|FID|lazy|chunk|memory leak|slow)\b/i.test(lower)) return 'performance';
  return null;
}

const WHY_FAILED_TEMPLATES: Record<string, string> = {
  frontend: '前端问题通常源于：1) 状态更新时机不当导致渲染循环；2) 服务端与客户端状态不同步；3) Hook 依赖数组配置错误。建议检查状态更新是否在正确的生命周期中执行。',
  backend: '后端问题通常源于：1) RLS 策略配置不当；2) 查询语法不兼容；3) 认证令牌过期或权限不足。建议先在 SQL Editor / Postman 中验证请求。',
  build: '构建问题通常源于：1) 服务端/客户端组件边界不清；2) 第三方库不兼容 SSR；3) 环境变量缺失。建议检查组件是否正确标记了 use client。',
  performance: '性能问题通常源于：1) 不必要的重渲染；2) 大包未做代码分割；3) 数据库查询未加索引。建议使用 React DevTools Profiler 定位瓶颈。',
};

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
    /* ignore */
  }
}

export default function FixPage() {
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('category');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [fixResult, setFixResult] = useState<FixPrompt | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const detectedCategory = useMemo(() => {
    if (!input.trim() || input.trim().length < 10) return null;
    return detectCategoryFromInput(input);
  }, [input]);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setSelectedSubcategory(null);
    setFixResult(null);
  };

  const handleSubcategorySelect = (subcat: { name: string; example: string }) => {
    setSelectedSubcategory(subcat.name);
    setInput(subcat.example);
    setFixResult(null);
  };

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

  return (
    <div className="page-shell py-12 sm:py-16">
      <div className="mb-8 animate-fade-up">
        <span className="badge badge-amber mb-4">Fix Studio</span>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">问题修复</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          选择问题类型，快速生成精准的修复提示词
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2 animate-fade-up animate-delay-1">
        <button
          type="button"
          onClick={() => setAnalysisMode('category')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
            analysisMode === 'category'
              ? 'bg-violet-500/15 text-violet-300 border border-violet-500/25'
              : 'bg-white/[0.03] text-[var(--text-muted)] border border-[var(--border)] hover:text-[var(--text-secondary)]'
          }`}
        >
          分类修复
        </button>
        <button
          type="button"
          onClick={() => setAnalysisMode('debugger')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer inline-flex items-center gap-2 ${
            analysisMode === 'debugger'
              ? 'bg-red-500/15 text-red-300 border border-red-500/25'
              : 'bg-white/[0.03] text-[var(--text-muted)] border border-[var(--border)] hover:text-[var(--text-secondary)]'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Prompt Debugger
        </button>
      </div>

      {analysisMode === 'debugger' ? (
        <div className="animate-fade-up">
          <PromptDebugger
            initialError={input}
            onApplyFix={(fixedPrompt) => {
              setInput(fixedPrompt);
              setAnalysisMode('category');
            }}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-up animate-delay-2">
          <div className="lg:col-span-1 space-y-4">
            <h2 className="section-label">问题分类</h2>
            <div className="space-y-3">
              {CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <div
                    key={cat.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleCategorySelect(cat.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleCategorySelect(cat.id);
                      }
                    }}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-violet-500/10 border-violet-500/40 shadow-glow-sm'
                        : 'bg-white/[0.02] border-[var(--border)] hover:border-[var(--border-strong)] hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-9 h-9 rounded-lg flex items-center justify-center border ${
                          isSelected
                            ? 'bg-violet-500/15 border-violet-500/30 text-violet-300'
                            : 'bg-white/[0.03] border-[var(--border)] text-[var(--text-muted)]'
                        }`}
                      >
                        {cat.icon}
                      </span>
                      <span className={`font-semibold ${isSelected ? 'text-white' : 'text-[var(--text-secondary)]'}`}>
                        {cat.name}
                      </span>
                    </div>

                    {isSelected && (
                      <div className="mt-4 space-y-2">
                        {cat.subcategories.map((subcat, i) => (
                          <button
                            type="button"
                            key={i}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSubcategorySelect(subcat);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                              selectedSubcategory === subcat.name
                                ? 'bg-violet-500/20 text-violet-200 border border-violet-500/30'
                                : 'bg-white/[0.03] text-[var(--text-muted)] border border-transparent hover:text-[var(--text-secondary)] hover:border-[var(--border)]'
                            }`}
                          >
                            {subcat.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {history.length > 0 && (
              <div className="mt-6">
                <h2 className="section-label mb-3">历史记录</h2>
                <div className="space-y-2">
                  {history.slice(0, 5).map((entry) => (
                    <button
                      type="button"
                      key={entry.id}
                      onClick={() => {
                        setInput(entry.input);
                        setFixResult(null);
                      }}
                      className="w-full text-left p-3 rounded-xl bg-white/[0.02] border border-[var(--border)] hover:border-[var(--border-strong)] hover:bg-white/[0.04] transition-colors cursor-pointer"
                    >
                      <p className="text-sm text-[var(--text-secondary)] truncate">{entry.input}</p>
                      <p className="text-xs text-[var(--text-muted)] mt-1">
                        {new Date(entry.timestamp).toLocaleDateString()}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="glass-card p-5 sm:p-6">
              <h2 className="text-sm font-semibold text-white mb-4">问题描述</h2>
              <label htmlFor="fix-input" className="sr-only">
                问题描述
              </label>
              <textarea
                id="fix-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="详细描述你遇到的问题，或粘贴错误日志..."
                className="input-field h-40 resize-none"
              />
              {detectedCategory && (
                <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2 px-3 py-2 rounded-xl bg-violet-500/10 border border-violet-500/20">
                  <div className="flex items-center gap-2 min-w-0">
                    <svg className="w-4 h-4 text-violet-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span className="text-xs text-violet-300">
                      自动识别为{' '}
                      <strong>
                        {CATEGORIES.find((c) => c.id === detectedCategory)?.name || detectedCategory}
                      </strong>{' '}
                      问题
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory(detectedCategory)}
                    className="sm:ml-auto text-xs text-violet-300 hover:text-violet-200 transition-colors cursor-pointer"
                  >
                    应用分类
                  </button>
                </div>
              )}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4">
                <p className="text-xs text-[var(--text-muted)]">越详细的描述越有助于精准修复</p>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={!input.trim() || loading}
                  className="btn-primary"
                >
                  {loading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      分析中…
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      生成修复提示词
                    </>
                  )}
                </button>
              </div>
              {error && (
                <p className="mt-3 text-xs text-red-300" role="alert">
                  {error}
                </p>
              )}
            </div>

            {fixResult && (
              <div className="glass-card overflow-hidden">
                <div className="p-5 border-b border-[var(--border)] flex items-center justify-between gap-3">
                  <span className="font-semibold text-white">{fixResult.label}</span>
                  <CopyPromptButton text={fixResult.prompt} label="复制" />
                </div>
                <div className="p-5 sm:p-6">
                  <div className="prose prose-invert max-w-none">
                    {fixResult.prompt.split('\n').map((line, i) => {
                      if (line.startsWith('# ')) {
                        return (
                          <h1 key={i} className="text-xl font-bold text-white mt-6 mb-3 first:mt-0">
                            {line.replace(/^# /, '')}
                          </h1>
                        );
                      }
                      if (line.startsWith('## ')) {
                        return (
                          <h2 key={i} className="text-base font-semibold text-white mt-5 mb-2">
                            {line.replace(/^## /, '')}
                          </h2>
                        );
                      }
                      if (line.startsWith('- ')) {
                        return (
                          <li key={i} className="text-sm text-[var(--text-tertiary)] ml-4 mb-1">
                            {line.replace(/^- /, '')}
                          </li>
                        );
                      }
                      if (line.startsWith('> ')) {
                        return (
                          <blockquote
                            key={i}
                            className="border-l-2 border-violet-500/40 pl-3 py-1 my-2 text-sm text-[var(--text-muted)] italic"
                          >
                            {line.replace(/^> /, '')}
                          </blockquote>
                        );
                      }
                      if (line.trim() === '---') {
                        return <hr key={i} className="border-[var(--border)] my-4" />;
                      }
                      if (line.trim() === '') {
                        return <div key={i} className="h-2" />;
                      }
                      return (
                        <p key={i} className="text-sm text-[var(--text-tertiary)] leading-relaxed mb-1">
                          {line}
                        </p>
                      );
                    })}
                  </div>
                </div>
                {WHY_FAILED_TEMPLATES[fixResult.category] && (
                  <div className="px-5 sm:px-6 pb-5">
                    <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <span className="text-xs font-medium text-amber-300">为什么会失败？</span>
                      </div>
                      <p className="text-xs text-amber-200/70 leading-relaxed">
                        {WHY_FAILED_TEMPLATES[fixResult.category]}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
