'use client';

import { useState, useEffect } from 'react';
import { getExecutions, ExecutionRecord } from '@/lib/agent-runtime/storage';

export default function DemoMetrics() {
  const [metrics, setMetrics] = useState({
    totalExecutions: 0,
    adaptiveRate: 0,
    successRate: 0,
    avgStepsPerExecution: 0,
    loading: true,
  });

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      const executions = await getExecutions();
      
      if (executions.length === 0) {
        setMetrics({
          totalExecutions: 0,
          adaptiveRate: 0,
          successRate: 0,
          avgStepsPerExecution: 0,
          loading: false,
        });
        return;
      }

      const totalExecutions = executions.length;
      
      const successfulExecutions = executions.filter(
        (e: ExecutionRecord) => e.status === 'completed'
      ).length;
      
      const adaptiveExecutions = executions.filter(
        (e: ExecutionRecord) => e.memory_influenced || (e.adaptation_reason?.length ?? 0) > 0
      ).length;
      
      const totalSteps = executions.reduce(
        (sum: number, e: ExecutionRecord) => sum + (e.steps?.length || 0), 0
      );

      setMetrics({
        totalExecutions,
        adaptiveRate: totalExecutions > 0 ? Math.round((adaptiveExecutions / totalExecutions) * 100) : 0,
        successRate: totalExecutions > 0 ? Math.round((successfulExecutions / totalExecutions) * 100) : 0,
        avgStepsPerExecution: totalExecutions > 0 ? Math.round(totalSteps / totalExecutions) : 0,
        loading: false,
      });
    } catch (error) {
      console.error('[Metrics] Failed to load:', error);
      setMetrics({
        totalExecutions: 0,
        adaptiveRate: 0,
        successRate: 0,
        avgStepsPerExecution: 0,
        loading: false,
      });
    }
  };

  if (metrics.loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="glass-card rounded-xl p-4 text-center">
            <div className="h-8 bg-[rgba(24,24,27,0.72)] rounded animate-pulse mb-2" />
            <div className="h-4 bg-[rgba(24,24,27,0.72)] rounded animate-pulse w-2/3 mx-auto" />
          </div>
        ))}
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
