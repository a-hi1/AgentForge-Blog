'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const LineageGraph = dynamic(() => import('@/components/lab/LineageGraph'), { ssr: false });

export default function LineagePage() {
  const params = useParams();
  const executionId = params.id as string;

  return (
    <main className="min-h-[calc(100vh-144px)] py-10 sm:py-14">
      <div className="page-shell max-w-5xl">
        <Link href="/lab" className="btn-ghost mb-7 text-[#60A5FA]">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 19l-7-7 7-7" />
          </svg>
          返回实验室
        </Link>

        <header className="mb-8 flex flex-col gap-6 border-b border-white/[0.06] pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="badge badge-violet mb-4">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M6.75 4.5a2.25 2.25 0 100 4.5 2.25 2.25 0 000-4.5zm10.5 10.5a2.25 2.25 0 100 4.5 2.25 2.25 0 000-4.5zM9 6.75h3a3 3 0 013 3v3a3 3 0 003 3" />
              </svg>
              关系视图
            </span>
            <h1 className="mb-3 text-3xl font-bold text-[#FAFAFA]">执行谱系</h1>
            <p className="max-w-2xl text-sm leading-6 text-[#A1A1AA]">追踪相关执行之间的派生关系、状态与时间顺序。</p>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3">
            <p className="section-label mb-1">ROOT EXECUTION</p>
            <p className="max-w-[220px] truncate font-mono text-xs text-[#C4B5FD]" title={executionId}>{executionId}</p>
          </div>
        </header>

        <section className="relative">
          <div className="mb-4 flex items-center justify-between gap-4 px-1">
            <div>
              <p className="section-label mb-1">LINEAGE GRAPH</p>
              <h2 className="text-sm font-semibold text-[#D4D4D8]">执行关系链</h2>
            </div>
            <span className="flex items-center gap-2 text-xs text-[#71717A]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#8B5CF6] shadow-[0_0_10px_rgba(139,92,246,0.7)]" />
              当前执行
            </span>
          </div>
          <LineageGraph executionId={executionId} />
        </section>
      </div>
    </main>
  );
}
