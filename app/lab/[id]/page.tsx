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
      <div className="min-h-screen py-8 px-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton width="120px" height="16px" />
          <Skeleton width="60%" height="32px" />
          <Skeleton variant="rectangular" height="200px" />
          <Skeleton variant="rectangular" height="300px" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen py-16 px-4 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-[#f8fafc] mb-3">执行失败</h2>
          <p className="text-[#94a3b8] text-sm mb-4">{error}</p>
          <div className="p-4 bg-[#1e293b] rounded-lg text-left mb-6">
            <p className="text-[#94a3b8] text-xs mb-2">可能原因：</p>
            <ul className="text-[#64748b] text-xs space-y-1">
              <li>• 模型服务限流</li>
              <li>• Supabase 未连接</li>
              <li>• 网络连接异常</li>
            </ul>
            <p className="text-[#94a3b8] text-xs mt-3">建议：重新执行 或 检查环境变量</p>
          </div>
          <button
            onClick={() => { setLoading(true); loadExecution(); }}
            className="px-4 py-2 bg-[#6366f1] text-white rounded-lg hover:bg-[#818cf8] transition-colors text-sm mr-3"
          >
            重新加载
          </button>
          <Link href="/lab" className="text-[#818cf8] hover:text-[#6366f1] text-sm">
            ← 返回实验室
          </Link>
        </div>
      </div>
    );
  }

  if (!execution) {
    return (
      <div className="min-h-screen py-16 px-4 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">😕</div>
          <h2 className="text-2xl font-semibold text-[#f8fafc] mb-3">执行记录未找到</h2>
          <p className="text-[#94a3b8] text-sm mb-6">
            该执行记录可能已被删除，请返回实验室查看其他记录。
          </p>
          <Link href="/lab" className="text-[#818cf8] hover:text-[#6366f1] text-sm">
            ← 返回实验室
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link href="/lab" className="text-[#818cf8] hover:text-[#6366f1] flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            返回实验室
          </Link>
        </div>

        {/* Memory Banner */}
        {showMemoryBanner && execution.memory_influenced && (
          <div className="mb-6 p-4 glass-card rounded-xl border border-[#6366f1]/30 bg-[#6366f1]/10">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="text-2xl">🧠</div>
                <div>
                  <h4 className="text-[#f8fafc] font-medium">记忆增强执行</h4>
                  <p className="text-[#94a3b8] text-sm">
                    本次执行参考了历史执行经验
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowMemoryBanner(false)}
                className="text-[#94a3b8] hover:text-[#f8fafc]"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-[#f8fafc] mb-2">
              执行详情
            </h1>
            <p className="text-[#64748b]">
              {new Date(execution.timestamp).toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href={`/lab/lineage/${execution.id}`} className="px-4 py-2 bg-[#1e293b]/80 text-[#94a3b8] rounded-lg hover:bg-[#334155] transition-all flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-2.828-2.828M10 6h6v6m-6V6zM9.172" />
              </svg>
              执行谱系
            </Link>
            <ExportButton execution={execution} />
          </div>
        </div>

        <div className="p-6 glass-card rounded-xl mb-6">
          <div className="flex items-center gap-3 mb-4">
            {execution.status && (
              <AgentStatus status={execution.status as any} />
            )}
          </div>
          <h3 className="text-lg font-semibold text-[#f8fafc] mb-4">
            用户提示词
          </h3>
          <p className="text-[#94a3b8] mb-4">{execution.prompt}</p>
          {execution.summary && (
            <div className="p-4 bg-[#0f172a] rounded-lg border border-[rgba(255,255,255,0.05)]">
              <h4 className="text-sm font-semibold text-[#818cf8] mb-2">
                执行摘要
              </h4>
              <p className="text-[#94a3b8]">{execution.summary}</p>
            </div>
          )}
        </div>

        {/* Adaptation Explanation */}
        {(execution.adaptation_reason && execution.adaptation_reason.length > 0) && (
          <div className="mb-6 p-6 glass-card rounded-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="text-2xl">🔄</div>
              <h3 className="text-lg font-semibold text-[#f8fafc]">
                规划变更原因
              </h3>
              {execution.memory_influence_level !== undefined && (
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-sm text-[#94a3b8]">影响度：</span>
                  <div className="w-24 h-2 bg-[#1e293b] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] transition-all"
                      style={{ width: `${(execution.memory_influence_level || 0) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm text-[#818cf8]">
                    {Math.round((execution.memory_influence_level || 0) * 100)}%
                  </span>
                </div>
              )}
            </div>
            <ul className="space-y-3">
              {execution.adaptation_reason.map((reason, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#6366f1]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3 h-3 text-[#6366f1]" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-[#94a3b8]">{reason}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mb-6">
          <MemoryPanel compact={false} />
        </div>

        <ReplayPlayer
          steps={execution.steps.map((step, index) => ({
            ...step,
            step: index + 1,
          }))}
        />
      </div>
    </div>
  );
}
