'use client';

import { useProjectState } from '@/lib/projects/projectState';
import ProjectOverview from '@/components/projects/ProjectOverview';
import ProgressTracker from '@/components/projects/ProgressTracker';
import RecentActivity from '@/components/projects/RecentActivity';
import NextActions from '@/components/projects/NextActions';
import QuickLaunch from '@/components/projects/QuickLaunch';
import Link from 'next/link';

export default function ProjectsPage() {
  const { loading, projectState, refresh } = useProjectState();

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-80px)] py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-32 bg-[rgba(24,24,27,0.72)] rounded-xl" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 h-64 bg-[rgba(24,24,27,0.72)] rounded-xl" />
              <div className="h-64 bg-[rgba(24,24,27,0.72)] rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!projectState) {
    return (
      <div className="min-h-[calc(100vh-80px)] py-8 px-4 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-[#FAFAFA] mb-3">加载失败</h2>
          <p className="text-[#71717A] text-sm mb-6">无法加载项目数据，请稍后重试</p>
          <button
            onClick={refresh}
            className="px-4 py-2 bg-[#3B82F6] text-white rounded-lg hover:bg-[#60A5FA] transition-colors text-sm"
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-80px)] py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Workflow Guidance Banner */}
        <div className="mb-8 p-6 rounded-xl bg-gradient-to-r from-[rgba(139,92,246,0.15)] to-[rgba(59,130,246,0.15)] border border-[rgba(139,92,246,0.25)]">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-[rgba(139,92,246,0.25)] flex items-center justify-center">
                  <svg className="w-4.5 h-4.5 text-[#A78BFA]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-[#FAFAFA]">你当前应该做什么？</h3>
              </div>
              <div className="ml-10">
                <div className="flex items-center gap-3 mb-2">
                  <p className="text-[#A78BFA] font-medium">
                    下一步建议: 完善 {projectState.currentPhase}
                  </p>
                </div>
                <p className="text-sm text-[#A1A1AA] mb-3">
                  原因: 当前质量评分还有提升空间，建议继续优化深度模式
                </p>
                <div className="flex gap-3">
                  <Link 
                    href="/prompt"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6] text-white hover:shadow-lg hover:shadow-[rgba(139,92,246,0.25)] transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    生成执行提示词
                  </Link>
                  <button
                    onClick={refresh}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[rgba(24,24,27,0.72)] border border-[rgba(255,255,255,0.1)] text-[#A1A1AA] hover:text-[#FAFAFA] hover:border-[rgba(255,255,255,0.2)] transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    刷新数据
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Top Section: Overview */}
          <ProjectOverview projectState={projectState} />

          {/* Middle Section: Quick Launch + Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <QuickLaunch />
            <RecentActivity activities={projectState.recentActivities} />
          </div>

          {/* Bottom Section: Progress + Next Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ProgressTracker phases={projectState.phases} />
            </div>
            <NextActions 
              blockers={projectState.blockers} 
              nextActions={projectState.nextActions} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}
