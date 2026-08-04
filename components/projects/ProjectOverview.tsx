'use client';

import { useState, useEffect } from 'react';
import { ProjectState } from '@/lib/projects/projectState';
import { queryFunnel, type FunnelResult } from '@/lib/analytics/funnelTracker';

interface ProjectOverviewProps {
  projectState: ProjectState;
}

export default function ProjectOverview({ projectState }: ProjectOverviewProps) {
  const [funnel, setFunnel] = useState<FunnelResult | null>(null);

  useEffect(() => {
    setFunnel(queryFunnel(30));
  }, []);

  return (
    <div className="glass-card p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">
            {projectState.projectName}
            <span className="text-lg text-[var(--text-muted)] ml-2 font-medium">
              {projectState.currentVersion}
            </span>
          </h1>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="badge badge-blue">
              当前阶段: {projectState.currentPhase}
            </span>
            <span className={`badge ${
              projectState.status === 'active' ? 'badge-green' : 'badge-amber'
            }`}>
              {projectState.status === 'active' ? '进行中' : '暂停'}
            </span>
          </div>
        </div>
        <div className="sm:text-right">
          <p className="text-[var(--text-muted)] text-xs">最后更新</p>
          <p className="text-[var(--text-secondary)] text-sm">
            {projectState.lastUpdated.toLocaleString('zh-CN')}
          </p>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-[var(--text-muted)]">整体进度</span>
          <span className="text-lg font-semibold text-white">
            {projectState.overallProgress}%
          </span>
        </div>
        <div className="h-2.5 w-full bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full transition-all duration-500"
            style={{ width: `${projectState.overallProgress}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: '总执行次数', value: projectState.stats.totalExecutions, color: 'text-white' },
          { label: '成功率', value: `${projectState.stats.successRate}%`, color: 'text-emerald-400' },
          { label: '平均耗时', value: `${projectState.stats.avgExecutionTime}s`, color: 'text-white' },
          { label: '记忆命中', value: `${projectState.stats.memoryHitRate}%`, color: 'text-violet-300' },
        ].map((stat) => (
          <div key={stat.label} className="p-4 rounded-xl bg-white/[0.03] border border-[var(--border)]">
            <p className="text-[var(--text-muted)] text-xs mb-1">{stat.label}</p>
            <p className={`text-2xl font-semibold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {funnel && funnel.totalEvents > 0 && (
        <div className="border-t border-[var(--border)] pt-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h3 className="text-sm font-medium text-[var(--text-secondary)]">
              Usage Funnel <span className="text-[var(--text-muted)] font-normal">(30天)</span>
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`badge ${
                funnel.workflowConfidence === 'high' ? 'badge-green' :
                funnel.workflowConfidence === 'medium' ? 'badge-blue' :
                funnel.workflowConfidence === 'low' ? 'badge-amber' : ''
              }`}>
                {funnel.workflowConfidence === 'high' ? '工作流已验证' :
                 funnel.workflowConfidence === 'medium' ? '工作流初步形成' :
                 funnel.workflowConfidence === 'low' ? '使用链路不完整' : '尚未形成链路'}
              </span>
              <span className="text-xs text-[var(--text-muted)]">
                端到端转化 <span className="text-[var(--text-secondary)] font-medium">{funnel.overallConversion}%</span>
              </span>
            </div>
          </div>

          <div className="flex items-end gap-1 mb-4">
            {funnel.stages.map((stage, i) => {
              const maxCount = Math.max(...funnel.stages.map(s => s.count), 1);
              const barHeight = Math.max(8, (stage.count / maxCount) * 48);
              const isDropOff = funnel.biggestDropOff?.to === stage.stage;

              return (
                <div key={stage.stage} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className="text-[10px] text-[var(--text-muted)] font-medium">{stage.count}</span>
                  <div
                    className={`w-full rounded-t transition-all ${
                      isDropOff ? 'bg-red-500/50' :
                      stage.count > 0 ? 'bg-gradient-to-t from-blue-500 to-violet-500' : 'bg-white/[0.06]'
                    }`}
                    style={{ height: `${barHeight}px` }}
                  />
                  {i > 0 && stage.count > 0 && (
                    <span className={`text-[9px] ${
                      stage.conversionRate >= 60 ? 'text-emerald-400' :
                      stage.conversionRate >= 30 ? 'text-amber-400' : 'text-red-400'
                    }`}>
                      {stage.conversionRate}%
                    </span>
                  )}
                  {i > 0 && stage.count === 0 && (
                    <span className="text-[9px] text-[var(--text-muted)]">-</span>
                  )}
                  {i === 0 && <span className="text-[9px] text-[var(--text-muted)]">&nbsp;</span>}
                  <span className={`text-[9px] text-center leading-tight ${
                    isDropOff ? 'text-red-400 font-medium' : 'text-[var(--text-muted)]'
                  }`}>
                    {stage.label}
                  </span>
                </div>
              );
            })}
          </div>

          {funnel.biggestDropOff && (
            <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/15 mb-3">
              <div className="flex items-start gap-2">
                <svg className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                <div>
                  <p className="text-xs text-red-400 font-medium mb-0.5">
                    最大流失：{funnel.stages.find(s => s.stage === funnel.biggestDropOff!.from)?.label} → {funnel.stages.find(s => s.stage === funnel.biggestDropOff!.to)?.label}
                    <span className="ml-1.5 font-normal text-amber-400">流失 {funnel.biggestDropOff.rate}%</span>
                  </p>
                  {funnel.suggestions.length > 0 && (
                    <p className="text-[11px] text-[var(--text-muted)]">{funnel.suggestions[0]}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {funnel.suggestions.length > 1 && (
            <div className="space-y-1.5">
              {funnel.suggestions.slice(1, 3).map((s, i) => (
                <div key={i} className="flex items-start gap-2">
                  <svg className="w-3 h-3 text-violet-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <p className="text-[11px] text-[var(--text-muted)]">{s}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
