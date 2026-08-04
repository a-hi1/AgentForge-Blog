'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MemoryPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/projects');
  }, [router]);

  return (
    <div className="page-shell py-24 flex items-center justify-center">
      <div className="glass-card text-center py-12 px-8 max-w-sm w-full">
        <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-4 text-blue-300">
          <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-white mb-2">跳转中…</h2>
        <p className="text-sm text-[var(--text-tertiary)]">
          正在重定向到项目记忆页面
        </p>
      </div>
    </div>
  );
}
