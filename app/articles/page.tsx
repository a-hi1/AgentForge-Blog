import Link from 'next/link';
import GlassCard from '@/components/shared/GlassCard';

export default function ArticlesPage() {
  return (
    <div className="min-h-screen py-16 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[rgba(99,102,241,0.1)] border border-[rgba(99,102,241,0.2)] text-[#818cf8] text-xs font-medium uppercase tracking-wider mb-4">
            Content
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-[#f8fafc] mb-4">
            Articles
          </h1>
          <p className="text-[#94a3b8] text-lg max-w-2xl mx-auto">
            Technical deep-dives and engineering notes.
          </p>
        </div>

        <div className="text-center py-20">
          <p className="text-[#64748b] text-lg mb-6">
            No articles found. Stay tuned!
          </p>
          <Link 
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#1e293b] text-[#f8fafc] font-medium border border-[rgba(255,255,255,0.1)] hover:bg-[#334155] hover:border-[#6366f1] transition-all"
          >
            ← 返回首页
          </Link>
        </div>
      </div>
    </div>
  );
}
