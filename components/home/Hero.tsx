'use client';

import Link from 'next/link';

export default function Dashboard() {
  return (
    <div className="min-h-[calc(100vh-80px)] py-16 px-4">
      <div className="max-w-3xl mx-auto">

        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-[#FAFAFA] mb-4 leading-tight">
            让 AI 真正理解你的项目
          </h1>
          <p className="text-base text-[#71717A] max-w-lg mx-auto mb-8 leading-relaxed">
            保存项目上下文、技术决策和开发记忆，<br />
            一键导出给 Claude、Cursor、GPT。
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/vault"
              className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6] hover:from-[#7C3AED] hover:to-[#2563EB] text-sm font-medium text-white transition-all"
            >
              导入 GitHub 仓库
            </Link>
            <Link
              href="/prompt/discovery"
              className="px-5 py-2.5 rounded-lg border border-[rgba(255,255,255,0.1)] text-sm font-medium text-[#A1A1AA] hover:text-[#FAFAFA] hover:border-[rgba(255,255,255,0.2)] transition-all"
            >
              开始方向探索
            </Link>
          </div>
        </div>

        {/* Empty state */}
        <div className="text-center py-12">
          <div className="w-12 h-12 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] flex items-center justify-center mx-auto mb-4">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#52525B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
          </div>
          <p className="text-sm text-[#71717A] mb-1">还没有项目记忆</p>
          <p className="text-xs text-[#52525B]">导入一个 GitHub 仓库，让 AI 理解你的项目</p>
        </div>

      </div>
    </div>
  );
}
