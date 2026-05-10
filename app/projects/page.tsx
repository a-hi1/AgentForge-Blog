'use client';

import { useProjectState } from '@/lib/projects/projectState';
import ProjectOverview from '@/components/projects/ProjectOverview';
import ProgressTracker from '@/components/projects/ProgressTracker';
import RecentActivity from '@/components/projects/RecentActivity';
import NextActions from '@/components/projects/NextActions';
import QuickLaunch from '@/components/projects/QuickLaunch';
import RepoInsights from '@/components/projects/RepoInsights';
import ProjectTimeline from '@/components/projects/ProjectTimeline';
import Link from 'next/link';
import { useState } from 'react';
import { parseRepoUrl, fetchRepoMeta, fetchRepoTree } from '@/lib/github/importer';
import { analyzeCodebase } from '@/lib/github/codeAnalyzer';
import { analyzeMaturity, generateRecommendationPrompts } from '@/lib/projects/maturityAnalyzer';

export default function ProjectsPage() {
  const { loading, projectState, refresh } = useProjectState();
  const [showImportModal, setShowImportModal] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState('');
  const [importedProject, setImportedProject] = useState<any>(null);

  const handleImport = async () => {
    try {
      setImportError('');
      setImportLoading(true);
      const { owner, repo } = parseRepoUrl(importUrl);
      const meta = await fetchRepoMeta(owner, repo, process.env.NEXT_PUBLIC_GITHUB_TOKEN);
      const tree = await fetchRepoTree(owner, repo, meta.defaultBranch, process.env.NEXT_PUBLIC_GITHUB_TOKEN);
      const analysis = analyzeCodebase(tree);
      const maturity = analyzeMaturity(meta, tree, analysis);
      const recommendations = generateRecommendationPrompts(analysis, maturity);
      setImportedProject({ meta, tree, analysis, maturity, recommendations });
      setShowImportModal(false);
    } catch (err: any) {
      setImportError(err.message || '导入失败');
    } finally {
      setImportLoading(false);
    }
  };

  const handleRefreshImport = async () => {
    if (!importedProject) return;
    try {
      setImportLoading(true);
      const { meta, tree } = importedProject;
      const newMeta = await fetchRepoMeta(meta.owner, meta.repo, process.env.NEXT_PUBLIC_GITHUB_TOKEN);
      const newTree = await fetchRepoTree(meta.owner, meta.repo, newMeta.defaultBranch, process.env.NEXT_PUBLIC_GITHUB_TOKEN);
      const newAnalysis = analyzeCodebase(newTree);
      const newMaturity = analyzeMaturity(newMeta, newTree, newAnalysis);
      const newRecommendations = generateRecommendationPrompts(newAnalysis, newMaturity);
      setImportedProject({ meta: newMeta, tree: newTree, analysis: newAnalysis, maturity: newMaturity, recommendations: newRecommendations });
    } catch (err: any) {
      console.error('刷新失败', err);
    } finally {
      setImportLoading(false);
    }
  };

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
        {/* Import Section */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">Project Hub</h1>
          <button
            onClick={() => setShowImportModal(true)}
            className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-lg font-medium text-sm shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            导入 GitHub 项目
          </button>
        </div>

        {/* Imported Project */}
        {importedProject && (
          <div className="mb-8">
            <RepoInsights
              repoMeta={importedProject.meta}
              codeAnalysis={importedProject.analysis}
              maturity={importedProject.maturity}
              recommendations={importedProject.recommendations}
              onRefresh={handleRefreshImport}
            />
          </div>
        )}

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

          {/* Timeline Section */}
          <ProjectTimeline limit={15} />

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

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">导入 GitHub 项目</h2>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">仓库地址</label>
                <input
                  type="text"
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                  placeholder="https://github.com/user/repo"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500 transition-colors"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleImport();
                  }}
                />
              </div>
              {importError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                  {importError}
                </div>
              )}
              <button
                onClick={handleImport}
                disabled={importLoading}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-medium transition-all flex items-center justify-center gap-2"
              >
                {importLoading ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    分析中...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    导入并分析
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
