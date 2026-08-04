'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function DebugPage() {
  const [debugInfo, setDebugInfo] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    runTests();
  }, []);

  const runTests = async () => {
    setLoading(true);
    try {
      const apiTest = await fetch('/api/executions');
      let apiResult: unknown;
      try {
        apiResult = await apiTest.json();
      } catch (e) {
        apiResult = { parseError: String(e), raw: await apiTest.text() };
      }

      const envTest = {
        NEXT_PUBLIC_SUPABASE_URL:
          typeof window !== 'undefined'
            ? process.env.NEXT_PUBLIC_SUPABASE_URL
              ? process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 40) + '...'
              : 'not set'
            : 'not browser',
        NEXT_PUBLIC_SUPABASE_ANON_KEY:
          typeof window !== 'undefined'
            ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
              ? 'set'
              : 'not set'
            : 'not browser',
      };

      setDebugInfo({
        apiTest: {
          success: apiTest.ok,
          status: apiTest.status,
          statusText: apiTest.statusText,
          data: apiResult,
        },
        envTest,
        dataCount: Array.isArray(apiResult)
          ? apiResult.length
          : apiResult && typeof apiResult === 'object' && 'error' in (apiResult as object)
            ? 0
            : 'N/A',
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

  const apiTest = debugInfo.apiTest as
    | { success?: boolean; status?: number; data?: unknown }
    | undefined;

  return (
    <div className="page-shell py-12 sm:py-16">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 animate-fade-up">
          <Link href="/lab" className="btn-ghost mb-4 inline-flex">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            返回实验室
          </Link>
          <span className="badge badge-amber mb-4 block w-fit">Diagnostics</span>
          <h1 className="text-3xl font-bold tracking-tight text-white">调试面板</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            检查浏览器环境变量与 `/api/executions` 连通性
          </p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 glass-card shimmer" />
            ))}
          </div>
        ) : (
          <div className="space-y-6 animate-fade-up animate-delay-1">
            <div className="glass-card p-5 sm:p-6">
              <h2 className="text-base font-semibold text-white mb-4">环境变量（浏览器）</h2>
              <pre className="bg-black/30 border border-[var(--border)] p-4 rounded-xl text-[var(--text-tertiary)] text-sm overflow-auto font-mono">
                {JSON.stringify(debugInfo.envTest, null, 2)}
              </pre>
            </div>

            <div className="glass-card p-5 sm:p-6">
              <h2 className="text-base font-semibold text-white mb-4">
                API 测试：/api/executions
              </h2>
              <div
                className={`mb-4 px-3 py-1.5 rounded-md inline-flex text-xs font-medium ${
                  apiTest?.success
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25'
                    : 'bg-red-500/15 text-red-300 border border-red-500/25'
                }`}
              >
                {apiTest?.success ? '成功' : '失败'} · 状态 {apiTest?.status}
              </div>
              <pre className="bg-black/30 border border-[var(--border)] p-4 rounded-xl text-[var(--text-tertiary)] text-sm overflow-auto max-h-96 font-mono">
                {JSON.stringify(debugInfo.apiTest, null, 2)}
              </pre>
            </div>

            <div className="glass-card p-5 sm:p-6">
              <h2 className="text-base font-semibold text-white mb-4">数据统计</h2>
              <div className="text-2xl font-bold text-violet-300">
                {debugInfo.dataCount == null ? '—' : String(debugInfo.dataCount as string | number)} 条记录
              </div>
              {Array.isArray(apiTest?.data) ? (
                <div className="mt-4">
                  <h3 className="text-sm text-[var(--text-muted)] mb-2">前 3 条记录</h3>
                  <pre className="bg-black/30 border border-[var(--border)] p-4 rounded-xl text-[var(--text-tertiary)] text-sm overflow-auto font-mono">
                    {JSON.stringify((apiTest!.data as unknown[]).slice(0, 3), null, 2)}
                  </pre>
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={runTests} className="btn-primary">
                刷新测试
              </button>
              <Link href="/lab" className="btn-secondary">
                前往实验室
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
