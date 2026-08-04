'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import GlassCard from '@/components/shared/GlassCard';
import AgentBadge from '@/components/agent/AgentBadge';
import AgentStatus from '@/components/agent/AgentStatus';
import SearchBar from '@/components/lab/SearchBar';
import Filters from '@/components/lab/Filters';
import AnalyticsPanel from '@/components/lab/AnalyticsPanel';
import MemoryPanel from '@/components/lab/MemoryPanel';
import QualityScorePanel from '@/components/lab/QualityScorePanel';

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
  status?: string;
  memory_influenced?: boolean;
  memories_used?: any[];
  planner_adapted?: boolean;
  created_at?: string;
  timestamp?: string;
}

interface MemoryMetrics {
  total_memories: number;
  recall_count: number;
  reuse_success_rate: number;
  planner_adaptation_rate: number;
}

export default function LabPage() {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [memoryMetrics, setMemoryMetrics] = useState<MemoryMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [agentFilter, setAgentFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'newest' | 'fastest' | 'slowest'>('newest');
  const [selectedExecution, setSelectedExecution] = useState<Execution | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/executions');
      const data = await response.json();
      setExecutions(data);
      if (data.length > 0) {
        setSelectedExecution(data[0]);
      }

      const mockMetrics: MemoryMetrics = {
        total_memories: data.length,
        recall_count: Math.floor(data.length * 0.7),
        reuse_success_rate: 0.85,
        planner_adaptation_rate: 0.6
      };
      setMemoryMetrics(mockMetrics);
    } catch (err) {
      console.error('加载数据失败:', err);
      setError('加载执行数据失败，请检查网络连接后重试。');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredExecutions = useMemo(() => {
    return executions.filter((execution) => {
      const matchesSearch = searchQuery === '' ||
        execution.prompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        execution.steps.some(step =>
          step.agent.toLowerCase().includes(searchQuery.toLowerCase()) ||
          step.task.toLowerCase().includes(searchQuery.toLowerCase())
        );

      const matchesStatus = statusFilter === 'all' || execution.status === statusFilter;
      const matchesAgent = agentFilter === 'all' ||
        execution.steps.some(step => step.agent === agentFilter);

      let matchesDate = true;
      if (dateFilter !== 'all') {
        const execDate = new Date(execution.timestamp || execution.created_at || '');
        const now = new Date();
        if (dateFilter === 'today') {
          matchesDate = execDate.toDateString() === now.toDateString();
        } else if (dateFilter === '7d') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          matchesDate = execDate >= weekAgo;
        } else if (dateFilter === '30d') {
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          matchesDate = execDate >= monthAgo;
        }
      }

      return matchesSearch && matchesStatus && matchesAgent && matchesDate;
    }).sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.timestamp || b.created_at || 0).getTime() -
          new Date(a.timestamp || a.created_at || 0).getTime();
      } else if (sortBy === 'fastest') {
        return a.steps.length - b.steps.length;
      } else {
        return b.steps.length - a.steps.length;
      }
    });
  }, [executions, searchQuery, statusFilter, agentFilter, dateFilter, sortBy]);

  if (loading) {
    return (
      <main className="min-h-[calc(100vh-144px)] py-10 sm:py-14">
        <div className="page-shell max-w-7xl">
          <div className="animate-pulse space-y-8">
            <div className="space-y-3 border-b border-white/[0.06] pb-8">
              <div className="h-5 w-24 rounded bg-white/[0.05]" />
              <div className="h-9 w-56 rounded bg-white/[0.06]" />
              <div className="h-4 w-96 max-w-full rounded bg-white/[0.04]" />
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-24 rounded-lg border border-white/[0.05] bg-white/[0.025]" />
              ))}
            </div>
            <div className="h-44 rounded-lg border border-white/[0.05] bg-white/[0.025]" />
            <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-32 rounded-lg border border-white/[0.05] bg-white/[0.025]" />
                ))}
              </div>
              <div className="h-96 rounded-lg border border-white/[0.05] bg-white/[0.025]" />
            </div>
          </div>
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
            <p className="section-label mb-3">DATA CONNECTION</p>
            <h2 className="mb-3 text-xl font-semibold text-[#FAFAFA]">加载失败</h2>
            <p className="mb-6 text-sm leading-6 text-[#A1A1AA]">{error}</p>
            <div className="mb-7 rounded-lg border border-white/[0.06] bg-black/20 p-4 text-left">
              <p className="mb-3 text-xs font-medium text-[#A1A1AA]">检查以下服务状态</p>
              <ul className="space-y-2 text-xs text-[#71717A]">
                <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#FBBF24]" />模型服务请求配额</li>
                <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#FBBF24]" />Supabase 数据连接</li>
              </ul>
            </div>
            <button onClick={loadData} className="btn-primary">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16.023 9.348h4.992V4.356m-.997 4.993a8.25 8.25 0 10.683 8.301" />
              </svg>
              重新加载
            </button>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-144px)] py-10 sm:py-14">
      <div className="page-shell max-w-7xl">
        <header className="mb-8 flex flex-col gap-6 border-b border-white/[0.06] pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="badge badge-green mb-4">
              <span className="h-1.5 w-1.5 rounded-full bg-[#34D399] shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
              运行观测台
            </span>
            <h1 className="mb-2 text-3xl font-bold text-[#FAFAFA]">实验室</h1>
            <p className="max-w-2xl text-sm leading-6 text-[#A1A1AA]">
              观察 AI 工程代理的工作流程、记忆影响和自适应规划行为。
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-[#71717A]">
            <div>
              <p className="font-mono text-lg font-semibold text-[#FAFAFA]">{executions.length}</p>
              <p>执行总数</p>
            </div>
            <span className="h-8 w-px bg-white/[0.08]" />
            <div>
              <p className="font-mono text-lg font-semibold text-[#C4B5FD]">{memoryMetrics?.recall_count ?? 0}</p>
              <p>记忆召回</p>
            </div>
          </div>
        </header>

        <section className="mb-6">
          <AnalyticsPanel executions={filteredExecutions.map(e => ({
            ...e,
            timestamp: e.timestamp || e.created_at || '',
          }))} />
        </section>

        <section className="mb-6">
          <MemoryPanel
            memories={[]}
            memoryInfluenced={false}
            adaptations={[]}
          />
        </section>

        <section className="glass-card mb-6 p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="min-w-0 flex-1">
              <SearchBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
              />
            </div>
            <Filters
              statusFilter={statusFilter}
              agentFilter={agentFilter}
              dateFilter={dateFilter}
              onStatusFilterChange={setStatusFilter}
              onAgentFilterChange={setAgentFilter}
              onDateFilterChange={setDateFilter}
            />
            <div className="flex items-center gap-2 border-t border-white/[0.06] pt-3 xl:border-l xl:border-t-0 xl:pl-3 xl:pt-0">
              <svg className="h-4 w-4 shrink-0 text-[#52525B]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 4.5h18M6.75 9h10.5M10.5 13.5h3M12 18v-4.5" />
              </svg>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'newest' | 'fastest' | 'slowest')}
                className="input-field min-w-[128px] cursor-pointer appearance-none py-2"
                aria-label="执行记录排序"
              >
                <option value="newest">最新优先</option>
                <option value="fastest">最快完成</option>
                <option value="slowest">最慢完成</option>
              </select>
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <section className="min-w-0 space-y-3" aria-label="执行记录列表">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-semibold text-[#D4D4D8]">执行记录</h2>
              <span className="text-xs text-[#52525B]">{filteredExecutions.length} 条结果</span>
            </div>
            {filteredExecutions.length === 0 ? (
              <GlassCard className="p-10 text-center">
                <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-[#71717A]">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9zm3.75 11.625a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                  </svg>
                </div>
                <h3 className="mb-2 font-medium text-[#FAFAFA]">没有匹配的执行记录</h3>
                <p className="mx-auto mb-6 max-w-sm text-sm leading-6 text-[#71717A]">
                  调整筛选条件，或前往 Playground 启动新的智能执行。
                </p>
                <Link href="/playground" className="btn-primary">
                  启动执行
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </GlassCard>
            ) : (
              filteredExecutions.map((execution) => (
                <button
                  key={execution.id}
                  type="button"
                  onClick={() => setSelectedExecution(execution)}
                  className={`glass-card w-full p-4 text-left transition-all ${
                    selectedExecution?.id === execution.id
                      ? 'border-[#3B82F6]/50 bg-[#3B82F6]/[0.06] shadow-[inset_3px_0_0_#3B82F6]'
                      : 'hover:border-white/[0.14] hover:bg-white/[0.025]'
                  }`}
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <AgentStatus status={(execution.status as any) || 'completed'} size="sm" />
                      <span className="font-mono text-[11px] text-[#52525B]">
                        {execution.id.substring(0, 8)}
                      </span>
                    </div>
                    <span className="text-[11px] text-[#71717A]">
                      {new Date(execution.timestamp || execution.created_at || '').toLocaleString('zh-CN')}
                    </span>
                  </div>

                  <p className="mb-4 line-clamp-2 text-sm font-medium leading-6 text-[#E4E4E7]">
                    {execution.prompt}
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-1.5">
                      {execution.steps.map((step, index) => (
                        <span key={index} className="flex items-center gap-1">
                          <AgentBadge agent={step.agent} size="sm" />
                          {step.status === 'completed' && (
                            <svg className="h-3 w-3 text-[#34D399]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12.75l4.5 4.5L19 6.75" />
                            </svg>
                          )}
                        </span>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {execution.memory_influenced && (
                        <span className="badge badge-blue py-0.5">
                          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8.25 6.75h7.5m-7.5 4.5h7.5m-7.5 4.5h4.5M6 21h12a2.25 2.25 0 002.25-2.25V5.25A2.25 2.25 0 0018 3H6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 006 21z" />
                          </svg>
                          记忆驱动
                        </span>
                      )}
                      {execution.planner_adapted && (
                        <span className="badge badge-violet py-0.5">
                          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16.023 9.348h4.992V4.356m-.997 4.993a8.25 8.25 0 10.683 8.301" />
                          </svg>
                          自适应
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </section>

          <section className="min-w-0" aria-label="执行详情预览">
            {selectedExecution ? (
              <div className="sticky top-24">
                <GlassCard className="overflow-hidden">
                  <div className="flex items-center justify-between gap-4 border-b border-white/[0.06] px-5 py-4 sm:px-6">
                    <div>
                      <p className="section-label mb-1">EXECUTION DETAIL</p>
                      <h2 className="text-lg font-semibold text-[#FAFAFA]">执行详情</h2>
                    </div>
                    <Link href={`/lab/${selectedExecution.id}`} className="btn-ghost text-[#60A5FA]">
                      完整报告
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </Link>
                  </div>

                  <div className="p-5 sm:p-6">
                    <div className="mb-5 rounded-lg border border-white/[0.06] bg-black/20 p-4">
                      <p className="text-sm font-medium leading-6 text-[#E4E4E7]">{selectedExecution.prompt}</p>
                    </div>

                    <QualityScorePanel steps={selectedExecution.steps} />

                    <div className="mb-6 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-[#D4D4D8]">执行步骤</h3>
                        <span className="font-mono text-xs text-[#52525B]">{selectedExecution.steps.length} STEPS</span>
                      </div>
                      {selectedExecution.steps.map((step, index) => (
                        <div key={index} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
                          <div className="mb-2 flex flex-wrap items-center gap-2.5">
                            <span className="font-mono text-[10px] text-[#52525B]">{String(index + 1).padStart(2, '0')}</span>
                            <AgentBadge agent={step.agent} size="sm" />
                            <AgentStatus status={step.status === 'executing' ? 'executing' : 'completed'} size="sm" />
                          </div>
                          <p className="text-sm leading-6 text-[#A1A1AA]">{step.task}</p>
                          {step.output && (
                            <pre className="mt-3 line-clamp-6 whitespace-pre-wrap rounded-lg border border-white/[0.04] bg-black/30 p-3 font-mono text-xs leading-5 text-[#71717A]">
                              {step.output}
                            </pre>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-2 border-t border-white/[0.06] pt-5">
                      <Link href={`/lab/${selectedExecution.id}`} className="btn-secondary">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        详情视图
                      </Link>
                      <Link href="/lab/compare" className="btn-secondary">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M6.75 3v18M17.25 3v18M3.75 6h6m4.5 0h6m-16.5 6h6m4.5 0h6m-16.5 6h6m4.5 0h6" />
                        </svg>
                        对比分析
                      </Link>
                    </div>
                  </div>
                </GlassCard>
              </div>
            ) : (
              <GlassCard className="p-12 text-center">
                <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-[#71717A]">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5" />
                  </svg>
                </div>
                <h3 className="mb-2 font-medium text-[#FAFAFA]">选择一条执行记录</h3>
                <p className="text-sm text-[#71717A]">从列表中选择记录以预览详情。</p>
              </GlassCard>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
