import Link from 'next/link';

export default function ArticlePage({ params }: { params: { id: string } }) {
  return (
    <div className="min-h-screen py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/articles"
          className="inline-flex items-center gap-2 text-[#818cf8] hover:text-[#6366f1] transition-colors mb-8"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Articles
        </Link>

        <article>
          <div className="text-center py-20">
            <h1 className="text-4xl md:text-5xl font-extrabold text-[#f8fafc] mb-4">
              Article Not Found
            </h1>
            <p className="text-[#94a3b8] text-lg mb-6">
              The article you're looking for doesn't exist.
            </p>
            <Link 
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#1e293b] text-[#f8fafc] font-medium border border-[rgba(255,255,255,0.1)] hover:bg-[#334155] hover:border-[#6366f1] transition-all"
            >
              ← 返回首页
            </Link>
          </div>
        </article>
      </div>
    </div>
  );
}
