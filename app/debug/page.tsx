'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function DebugPage() {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    runTests();
  }, []);

  const runTests = async () => {
    setLoading(true);
    try {
      // 测试 1: 检查 API 工作
      console.log('[Debug] Testing API...');
      const apiTest = await fetch('/api/executions');
      let apiResult;
      try {
        apiResult = await apiTest.json();
      } catch (e) {
        apiResult = { parseError: String(e), raw: await apiTest.text() };
      }

      // 测试 2: 检查浏览器环境变量
      const envTest = {
        NEXT_PUBLIC_SUPABASE_URL: typeof window !== 'undefined' ? 
          (process.env.NEXT_PUBLIC_SUPABASE_URL ? 
            process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 40) + '...' : 
            'not set') : 
          'not browser',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: typeof window !== 'undefined' ? 
          (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'set' : 'not set') : 
          'not browser',
      };

      setDebugInfo({
        apiTest: {
          success: apiTest.ok,
          status: apiTest.status,
          statusText: apiTest.statusText,
          data: apiResult,
        },
        envTest,
        dataCount: Array.isArray(apiResult) ? apiResult.length : (apiResult.error ? 0 : 'N/A'),
        isArray: Array.isArray(apiResult),
      });
    } catch (error) {
      console.error('[Debug] Error:', error);
      setDebugInfo({
        error: String(error),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link href="/lab" className="text-[#818cf8] hover:text-[#6366f1] flex items-center gap-2 mb-4">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            返回实验室
          </Link>
          <h1 className="text-3xl font-bold text-[#f8fafc]">调试面板</h1>
        </div>
        
        {loading ? (
          <div className="space-y-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-40 bg-[#1e293b] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="p-6 glass-card rounded-xl">
              <h2 className="text-xl font-semibold text-[#f8fafc] mb-4">
                环境变量（浏览器）
              </h2>
              <pre className="bg-[#0f172a] p-4 rounded text-[#94a3b8] text-sm overflow-auto">
                {JSON.stringify(debugInfo.envTest, null, 2)}
              </pre>
            </div>

            <div className="p-6 glass-card rounded-xl">
              <h2 className="text-xl font-semibold text-[#f8fafc] mb-4">
                API 测试：/api/executions
              </h2>
              <div className={`mb-4 px-4 py-2 rounded-lg inline-block text-sm font-medium ${
                debugInfo.apiTest?.success ? 'bg-[#10b981] text-white' : 'bg-[#ef4444] text-white'
              }`}>
                {debugInfo.apiTest?.success ? '✅ 成功' : '❌ 失败'} - 状态 {debugInfo.apiTest?.status}
              </div>
              <pre className="bg-[#0f172a] p-4 rounded text-[#94a3b8] text-sm overflow-auto max-h-96">
                {JSON.stringify(debugInfo.apiTest, null, 2)}
              </pre>
            </div>

            <div className="p-6 glass-card rounded-xl">
              <h2 className="text-xl font-semibold text-[#f8fafc] mb-4">
                数据统计
              </h2>
              <div className="text-2xl font-bold text-[#818cf8]">
                {debugInfo.dataCount} 条记录
              </div>
              {debugInfo.apiTest?.data && Array.isArray(debugInfo.apiTest.data) && debugInfo.apiTest.data.slice(0, 3) && (
                <div className="mt-4">
                  <h3 className="text-lg text-[#94a3b8] mb-2">前 3 条记录：</h3>
                  <pre className="bg-[#0f172a] p-4 rounded text-[#94a3b8] text-sm overflow-auto">
                    {JSON.stringify(debugInfo.apiTest.data.slice(0, 3), null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <button
                onClick={runTests}
                className="px-4 py-2 bg-[#6366f1] text-white rounded-lg hover:bg-[#818cf8] transition-colors"
              >
                刷新测试
              </button>
              <Link
                href="/lab"
                className="px-4 py-2 bg-[#1e293b] border border-[rgba(255,255,255,0.1)] text-[#94a3b8] rounded-lg hover:bg-[#334155] transition-colors inline-flex items-center"
              >
                前往实验室
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
