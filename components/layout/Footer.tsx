import Link from 'next/link';

const links = [
  { href: '/projects', label: '项目记忆' },
  { href: '/prompt', label: 'AI 导出' },
  { href: '/prompt/discovery', label: '方向探索' },
  { href: '/about', label: '关于' },
  { href: '/lab', label: '实验室' },
];

export default function Footer() {
  return (
    <footer className="relative z-10 mt-auto border-t border-[var(--border)] bg-[rgba(5,5,7,0.6)] backdrop-blur-md">
      <div className="page-shell py-10">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8">
          <div className="max-w-sm">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shadow-glow-sm">
                <span className="text-white font-bold text-xs tracking-tight">AF</span>
              </div>
              <span className="text-sm font-semibold text-white">AgentForge</span>
            </div>
            <p className="text-xs text-[var(--text-tertiary)] leading-relaxed">
              记忆增强多智能体工程工作台 · 规划 → 执行 → 校验 → 记忆闭环。
              面向 AI Agent / RAG 实习作品集。
            </p>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-xs text-[var(--text-tertiary)] hover:text-white transition-colors cursor-pointer"
              >
                {l.label}
              </Link>
            ))}
            <a
              href="https://github.com/a-hi1/AgentForge-Blog"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[var(--text-tertiary)] hover:text-white transition-colors cursor-pointer"
            >
              GitHub
            </a>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-[var(--text-muted)]">
            © 2026 AgentForge · MIT License
          </p>
          <div className="flex items-center gap-3 text-[11px] text-[var(--text-muted)]">
            <span>Next.js 14</span>
            <span className="opacity-40">·</span>
            <span>Supabase pgvector</span>
            <span className="opacity-40">·</span>
            <span>DeepSeek / MaxKB</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
