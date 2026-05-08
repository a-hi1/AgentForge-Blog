'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import GlassCard from '@/components/shared/GlassCard';
import AgentBadge from '@/components/agent/AgentBadge';

interface ExecutionStep {
  agent: string;
  task: string;
  output: string;
  status: 'pending' | 'executing' | 'completed';
  timestamp: string;
}

interface Execution {
  id: string;
  prompt: string;
  steps: ExecutionStep[];
  timestamp: string;
}

export default function RecentExecutions() {
  const [latestExecution, setLatestExecution] = useState<Execution | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch('/api/executions');
        const data = await response.json();
        if (data.length > 0) {
          setLatestExecution(data[0]);
        }
      } catch (error) {
        console.error('加载执行数据失败:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <section className="py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-[#1e293b] rounded w-48" />
            <div className="h-40 bg-[#1e293b] rounded-xl" />
          </div>
        </div>
      </section>
    );
  }

  if (!latestExecution) {
    return (
      <section className="py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <GlassCard className="p-8 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] flex items-center justify-center">
              <svg className="w-7 h-7 text-[#475569]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
            </div>
            <h3 className="text-[#f8fafc] font-medium mb-2">系统已就绪，等待首次执行</h3>
            <p className="text-[#64748b] text-sm mb-5 max-w-md mx-auto">
              前往 Playground 启动第一次智能执行，系统将自动记录并展示工程活动。
            </p>
            <Link
              href="/playground"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] text-white text-sm font-medium hover:shadow-lg hover:shadow-[rgba(99,102,241,0.3)] transition-all"
            >
              启动首次执行
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </GlassCard>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-[#f8fafc]">最新执行记录</h2>
            <p className="text-[#64748b] text-xs mt-0.5">
              {new Date(latestExecution.timestamp).toLocaleString('zh-CN')}
            </p>
          </div>
          <Link href="/lab" className="text-[#818cf8] hover:text-[#6366f1] text-xs font-medium flex items-center gap-1 transition-colors">
            查看全部
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        <GlassCard className="p-5">
          <h3 className="text-[#f8fafc] text-sm font-medium mb-4 line-clamp-1">
            {latestExecution.prompt}
          </h3>
          <div className="space-y-2.5">
            {latestExecution.steps.slice(0, 3).map((step, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-[#0f172a] rounded-lg border border-[rgba(255,255,255,0.04)]">
                <div className="text-[#475569] text-xs font-mono mt-0.5 shrink-0">{index + 1}</div>
                <div className="flex-grow min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <AgentBadge agent={step.agent} size="sm" />
                    <span className="text-[#94a3b8] text-xs truncate">{step.task}</span>
                  </div>
                  <p className="text-[#64748b] text-xs line-clamp-2 leading-relaxed">{step.output}</p>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </section>
  );
}
