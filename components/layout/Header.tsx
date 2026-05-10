'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useCallback, useMemo } from 'react';

const navItems = [
  { href: '/', label: '工作台' },
  { href: '/projects', label: '项目中心' },
  { href: '/prompt', label: '提示词编排' },
  { href: '/prompt/history', label: '提示词历史' },
  { href: '/fix', label: '问题诊断' },
  { href: '/lab', label: '实验室' },
  { href: '/articles', label: '技术文章' },
];

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(href + '/');
}

export default function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

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
    <header className="sticky top-0 z-50 bg-[rgba(9,9,11,0.85)] backdrop-blur-xl border-b border-[rgba(255,255,255,0.06)]">
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-xl font-bold bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] bg-clip-text text-transparent">
            AgentForge 智能工程系统
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {renderedNav}
          </nav>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[rgba(255,255,255,0.05)] transition-all"
            aria-label="菜单"
          >
            {mobileOpen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            )}
          </button>
        </div>

        {mobileOpen && (
          <nav className="md:hidden mt-4 pb-2 border-t border-[rgba(255,255,255,0.06)] pt-4 flex flex-col gap-1">
            {renderedMobileNav}
          </nav>
        )}
      </div>
    </header>
  );
}
