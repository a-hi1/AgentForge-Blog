'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useCallback, useMemo } from 'react';

const navItems = [
  { href: '/', label: '工作台' },
  { href: '/projects', label: '项目中心' },
  { href: '/prompt', label: 'Prompt Studio' },
  { href: '/vault', label: '资产库' },
  { href: '/lab', label: '执行实验室' },
  { href: '/fix', label: '问题修复' },
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
