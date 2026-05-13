'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MemoryPage() {
  const router = useRouter();

  useEffect(() => {
    // 重定向到 projects 页面
    router.replace('/projects');
  }, [router]);

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-4">🔄</div>
        <h2 className="text-lg font-semibold text-white mb-2">跳转中...</h2>
        <p className="text-gray-400">正在重定向到项目管理页面</p>
      </div>
    </div>
  );
}
