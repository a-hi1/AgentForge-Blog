'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { t } from '@/lib/i18n/translations';

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

  return (
    <header className="sticky top-0 z-50 bg-[rgba(10,10,15,0.85)] backdrop-blur-2xl border-b border-[rgba(255,255,255,0.08)]">
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-xl font-bold bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] bg-clip-text text-transparent">
            AgentForge 智能工程系统
          </Link>
          
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item: any) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  item.highlight
                    ? 'bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] text-white shadow-lg'
                    : pathname === item.href
                    ? 'text-[#f8fafc] bg-[rgba(99,102,241,0.1)]'
                    : 'text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[rgba(255,255,255,0.05)]'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
