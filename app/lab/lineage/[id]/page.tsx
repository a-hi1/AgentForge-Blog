'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const LineageGraph = dynamic(() => import('@/components/lab/LineageGraph'), { ssr: false });

export default function LineagePage() {
  const params = useParams();
  const executionId = params.id as string;
  
  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link href="/lab" className="text-[#818cf8] hover:text-[#6366f1] flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            返回实验室
          </Link>
          <h1 className="text-3xl font-bold text-[#f8fafc] mt-4">执行谱系</h1>
          <p className="text-[#94a3b8]">查看相关执行之间的关联关系</p>
        </div>
        
        <LineageGraph executionId={executionId} />
      </div>
    </div>
  );
}
