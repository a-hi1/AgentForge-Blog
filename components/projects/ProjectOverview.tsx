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
    <div className="p-6 bg-[#111113] rounded-xl border border-[rgba(255,255,255,0.06)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-[#FAFAFA] mb-1">
            {projectState.projectName}
            <span className="text-lg text-[#71717A] ml-2">
              {projectState.currentVersion}
            </span>
          </h1>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 text-xs font-medium rounded-full bg-[rgba(59,130,246,0.15)] text-[#60A5FA] border border-[rgba(59,130,246,0.25)]">
              当前阶段: {projectState.currentPhase}
            </span>
            <span className={`px-3 py-1 text-xs font-medium rounded-full ${
              projectState.status === 'active' 
                ? 'bg-[rgba(16,185,129,0.15)] text-[#10B981] border border-[rgba(16,185,129,0.25)]'
                : 'bg-[rgba(245,158,11,0.15)] text-[#F59E0B] border border-[rgba(245,158,11,0.25)]'
            }`}>
              {projectState.status === 'active' ? '进行中' : '暂停'}
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[#71717A] text-xs">最后更新</p>
          <p className="text-[#A1A1AA] text-sm">
            {projectState.lastUpdated.toLocaleString('zh-CN')}
          </p>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-[#71717A]">整体进度</span>
          <span className="text-lg font-semibold text-[#FAFAFA]">
            {projectState.overallProgress}%
          </span>
        </div>
        <div className="h-3 w-full bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] rounded-full transition-all duration-500"
            style={{ width: `${projectState.overallProgress}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-[rgba(255,255,255,0.03)] rounded-lg border border-[rgba(255,255,255,0.06)]">
          <p className="text-[#71717A] text-xs mb-1">总执行次数</p>
          <p className="text-2xl font-semibold text-[#FAFAFA]">
            {projectState.stats.totalExecutions}
          </p>
        </div>
        <div className="p-4 bg-[rgba(255,255,255,0.03)] rounded-lg border border-[rgba(255,255,255,0.06)]">
          <p className="text-[#71717A] text-xs mb-1">成功率</p>
          <p className="text-2xl font-semibold text-[#10B981]">
            {projectState.stats.successRate}%
          </p>
        </div>
        <div className="p-4 bg-[rgba(255,255,255,0.03)] rounded-lg border border-[rgba(255,255,255,0.06)]">
          <p className="text-[#71717A] text-xs mb-1">平均耗时</p>
          <p className="text-2xl font-semibold text-[#FAFAFA]">
            {projectState.stats.avgExecutionTime}s
          </p>
        </div>
        <div className="p-4 bg-[rgba(255,255,255,0.03)] rounded-lg border border-[rgba(255,255,255,0.06)]">
          <p className="text-[#71717A] text-xs mb-1">记忆命中</p>
          <p className="text-2xl font-semibold text-[#A78BFA]">
            {projectState.stats.memoryHitRate}%
          </p>
        </div>
      </div>

      {funnel && funnel.totalEvents > 0 && (
        <div className="border-t border-[rgba(255,255,255,0.06)] pt-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-[#A1A1AA]">Usage Funnel <span className="text-[#71717A] font-normal">(30天)</span></h3>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 text-[10px] rounded-full font-medium ${
                funnel.workflowConfidence === 'high' ? 'bg-[rgba(16,185,129,0.15)] text-[#10B981]' :
                funnel.workflowConfidence === 'medium' ? 'bg-[rgba(59,130,246,0.15)] text-[#60A5FA]' :
                funnel.workflowConfidence === 'low' ? 'bg-[rgba(245,158,11,0.15)] text-[#F59E0B]'
                : 'bg-[rgba(255,255,255,0.05)] text-[#71717A]'
              }`}>
                {funnel.workflowConfidence === 'high' ? '工作流已验证' :
                 funnel.workflowConfidence === 'medium' ? '工作流初步形成' :
                 funnel.workflowConfidence === 'low' ? '使用链路不完整' : '尚未形成链路'}
              </span>
              <span className="text-xs text-[#71717A]">
                端到端转化 <span className="text-[#A1A1AA] font-medium">{funnel.overallConversion}%</span>
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
                  <span className="text-[10px] text-[#71717A] font-medium">{stage.count}</span>
                  <div
                    className={`w-full rounded-t transition-all ${
                      isDropOff ? 'bg-[rgba(239,68,68,0.5)]' :
                      stage.count > 0 ? 'bg-gradient-to-t from-[#3B82F6] to-[#8B5CF6]' : 'bg-[rgba(255,255,255,0.06)]'
                    }`}
                    style={{ height: `${barHeight}px` }}
                  />
                  {i > 0 && stage.count > 0 && (
                    <span className={`text-[9px] ${
                      stage.conversionRate >= 60 ? 'text-[#10B981]' :
                      stage.conversionRate >= 30 ? 'text-[#F59E0B]' : 'text-[#EF4444]'
                    }`}>
                      {stage.conversionRate}%
                    </span>
                  )}
                  {i > 0 && stage.count === 0 && (
                    <span className="text-[9px] text-[#71717A]">-</span>
                  )}
                  {i === 0 && <span className="text-[9px] text-[#71717A]">&nbsp;</span>}
                  <span className={`text-[9px] text-center leading-tight ${
                    isDropOff ? 'text-[#EF4444] font-medium' : 'text-[#71717A]'
                  }`}>
                    {stage.label}
                  </span>
                </div>
              );
            })}
          </div>

          {funnel.biggestDropOff && (
            <div className="p-3 rounded-lg bg-[rgba(239,68,68,0.05)] border border-[rgba(239,68,68,0.15)] mb-3">
              <div className="flex items-start gap-2">
                <span className="text-xs mt-0.5">⚠️</span>
                <div>
                  <p className="text-xs text-[#EF4444] font-medium mb-0.5">
                    最大流失：{funnel.stages.find(s => s.stage === funnel.biggestDropOff!.from)?.label} → {funnel.stages.find(s => s.stage === funnel.biggestDropOff!.to)?.label}
                    <span className="ml-1.5 font-normal text-[#F59E0B]">流失 {funnel.biggestDropOff.rate}%</span>
                  </p>
                  {funnel.suggestions.length > 0 && (
                    <p className="text-[11px] text-[#71717A]">{funnel.suggestions[0]}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {funnel.suggestions.length > 1 && (
            <div className="space-y-1.5">
              {funnel.suggestions.slice(1, 3).map((s, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-[10px] text-[#8B5CF6] mt-0.5">💡</span>
                  <p className="text-[11px] text-[#71717A]">{s}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
