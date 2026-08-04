'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import ExportButton from '@/components/lab/ExportButton';
import MemoryPanel from '@/components/lab/MemoryPanel';
import AgentBadge from '@/components/agent/AgentBadge';
import AgentStatus from '@/components/agent/AgentStatus';
import { Skeleton } from '@/components/ui/Skeleton';

const ReplayPlayer = dynamic(() => import('@/components/lab/ReplayPlayer'), { ssr: false });

interface ExecutionStep {
  agent: string;
  task: string;
  output: string;
  status: string;
  timestamp: string;
}

interface Execution {
  id: string;
  prompt: string;
  status?: string;
  summary?: string;
  timestamp: string;
  steps: ExecutionStep[];
  adaptation_reason?: string[];
  memory_influence_level?: number;
  memory_influenced?: boolean;
}

export default function ExecutionDetailPage() {
  const params = useParams();
  const [execution, setExecution] = useState<Execution | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMemoryBanner, setShowMemoryBanner] = useState(true);

  useEffect(() => {
    loadExecution();
  }, []);

  const loadExecution = async () => {
    try {
      setError(null);
      const response = await fetch('/api/executions');
      const executions = await response.json();
      const found = executions.find((e: Execution) => e.id === params.id);
      if (found) {
        setExecution(found);
      }
    } catch (err) {
      console.error('加载执行记录失败:', err);
      setError('加载执行记录失败，请检查网络连接后重试。');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-[calc(100vh-144px)] py-10 sm:py-14">
        <div className="page-shell max-w-5xl space-y-6">
          <Skeleton width="120px" height="16px" />
          <div className="space-y-3 border-b border-white/[0.06] pb-8">
            <Skeleton width="56%" height="36px" />
            <Skeleton width="220px" height="16px" />
          </div>
          <Skeleton variant="rectangular" height="200px" />
          <Skeleton variant="rectangular" height="300px" />
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-[calc(100vh-144px)] items-center py-12">
        <div className="page-shell max-w-lg">
          <section className="glass-card p-8 text-center sm:p-10">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-[#F87171]/20 bg-[#F87171]/10 text-[#F87171]">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 9v3.75m9.303 3.376c.866 1.5-.217 3.374-1.949 3.374H4.646c-1.732 0-2.815-1.874-1.949-3.374L10.05 3.374c.866-1.5 3.032-1.5 3.898 0l7.354 12.752zM12 16.5h.008v.008H12V16.5z" />
              </svg>
            </div>
            <p className="section-label mb-3">EXECUTION DATA</p>
            <h2 className="mb-3 text-xl font-semibold text-[#FAFAFA]">执行记录加载失败</h2>
            <p className="mb-6 text-sm leading-6 text-[#A1A1AA]">{error}</p>
            <div className="mb-7 rounded-lg border border-white/[0.06] bg-black/20 p-4 text-left">
              <p className="mb-3 text-xs font-medium text-[#A1A1AA]">检查以下服务状态</p>
              <ul className="space-y-2 text-xs text-[#71717A]">
                {['模型服务请求配额', 'Supabase 数据连接', '本地网络连接'].map((item) => (
                  <li key={item} className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#FBBF24]" />{item}</li>
                ))}
              </ul>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <button onClick={() => { setLoading(true); loadExecution(); }} className="btn-primary">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16.023 9.348h4.992V4.356m-.997 4.993a8.25 8.25 0 10.683 8.301" />
                </svg>
                重新加载
              </button>
              <Link href="/lab" className="btn-secondary">返回实验室</Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (!execution) {
    return (
      <main className="flex min-h-[calc(100vh-144px)] items-center py-12">
        <div className="page-shell max-w-lg">
          <section className="glass-card p-10 text-center">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-[#71717A]">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5A3.375 3.375 0 0010.125 2.25H6.75A2.25 2.25 0 004.5 4.5v15a2.25 2.25 0 002.25 2.25h10.5A2.25 2.25 0 0019.5 19.5v-5.25zM9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5" />
              </svg>
            </div>
            <p className="section-label mb-3">RECORD NOT FOUND</p>
            <h2 className="mb-3 text-xl font-semibold text-[#FAFAFA]">执行记录未找到</h2>
            <p className="mb-7 text-sm leading-6 text-[#71717A]">该记录可能已被删除，请返回实验室查看其他执行。</p>
            <Link href="/lab" className="btn-primary">
              返回实验室
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </section>
        </div>
      </main>
    );
  }

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
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="badge badge-blue">执行报告</span>
              <span className="font-mono text-[11px] text-[#52525B]">{execution.id}</span>
            </div>
            <h1 className="mb-2 text-3xl font-bold text-[#FAFAFA]">执行详情</h1>
            <p className="text-sm text-[#71717A]">{new Date(execution.timestamp).toLocaleString('zh-CN')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/lab/lineage/${execution.id}`} className="btn-secondary">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M6.75 4.5a2.25 2.25 0 100 4.5 2.25 2.25 0 000-4.5zm10.5 10.5a2.25 2.25 0 100 4.5 2.25 2.25 0 000-4.5zM9 6.75h3a3 3 0 013 3v3a3 3 0 003 3" />
              </svg>
              执行谱系
            </Link>
            <ExportButton execution={execution} />
          </div>
        </header>

        {showMemoryBanner && execution.memory_influenced && (
          <section className="glass-card mb-6 border-[#3B82F6]/30 bg-[#3B82F6]/[0.06] p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#3B82F6]/20 bg-[#3B82F6]/10 text-[#60A5FA]">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8.25 6.75h7.5m-7.5 4.5h7.5m-7.5 4.5h4.5M6 21h12a2.25 2.25 0 002.25-2.25V5.25A2.25 2.25 0 0018 3H6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 006 21z" />
                  </svg>
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-[#E4E4E7]">记忆增强执行</h2>
                  <p className="mt-1 text-xs leading-5 text-[#A1A1AA]">本次执行参考了历史执行经验。</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMemoryBanner(false)}
                className="btn-ghost h-8 w-8 shrink-0 p-0"
                aria-label="关闭记忆增强提示"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </section>
        )}

        <section className="glass-card mb-6 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-4 sm:px-6">
            <div>
              <p className="section-label mb-1">INPUT</p>
              <h2 className="text-base font-semibold text-[#FAFAFA]">用户提示词</h2>
            </div>
            {execution.status && <AgentStatus status={execution.status as any} />}
          </div>
          <div className="p-5 sm:p-6">
            <p className="text-sm leading-7 text-[#D4D4D8]">{execution.prompt}</p>
            {execution.summary && (
              <div className="mt-5 rounded-lg border border-white/[0.06] bg-black/20 p-4">
                <h3 className="mb-2 text-xs font-semibold text-[#93C5FD]">执行摘要</h3>
                <p className="text-sm leading-6 text-[#A1A1AA]">{execution.summary}</p>
              </div>
            )}
          </div>
        </section>

        {execution.adaptation_reason && execution.adaptation_reason.length > 0 && (
          <section className="glass-card mb-6 overflow-hidden">
            <div className="flex flex-col gap-4 border-b border-white/[0.06] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#8B5CF6]/20 bg-[#8B5CF6]/10 text-[#C4B5FD]">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16.023 9.348h4.992V4.356m-.997 4.993a8.25 8.25 0 10.683 8.301" />
                  </svg>
                </span>
                <div>
                  <p className="section-label mb-1">ADAPTATION</p>
                  <h2 className="text-base font-semibold text-[#FAFAFA]">规划变更原因</h2>
                </div>
              </div>
              {execution.memory_influence_level !== undefined && (
                <div className="flex min-w-[190px] items-center gap-3">
                  <span className="shrink-0 text-xs text-[#71717A]">记忆影响度</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                    <div className="h-full rounded-full bg-[#8B5CF6]" style={{ width: `${(execution.memory_influence_level || 0) * 100}%` }} />
                  </div>
                  <span className="w-9 font-mono text-xs text-[#C4B5FD]">{Math.round((execution.memory_influence_level || 0) * 100)}%</span>
                </div>
              )}
            </div>
            <ol className="divide-y divide-white/[0.05] px-5 sm:px-6">
              {execution.adaptation_reason.map((reason, idx) => (
                <li key={idx} className="flex items-start gap-4 py-4">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#8B5CF6]/10 font-mono text-[10px] text-[#C4B5FD]">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <p className="text-sm leading-6 text-[#A1A1AA]">{reason}</p>
                </li>
              ))}
            </ol>
          </section>
        )}

        <section className="mb-6">
          <MemoryPanel compact={false} />
        </section>

        <section>
          <ReplayPlayer
            steps={execution.steps.map((step, index) => ({
              ...step,
              step: index + 1,
            }))}
          />
        </section>
      </div>
    </main>
  );
}
