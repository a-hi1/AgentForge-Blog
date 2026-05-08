'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import GlassCard from '@/components/shared/GlassCard';
import AgentBadge from '@/components/agent/AgentBadge';
import AgentStatus from '@/components/agent/AgentStatus';
import AnalyticsPanel from '@/components/lab/AnalyticsPanel';
import SearchBar from '@/components/lab/SearchBar';
import Filters from '@/components/lab/Filters';
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
      <div className="min-h-screen py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-[rgba(24,24,27,0.72)] rounded w-48" />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-24 bg-[rgba(24,24,27,0.72)] rounded-xl" />
              ))}
            </div>
            <div className="h-64 bg-[rgba(24,24,27,0.72)] rounded-xl" />
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-[rgba(24,24,27,0.72)] rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen py-16 px-4 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-[#FAFAFA] mb-3">加载失败</h2>
          <p className="text-[#71717A] text-sm mb-4">{error}</p>
          <div className="p-4 bg-[#1e293b] rounded-lg text-left mb-6">
            <p className="text-[#71717A] text-xs mb-2">可能原因：</p>
            <ul className="text-[#52525B] text-xs space-y-1">
              <li>• 模型服务限流</li>
              <li>• Supabase 未连接</li>
            </ul>
            <p className="text-[#71717A] text-xs mt-3">建议：重新执行 或 检查环境变量</p>
          </div>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-[#3B82F6] text-white rounded-lg hover:bg-[#60A5FA] transition-colors text-sm"
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#FAFAFA] mb-2">实验室</h1>
          <p className="text-[#71717A] text-sm">
            观察 AI 工程代理的工作流程、记忆影响和自适应规划行为。
          </p>
        </div>

        <AnalyticsPanel executions={filteredExecutions.map(e => ({
          ...e,
          timestamp: e.timestamp || e.created_at || '',
        }))} />

        <div className="mb-6">
          <MemoryPanel
            memories={[]}
            memoryInfluenced={false}
            adaptations={[]}
          />
        </div>

        <div className="flex flex-col lg:flex-row gap-3 mb-6">
          <SearchBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
          <Filters
            statusFilter={statusFilter}
            agentFilter={agentFilter}
            dateFilter={dateFilter}
            onStatusFilterChange={setStatusFilter}
            onAgentFilterChange={setAgentFilter}
            onDateFilterChange={setDateFilter}
          />
          <div className="flex gap-2 items-center">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'newest' | 'fastest' | 'slowest')}
              className="px-3 py-2 bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#FAFAFA] focus:outline-none focus:border-[#3B82F6] transition-all appearance-none cursor-pointer"
            >
              <option value="newest">最新优先</option>
              <option value="fastest">最快完成</option>
              <option value="slowest">最慢完成</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="lg:w-1/2 space-y-4">
            {filteredExecutions.length === 0 ? (
              <GlassCard className="p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] flex items-center justify-center">
                  <svg className="w-8 h-8 text-[#71717A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9zm3.75 11.625a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                  </svg>
                </div>
                <h3 className="text-[#FAFAFA] font-medium mb-2">还没有执行记录</h3>
                <p className="text-[#71717A] text-sm mb-6">
                  前往 Playground 启动第一次智能执行，此处将实时记录所有工程活动。
                </p>
                <Link
                  href="/playground"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white text-sm font-medium hover:-translate-y-0.5 transition-all"
                >
                  启动首次执行
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </GlassCard>
            ) : (
              filteredExecutions.map((execution) => (
                <div
                  key={execution.id}
                  onClick={() => setSelectedExecution(execution)}
                  className={`cursor-pointer transition-all rounded-xl ${
                    selectedExecution?.id === execution.id
                      ? 'ring-2 ring-[#3B82F6] bg-[rgba(59,130,246,0.05)]'
                      : 'hover:bg-[rgba(255,255,255,0.02)]'
                  }`}
                >
                  <GlassCard className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <AgentStatus status={(execution.status as any) || 'completed'} size="sm" />
                        <span className="text-[#71717A] text-xs font-mono">
                          {execution.id.substring(0, 8)}...
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {execution.memory_influenced && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-[rgba(59,130,246,0.2)] text-[#60A5FA]">
                            🧠 记忆驱动
                          </span>
                        )}
                        {execution.planner_adapted && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-[rgba(139,92,246,0.2)] text-[#A78BFA]">
                            🔄 自适应
                          </span>
                        )}
                        <span className="text-[#71717A] text-xs">
                          {new Date(execution.timestamp || execution.created_at || '').toLocaleString('zh-CN')}
                        </span>
                      </div>
                    </div>

                    <p className="text-[#FAFAFA] font-medium mb-3 line-clamp-2">
                      {execution.prompt}
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {execution.steps.map((step, index) => (
                        <div key={index} className="flex items-center gap-1">
                          <AgentBadge agent={step.agent} size="sm" />
                          {step.status === 'completed' && (
                            <span className="text-[#10B981] text-xs">✓</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                </div>
              ))
            )}
          </div>

          <div className="lg:w-1/2">
            {selectedExecution ? (
              <div className="sticky top-24">
                <GlassCard className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-[#FAFAFA]">执行详情</h2>
                    <Link
                      href={`/lab/${selectedExecution.id}`}
                      className="text-sm text-[#60A5FA] hover:text-[#3B82F6] transition-colors"
                    >
                      查看完整报告 →
                    </Link>
                  </div>

                  <div className="mb-4 p-3 bg-[#111113] rounded-lg border border-[rgba(255,255,255,0.05)]">
                    <p className="text-[#FAFAFA] text-sm font-medium">{selectedExecution.prompt}</p>
                  </div>

                  <QualityScorePanel steps={selectedExecution.steps} />

                  <div className="space-y-3 mb-6">
                    <h3 className="text-sm font-semibold text-[#FAFAFA]">执行步骤</h3>
                    {selectedExecution.steps.map((step, index) => (
                      <div key={index} className="p-4 rounded-lg border border-[rgba(255,255,255,0.06)] bg-[#111113]">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-xs text-[#71717A] font-mono">#{index + 1}</span>
                          <AgentBadge agent={step.agent} size="sm" />
                          <AgentStatus status={step.status === 'executing' ? 'executing' : 'completed'} size="sm" />
                        </div>
                        <p className="text-[#A1A1AA] text-sm mb-2">{step.task}</p>
                        {step.output && (
                          <pre className="text-[#71717A] text-xs font-mono whitespace-pre-wrap line-clamp-6 mt-2 p-3 bg-[rgba(0,0,0,0.2)] rounded border border-[rgba(255,255,255,0.03)]">
                            {step.output}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/lab/${selectedExecution.id}`}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[rgba(24,24,27,0.72)] border border-[rgba(255,255,255,0.1)] rounded-lg text-[#A1A1AA] hover:text-[#FAFAFA] hover:border-[rgba(255,255,255,0.2)] transition-all text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      详情视图
                    </Link>
                    <Link
                      href="/lab/compare"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[rgba(24,24,27,0.72)] border border-[rgba(255,255,255,0.1)] rounded-lg text-[#A1A1AA] hover:text-[#FAFAFA] hover:border-[rgba(255,255,255,0.2)] transition-all text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      对比分析
                    </Link>
                  </div>
                </GlassCard>
              </div>
            ) : (
              <GlassCard className="p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] flex items-center justify-center">
                  <svg className="w-8 h-8 text-[#71717A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                  </svg>
                </div>
                <h3 className="text-[#FAFAFA] font-medium mb-2">选择一条执行记录</h3>
                <p className="text-[#71717A] text-sm">
                  点击左侧列表中的记录以预览详情。
                </p>
              </GlassCard>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
