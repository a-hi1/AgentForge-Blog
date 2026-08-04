'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Execution {
  id: string;
  prompt: string;
  timestamp: string;
  status?: string;
}

interface LineageGraphProps {
  executionId: string;
}

function ChartEmptyIcon() {
  return (
    <svg className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

export default function LineageGraph({ executionId }: LineageGraphProps) {
  const [lineage, setLineage] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLineage();
  }, [executionId]);

  async function loadLineage() {
    try {
      const response = await fetch(`/api/executions?lineage=${executionId}`);
      if (response.ok) {
        const data = await response.json();
        setLineage(data.lineage || [data]);
      }
    } catch (error) {
      console.error('Failed to load lineage:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="w-8 h-8 border-2 border-[rgba(139,92,246,0.3)] border-t-[#8B5CF6] rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[var(--text-secondary)]">加载执行谱系中...</p>
      </div>
    );
  }

  if (lineage.length === 0) {
    return (
      <div className="p-8 text-center glass-card rounded-lg">
        <ChartEmptyIcon />
        <p className="text-[var(--text-secondary)] mb-2">暂无谱系数据</p>
        <p className="text-[var(--text-tertiary)] text-sm">多执行几次任务后，系统将自动展示执行间的关联关系。</p>
      </div>
    );
  }

  return (
    <div className="p-6 glass-card rounded-xl">
      <h3 className="text-xl font-semibold text-[var(--text)] mb-6">执行谱系</h3>

      <div className="relative">
        {lineage.map((exec, index) => (
          <div key={exec.id} className="relative">
            {index < lineage.length - 1 && (
              <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-gradient-to-b from-[rgba(139,92,246,0.5)] to-transparent" />
            )}

            <div className="flex items-start gap-4 pb-6">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 z-10 ${
                exec.id === executionId
                  ? 'bg-gradient-to-br from-[#8B5CF6] to-[#3B82F6] text-white'
                  : 'bg-[var(--surface-solid)] border border-[var(--border-light)] text-[var(--text-tertiary)]'
              }`}>
                {exec.id === executionId ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                )}
              </div>

              <div className="flex-1">
                <Link
                  href={`/lab/${exec.id}`}
                  className={`block p-4 rounded-lg border transition-all ${
                    exec.id === executionId
                      ? 'border-[rgba(139,92,246,0.5)] bg-[rgba(139,92,246,0.1)]'
                      : 'border-[var(--border)] hover:border-[var(--border-light)] hover:bg-[rgba(255,255,255,0.03)]'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-[#A78BFA] font-medium">
                      {new Date(exec.timestamp).toLocaleString()}
                    </span>
                    {exec.status && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        exec.status === 'completed' ? 'badge badge-green' :
                        exec.status === 'failed' ? 'bg-red-500/20 text-red-400 border border-red-500/25' :
                        'badge badge-amber'
                      }`}>
                        {exec.status}
                      </span>
                    )}
                  </div>
                  <p className="text-[var(--text-secondary)] text-sm line-clamp-2">
                    {exec.prompt}
                  </p>
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
