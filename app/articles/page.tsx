import Link from 'next/link';

export default function ArticlesPage() {
  return (
    <main className="min-h-[calc(100vh-144px)] py-10 sm:py-14">
      <div className="page-shell max-w-5xl">
        <header className="mb-10 border-b border-white/[0.06] pb-10 sm:mb-12 sm:pb-12">
          <span className="badge badge-violet mb-5">
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5A3.375 3.375 0 0010.125 2.25H6.75A2.25 2.25 0 004.5 4.5v15a2.25 2.25 0 002.25 2.25h10.5A2.25 2.25 0 0019.5 19.5v-5.25z" />
            </svg>
            知识库
          </span>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="mb-3 text-3xl font-bold text-[#FAFAFA] sm:text-4xl">技术文章</h1>
              <p className="max-w-xl text-sm leading-7 text-[#A1A1AA] sm:text-base">
                Agent 系统设计、工程实践与生产问题的深度解析。
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-[#71717A]">
              <span className="font-mono text-[#A78BFA]">00</span>
              <span className="h-3 w-px bg-white/10" />
              <span>已发布文章</span>
            </div>
          </div>
        </header>

        <section className="glass-card overflow-hidden" aria-labelledby="articles-empty-title">
          <div className="grid min-h-[320px] md:grid-cols-[1fr_280px]">
            <div className="flex flex-col justify-center p-8 sm:p-10">
              <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-lg border border-[#8B5CF6]/20 bg-[#8B5CF6]/10 text-[#C4B5FD]">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5A3.375 3.375 0 0010.125 2.25H6.75A2.25 2.25 0 004.5 4.5v15a2.25 2.25 0 002.25 2.25h10.5A2.25 2.25 0 0019.5 19.5v-5.25zM8.25 15h7.5M8.25 18h4.5" />
                </svg>
              </div>
              <p className="section-label mb-3">EDITORIAL QUEUE</p>
              <h2 id="articles-empty-title" className="mb-3 text-xl font-semibold text-[#FAFAFA]">第一批工程文章正在整理</h2>
              <p className="max-w-lg text-sm leading-6 text-[#71717A]">
                内容将覆盖多代理编排、长期记忆、评估体系与生产部署。发布后会在此处形成可检索的技术档案。
              </p>
              <div className="mt-7">
                <Link href="/" className="btn-secondary">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 12l9-9 9 9M5.25 10.5v9.75h13.5V10.5M9 20.25v-6h6v6" />
                  </svg>
                  返回首页
                </Link>
              </div>
            </div>

            <div className="hidden border-l border-white/[0.06] bg-white/[0.015] p-8 md:flex md:flex-col md:justify-center">
              <p className="section-label mb-5">TOPICS</p>
              <div className="space-y-4">
                {['Agent 架构', '记忆与检索', '质量评估', '生产部署'].map((topic, index) => (
                  <div key={topic} className="flex items-center gap-3 text-sm text-[#A1A1AA]">
                    <span className="font-mono text-[10px] text-[#52525B]">0{index + 1}</span>
                    <span className="h-px flex-1 bg-white/[0.06]" />
                    <span>{topic}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
