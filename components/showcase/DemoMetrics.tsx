'use client';

import { useState, useEffect } from 'react';
import { SkeletonMetrics } from '@/components/ui/Skeleton';

interface ExecutionRecord {
  id: string;
  status?: string;
  steps?: any[];
  memory_influenced?: boolean;
  adaptation_reason?: string[];
}

export default function DemoMetrics() {
  const [metrics, setMetrics] = useState({
    totalExecutions: 0,
    adaptiveRate: 0,
    successRate: 0,
    avgStepsPerExecution: 0,
    loading: true,
    dbConnected: true,
  });

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      const response = await fetch('/api/executions');
      if (!response.ok) {
        setMetrics(prev => ({ ...prev, loading: false, dbConnected: false }));
        return;
      }
      const executions: ExecutionRecord[] = await response.json();

      if (executions.length === 0) {
        setMetrics({
          totalExecutions: 0,
          adaptiveRate: 0,
          successRate: 0,
          avgStepsPerExecution: 0,
          loading: false,
          dbConnected: true,
        });
        return;
      }

      const totalExecutions = executions.length;
      const successfulExecutions = executions.filter(e => e.status === 'completed').length;
      const adaptiveExecutions = executions.filter(
        e => e.memory_influenced || (e.adaptation_reason?.length ?? 0) > 0
      ).length;
      const totalSteps = executions.reduce(
        (sum, e) => sum + (e.steps?.length || 0), 0
      );

      setMetrics({
        totalExecutions,
        adaptiveRate: totalExecutions > 0 ? Math.round((adaptiveExecutions / totalExecutions) * 100) : 0,
        successRate: totalExecutions > 0 ? Math.round((successfulExecutions / totalExecutions) * 100) : 0,
        avgStepsPerExecution: totalExecutions > 0 ? Math.round(totalSteps / totalExecutions) : 0,
        loading: false,
        dbConnected: true,
      });
    } catch (error) {
      console.error('[Metrics] 加载失败:', error);
      setMetrics(prev => ({ ...prev, loading: false, dbConnected: false }));
    }
  };

  if (metrics.loading) {
    return <div className="mb-8"><SkeletonMetrics /></div>;
  }

  if (!metrics.dbConnected) {
    return (
      <div className="mb-8 p-4 glass-card rounded-xl border border-[#f59e0b]/30 bg-[#f59e0b]/5 text-center">
        <p className="text-[#f59e0b] text-sm">数据库暂未连接，请检查部署配置</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
      <div className="glass-card rounded-xl p-4 text-center">
        <div className="text-2xl font-bold text-[#FAFAFA]">
          {metrics.totalExecutions}
        </div>
        <div className="text-xs text-[#71717A] mt-0.5">总执行次数</div>
      </div>

      <div className="glass-card rounded-xl p-4 text-center">
        <div className="text-2xl font-bold text-[#60A5FA]">
          {metrics.adaptiveRate}%
        </div>
        <div className="text-xs text-[#71717A] mt-0.5">自适应率</div>
      </div>

      <div className="glass-card rounded-xl p-4 text-center">
        <div className="text-2xl font-bold text-[#10B981]">
          {metrics.successRate}%
        </div>
        <div className="text-xs text-[#71717A] mt-0.5">成功率</div>
      </div>

      <div className="glass-card rounded-xl p-4 text-center">
        <div className="text-2xl font-bold text-[#F59E0B]">
          {metrics.avgStepsPerExecution}
        </div>
        <div className="text-xs text-[#71717A] mt-0.5">平均步骤数</div>
      </div>
    </div>
  );
}
