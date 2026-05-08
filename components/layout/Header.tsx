'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const navItems = [
  { href: '/', label: '首页' },
  { href: '/showcase', label: '能力展示', highlight: true },
  { href: '/interview', label: '系统说明' },
  { href: '/lab', label: '实验室' },
  { href: '/playground', label: '智能交互' },
  { href: '/projects', label: '项目中心' },
  { href: '/articles', label: '技术文章' },
];

export default function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-[rgba(9,9,11,0.85)] backdrop-blur-xl border-b border-[rgba(255,255,255,0.06)]">
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-xl font-bold bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] bg-clip-text text-transparent">
            AgentForge 智能工程系统
          </Link>
          
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  item.highlight
                    ? 'bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white shadow-md'
                    : pathname === item.href
                    ? 'text-[#FAFAFA] bg-[rgba(59,130,246,0.1)]'
                    : 'text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[rgba(255,255,255,0.05)]'
                }`}
              >
                {item.label}
              </Link>
            ))}
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
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  item.highlight
                    ? 'bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white'
                    : pathname === item.href
                    ? 'text-[#FAFAFA] bg-[rgba(59,130,246,0.1)]'
                    : 'text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[rgba(255,255,255,0.05)]'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}
