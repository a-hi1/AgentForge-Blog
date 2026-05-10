'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';

const navItems = [
  { href: '/', label: '工作台' },
  { href: '/projects', label: '项目中心' },
  { href: '/prompt', label: 'Prompt Studio' },
  { href: '/prompt/history', label: '资产库' },
  { href: '/lab', label: '执行实验室' },
  { href: '/fix', label: '问题修复' },
];

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(href + '/');
}

type IntentType = 'idea' | 'fix' | 'optimize' | 'continue';

function detectIntent(text: string): IntentType {
  const lower = text.toLowerCase();
  if (/\b(bug|fix|修复|报错|错误|崩溃|crash|error|问题|异常|失败|fail)\b/i.test(lower)) return 'fix';
  if (/\b(优化|optimize|性能|performance|改进|改善|提升|加速|reduce|improve)\b/i.test(lower)) return 'optimize';
  if (/\b(继续|continue|接着|上次|resume|恢复|接着做)\b/i.test(lower)) return 'continue';
  return 'idea';
}

const INTENT_CONFIG: Record<IntentType, { path: string; label: string; desc: string; color: string }> = {
  idea: { path: '/prompt', label: 'Prompt Studio', desc: '生成精准 Prompt', color: 'text-purple-400' },
  fix: { path: '/fix', label: '问题修复', desc: '分析并修复问题', color: 'text-red-400' },
  optimize: { path: '/playground', label: 'Playground', desc: '执行优化测试', color: 'text-amber-400' },
  continue: { path: '/', label: '工作台', desc: '恢复上下文', color: 'text-emerald-400' },
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
        setCmdOpen(prev => !prev);
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

  const renderedNav = useMemo(() => navItems.map((item) => {
    const active = isActive(pathname, item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
          active
            ? 'text-[#FAFAFA] bg-[rgba(59,130,246,0.15)] border border-[rgba(59,130,246,0.25)]'
            : 'text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[rgba(255,255,255,0.05)] border border-transparent'
        }`}
      >
        {item.label}
      </Link>
    );
  }), [pathname]);

  const renderedMobileNav = useMemo(() => navItems.map((item) => {
    const active = isActive(pathname, item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={closeMobile}
        className={`px-4 py-3 rounded-lg text-sm font-medium transition-all duration-150 ${
          active
            ? 'text-[#FAFAFA] bg-[rgba(59,130,246,0.15)] border border-[rgba(59,130,246,0.25)]'
            : 'text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[rgba(255,255,255,0.05)] border border-transparent'
        }`}
      >
        {item.label}
      </Link>
    );
  }), [pathname, closeMobile]);

  return (
    <>
    <header className="sticky top-0 z-40 bg-[rgba(9,9,11,0.85)] backdrop-blur-xl border-b border-[rgba(255,255,255,0.06)]">
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">AF</span>
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-white">AgentForge DevOS</span>
              <span className="text-xs text-gray-400 -mt-1">Prompt 驱动的个人开发操作系统</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {renderedNav}
            <button
              onClick={() => setCmdOpen(true)}
              className="ml-2 flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[rgba(255,255,255,0.1)] text-[#71717A] hover:text-[#A1A1AA] hover:border-[rgba(255,255,255,0.2)] transition-all text-xs"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>Ctrl+K</span>
            </button>
          </nav>

          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={() => setCmdOpen(true)}
              className="p-2 rounded-lg text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[rgba(255,255,255,0.05)] transition-all"
              aria-label="搜索"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2 rounded-lg text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[rgba(255,255,255,0.05)] transition-all"
              aria-label="菜单"
            >
              {mobileOpen ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
              )}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <nav className="md:hidden mt-4 pb-2 border-t border-[rgba(255,255,255,0.06)] pt-4 flex flex-col gap-1">
            {renderedMobileNav}
          </nav>
        )}
      </div>
    </header>

    {cmdOpen && (
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" onClick={() => setCmdOpen(false)}>
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        <div
          className="relative w-full max-w-lg mx-4 bg-[#111113] border border-[rgba(255,255,255,0.12)] rounded-2xl shadow-2xl overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[rgba(255,255,255,0.06)]">
            <svg className="w-5 h-5 text-[#71717A] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={cmdInputRef}
              value={cmdInput}
              onChange={e => setCmdInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCmdSubmit(); }}
              placeholder="输入想法、Bug 描述或优化需求..."
              className="flex-1 bg-transparent text-sm text-[#FAFAFA] placeholder-[#52525B] focus:outline-none"
            />
            <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-[rgba(255,255,255,0.06)] text-[#52525B] border border-[rgba(255,255,255,0.08)]">ESC</kbd>
          </div>

          {cmdInput.trim() && detectedIntent && (
            <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.06)]">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] text-[#52525B] uppercase tracking-wider">识别意图</span>
                <span className={`text-xs font-medium ${INTENT_CONFIG[detectedIntent].color}`}>
                  {INTENT_CONFIG[detectedIntent].label}
                </span>
                <span className="text-[10px] text-[#71717A]">·</span>
                <span className="text-[10px] text-[#71717A]">{INTENT_CONFIG[detectedIntent].desc}</span>
              </div>
              <button
                onClick={handleCmdSubmit}
                className="w-full px-4 py-2.5 rounded-lg text-sm font-medium bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6] text-white hover:shadow-lg hover:shadow-[rgba(139,92,246,0.3)] transition-all flex items-center justify-center gap-2"
              >
                <span>跳转到 {INTENT_CONFIG[detectedIntent].label}</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </div>
          )}

          <div className="px-4 py-3">
            <p className="text-[10px] text-[#52525B] uppercase tracking-wider mb-2">快捷导航</p>
            <div className="space-y-1">
              {navItems.slice(0, 4).map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setCmdOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[rgba(255,255,255,0.05)] transition-colors group"
                >
                  <span className="text-sm text-[#A1A1AA] group-hover:text-white transition-colors">{item.label}</span>
                  <span className="text-[10px] text-[#52525B] ml-auto">{item.href}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="px-4 py-2.5 border-t border-[rgba(255,255,255,0.06)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-[#52525B] flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.08)]">↑↓</kbd> 导航
              </span>
              <span className="text-[10px] text-[#52525B] flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.08)]">↵</kbd> 跳转
              </span>
            </div>
            <span className="text-[10px] text-[#52525B]">idea / fix / optimize</span>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
