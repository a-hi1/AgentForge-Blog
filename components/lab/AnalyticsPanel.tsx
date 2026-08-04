'use client';

import { memo, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

interface Execution {
  id: string;
  timestamp: string;
  status?: string;
  memory_influenced?: boolean;
  steps: { agent: string; duration?: number }[];
}

interface AnalyticsPanelProps {
  executions: Execution[];
}

function AnalyticsPanel({ executions }: AnalyticsPanelProps) {
  const stats = useMemo(() => {
    const totalExecutions = executions.length;
    const successExecutions = executions.filter((e) => e.status === 'completed').length;
    const successRate =
      totalExecutions > 0 ? Math.round((successExecutions / totalExecutions) * 100) : 0;

    const agentUsage: Record<string, number> = {};
    let durationSum = 0;
    let durationCount = 0;
    executions.forEach((execution) => {
      execution.steps.forEach((step) => {
        agentUsage[step.agent] = (agentUsage[step.agent] || 0) + 1;
        if (typeof step.duration === 'number' && step.duration > 0) {
          durationSum += step.duration;
          durationCount += 1;
        }
      });
    });

    const mostUsedAgent = Object.entries(agentUsage).sort((a, b) => b[1] - a[1])[0];
    const memoryHits = executions.filter((e) => e.memory_influenced).length;
    const memoryHitRate =
      totalExecutions > 0 ? Math.round((memoryHits / totalExecutions) * 100) : 0;
    const avgDurationSec =
      durationCount > 0 ? Math.round(durationSum / durationCount / 1000) : 0;

    const trendData = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      const count = executions.filter((e) => {
        const execDate = new Date(e.timestamp);
        return execDate.toDateString() === date.toDateString();
      }).length;
      return {
        date: date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
        executions: count,
      };
    });

    return {
      totalExecutions,
      successRate,
      avgDurationSec,
      memoryHitRate,
      mostUsedAgent: mostUsedAgent ? mostUsedAgent[0].replace(' Agent', '') : '—',
      trendData,
    };
  }, [executions]);

  const statCards = [
    {
      label: '总执行次数',
      value: stats.totalExecutions,
      icon: '📊',
      color: 'from-[#3B82F6]/20 to-[#8B5CF6]/20',
    },
    {
      label: '成功率',
      value: `${stats.successRate}%`,
      icon: '✅',
      color: 'from-[#10B981]/20 to-[#34D399]/20',
    },
    {
      label: '步均耗时',
      value: stats.avgDurationSec > 0 ? `${stats.avgDurationSec}s` : '—',
      icon: '⏱️',
      color: 'from-[#F59E0B]/20 to-[#FBBF24]/20',
    },
    {
      label: 'Memory 命中率',
      value: `${stats.memoryHitRate}%`,
      icon: '🧠',
      color: 'from-[#8B5CF6]/20 to-[#A78BFA]/20',
    },
    {
      label: '最活跃 Agent',
      value: stats.mostUsedAgent,
      icon: '🤖',
      color: 'from-[#ec4899]/20 to-[#f472b6]/20',
    },
    {
      label: '近30天有数据天',
      value: stats.trendData.filter((d) => d.executions > 0).length,
      icon: '📅',
      color: 'from-[#3B82F6]/20 to-[#60A5FA]/20',
    },
  ];

  return (
    <div className="mb-8">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {statCards.map((stat, index) => (
          <div key={index} className="p-4 glass-card rounded-xl">
            <div
              className={`w-8 h-8 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center text-sm mb-2`}
            >
              {stat.icon}
            </div>
            <div className="text-xl font-bold text-[#FAFAFA] mb-0.5">{stat.value}</div>
            <div className="text-[11px] text-[#71717A]">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="p-5 glass-card rounded-xl">
        <h3 className="text-sm font-semibold text-[#FAFAFA] mb-4">执行趋势 (近 30 天)</h3>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stats.trendData}>
              <defs>
                <linearGradient id="colorExec" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis
                dataKey="date"
                stroke="#71717A"
                tick={{ fontSize: 10 }}
                interval="preserveStartEnd"
              />
              <YAxis stroke="#71717A" tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#111113',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                labelStyle={{ color: '#A1A1AA' }}
              />
              <Area
                type="monotone"
                dataKey="executions"
                stroke="#3B82F6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorExec)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-[11px] text-[#52525B]">
          指标均来自当前加载的执行记录，不使用随机数模拟。
        </p>
      </div>
    </div>
  );
}

export default memo(AnalyticsPanel);
