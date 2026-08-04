'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';

const navItems = [
  { href: '/', label: '首页' },
  { href: '/prompt/discovery', label: '方向探索' },
  { href: '/projects', label: '项目记忆' },
  { href: '/prompt', label: 'AI 导出' },
  { href: '/lab', label: '实验室' },
];

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(href + '/');
}

type IntentType = 'idea' | 'fix' | 'continue';

function detectIntent(text: string): IntentType {
  const lower = text.toLowerCase();
  if (/\b(bug|fix|修复|报错|错误|崩溃|crash|error|问题|异常|失败|fail)\b/i.test(lower))
    return 'fix';
  if (/\b(继续|continue|接着|上次|resume|恢复|接着做|记忆|memory)\b/i.test(lower))
    return 'continue';
  return 'idea';
}

const INTENT_CONFIG: Record<
  IntentType,
  { path: string; label: string; desc: string; color: string }
> = {
  idea: {
    path: '/prompt/discovery',
    label: '方向探索',
    desc: '探索产品方向',
    color: 'text-violet-300',
  },
  fix: {
    path: '/prompt',
    label: 'AI 导出',
    desc: '生成项目上下文',
    color: 'text-amber-300',
  },
  continue: {
    path: '/projects',
    label: '项目记忆',
    desc: '查看项目上下文',
    color: 'text-emerald-300',
  },
};

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdInput, setCmdInput] = useState('');
  const cmdInputRef = useRef<HTMLInputElement>(null);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen((prev) => !prev);
      }
      if (e.key === 'Escape') setCmdOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (cmdOpen) {
      setCmdInput('');
      setTimeout(() => cmdInputRef.current?.focus(), 50);
    }
  }, [cmdOpen]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const detectedIntent = useMemo(() => {
    if (!cmdInput.trim()) return null;
    return detectIntent(cmdInput);
  }, [cmdInput]);

  const handleCmdSubmit = useCallback(() => {
    if (!cmdInput.trim()) return;
    const intent = detectIntent(cmdInput);
    const cfg = INTENT_CONFIG[intent];
    const encoded = encodeURIComponent(cmdInput.trim());
    if (intent === 'idea') router.push(`${cfg.path}?idea=${encoded}`);
    else if (intent === 'continue') router.push(cfg.path);
    else router.push(`${cfg.path}?q=${encoded}`);
    setCmdOpen(false);
    setCmdInput('');
  }, [cmdInput, router]);

  const renderedNav = useMemo(
    () =>
      navItems.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`relative px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${
              active
                ? 'text-white'
                : 'text-[var(--text-secondary)] hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            {active && (
              <span
                className="absolute inset-0 rounded-lg bg-gradient-to-r from-violet-500/15 to-blue-500/15 border border-violet-500/25"
                aria-hidden
              />
            )}
            <span className="relative">{item.label}</span>
          </Link>
        );
      }),
    [pathname]
  );

  const renderedMobileNav = useMemo(
    () =>
      navItems.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={closeMobile}
            className={`px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer ${
              active
                ? 'text-white bg-violet-500/15 border border-violet-500/25'
                : 'text-[var(--text-secondary)] hover:text-white hover:bg-white/[0.04] border border-transparent'
            }`}
          >
            {item.label}
          </Link>
        );
      }),
    [pathname, closeMobile]
  );

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[rgba(5,5,7,0.75)] backdrop-blur-xl">
        <div className="page-shell py-3.5">
          <div className="flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-2.5 group cursor-pointer shrink-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shadow-glow-sm group-hover:shadow-glow transition-shadow">
                <span className="text-white font-bold text-sm tracking-tight">AF</span>
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-[15px] font-semibold text-white tracking-tight">
                  AgentForge
                </span>
                <span className="text-[10px] text-[var(--text-muted)] mt-0.5 tracking-wide">
                  Multi-Agent Workbench
                </span>
              </div>
            </Link>

            <nav className="hidden lg:flex items-center gap-0.5">{renderedNav}</nav>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCmdOpen(true)}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border-light)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:border-[var(--border-strong)] transition-all text-xs cursor-pointer"
                aria-label="打开命令面板"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <span className="hidden md:inline">搜索</span>
                <kbd className="hidden md:inline text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] font-mono">
                  ⌘K
                </kbd>
              </button>

              <a
                href="https://github.com/a-hi1/AgentForge-Blog"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center justify-center w-9 h-9 rounded-lg text-[var(--text-secondary)] hover:text-white hover:bg-white/[0.05] transition-all cursor-pointer"
                aria-label="GitHub 仓库"
              >
                <svg className="w-4.5 h-4.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  />
                </svg>
              </a>

              <button
                onClick={() => setCmdOpen(true)}
                className="sm:hidden p-2 rounded-lg text-[var(--text-secondary)] hover:text-white hover:bg-white/[0.05] transition-all cursor-pointer"
                aria-label="搜索"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </button>
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="lg:hidden p-2 rounded-lg text-[var(--text-secondary)] hover:text-white hover:bg-white/[0.05] transition-all cursor-pointer"
                aria-label="菜单"
                aria-expanded={mobileOpen}
              >
                {mobileOpen ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {mobileOpen && (
            <nav className="lg:hidden mt-3 pb-1 border-t border-[var(--border)] pt-3 flex flex-col gap-1 animate-fade-up">
              {renderedMobileNav}
            </nav>
          )}
        </div>
      </header>

      {cmdOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] sm:pt-[15vh] px-4"
          onClick={() => setCmdOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="命令面板"
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-lg bg-[#0C0C10] border border-[var(--border-strong)] rounded-2xl shadow-2xl overflow-hidden animate-fade-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--border)]">
              <svg
                className="w-5 h-5 text-[var(--text-muted)] shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                ref={cmdInputRef}
                value={cmdInput}
                onChange={(e) => setCmdInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCmdSubmit();
                }}
                placeholder="输入想法、问题或需求..."
                className="flex-1 bg-transparent text-sm text-white placeholder-[var(--text-muted)] focus:outline-none"
              />
              <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] text-[var(--text-muted)] border border-white/[0.08] font-mono">
                ESC
              </kbd>
            </div>

            {cmdInput.trim() && detectedIntent && (
              <div className="px-4 py-3 border-b border-[var(--border)]">
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="section-label">识别意图</span>
                  <span className={`text-xs font-medium ${INTENT_CONFIG[detectedIntent].color}`}>
                    {INTENT_CONFIG[detectedIntent].label}
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)]">·</span>
                  <span className="text-[10px] text-[var(--text-tertiary)]">
                    {INTENT_CONFIG[detectedIntent].desc}
                  </span>
                </div>
                <button onClick={handleCmdSubmit} className="btn-primary w-full">
                  <span>跳转到 {INTENT_CONFIG[detectedIntent].label}</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                </button>
              </div>
            )}

            <div className="px-4 py-3">
              <p className="section-label mb-2">快捷导航</p>
              <div className="space-y-0.5">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setCmdOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.04] transition-colors group cursor-pointer"
                  >
                    <span className="text-sm text-[var(--text-secondary)] group-hover:text-white transition-colors">
                      {item.label}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)] ml-auto font-mono">
                      {item.href}
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="px-4 py-2.5 border-t border-[var(--border)] flex items-center gap-4">
              <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1.5">
                <kbd className="px-1 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] font-mono">
                  ↵
                </kbd>
                跳转
              </span>
              <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1.5">
                <kbd className="px-1 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] font-mono">
                  esc
                </kbd>
                关闭
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
