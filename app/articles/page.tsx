import Link from 'next/link';
import GlassCard from '@/components/shared/GlassCard';

export default function ArticlesPage() {
  return (
    <div className="min-h-screen py-16 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[rgba(99,102,241,0.1)] border border-[rgba(99,102,241,0.2)] text-[#818cf8] text-xs font-medium uppercase tracking-wider mb-4">
            内容
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-[#f8fafc] mb-4">
            技术文章
          </h1>
          <p className="text-[#94a3b8] text-lg max-w-2xl mx-auto">
            技术深度解析与工程笔记。
          </p>
        </div>

        <div className="text-center py-20">
          <div className="text-4xl mb-4">📝</div>
          <p className="text-[#64748b] text-lg mb-2">
            暂无文章，敬请期待！
          </p>
          <p className="text-[#52525B] text-sm mb-6">
            技术文章正在撰写中，即将上线。
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
