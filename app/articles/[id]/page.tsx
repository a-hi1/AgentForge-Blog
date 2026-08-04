import Link from 'next/link';

export default function ArticlePage({ params }: { params: { id: string } }) {
  return (
    <main className="min-h-[calc(100vh-144px)] py-10 sm:py-14">
      <div className="page-shell max-w-4xl">
        <Link href="/articles" className="btn-ghost mb-10 text-[#A78BFA] hover:text-[#C4B5FD]">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 19l-7-7 7-7" />
          </svg>
          返回文章列表
        </Link>

        <article className="glass-card overflow-hidden">
          <div className="border-b border-white/[0.06] px-6 py-5 sm:px-8">
            <div className="flex items-center justify-between gap-4">
              <span className="badge badge-violet">文章档案</span>
              <span className="font-mono text-[10px] text-[#52525B]">/articles/{params.id}</span>
            </div>
          </div>
          <div className="flex min-h-[420px] flex-col items-center justify-center px-6 py-16 text-center sm:px-10">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl border border-[#60A5FA]/20 bg-[#60A5FA]/10 text-[#93C5FD]">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5A3.375 3.375 0 0010.125 2.25H6.75A2.25 2.25 0 004.5 4.5v15a2.25 2.25 0 002.25 2.25h10.5A2.25 2.25 0 0019.5 19.5v-5.25zM8.25 15h7.5M8.25 18h4.5" />
              </svg>
            </div>
            <p className="section-label mb-3">RECORD NOT FOUND</p>
            <h1 className="mb-4 text-2xl font-bold text-[#FAFAFA] sm:text-3xl">文章未找到</h1>
            <p className="mb-8 max-w-md text-sm leading-6 text-[#71717A]">
              您访问的文章不存在或已被移除。返回内容索引查看当前可用的技术档案。
            </p>
            <Link href="/articles" className="btn-primary">
              返回文章列表
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </article>
      </div>
    </main>
  );
}
