'use client';

import { ProjectState } from '@/lib/projects/projectState';

interface ProjectOverviewProps {
  projectState: ProjectState;
}

export default function ProjectOverview({ projectState }: ProjectOverviewProps) {
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
    </div>
  );
}
