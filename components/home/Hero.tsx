'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { generateRecommendations, RecommendedTask } from '@/lib/projects/recommendationEngine';
import { getPromptHistory } from '@/lib/prompt/history';

export default function Dashboard() {
  const [tasks, setTasks] = useState<RecommendedTask[]>([]);
  const [recentPrompts, setRecentPrompts] = useState<any[]>([]);
  const [quickInput, setQuickInput] = useState('');

  useEffect(() => {
    setTasks(generateRecommendations());
    getPromptHistory({ limit: 6 }).then(history => {
      setRecentPrompts(history);
    });
  }, []);

  const stats = [
    { label: '当前项目', value: 'AgentForge DevOS' },
    { label: '当前阶段', value: '产品收敛重构' },
    { label: '今日建议任务', value: '3' },
    { label: 'Prompt 资产总数', value: '42' },
    { label: '最近执行成功率', value: '87%' }
  ];

  const projects = [
    {
      id: '1',
      name: 'AgentForge DevOS',
      github: true,
      stage: '产品收敛重构',
      progress: 65,
      blockers: 2
    },
    {
      id: '2',
      name: '校园服务平台',
      github: false,
      stage: 'MVP 开发',
      progress: 35,
      blockers: 1
    }
  ];

  const handleQuickInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickInput.trim()) {
      window.location.href = `/prompt?idea=${encodeURIComponent(quickInput.trim())}`;
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* 顶部状态栏 */}
        <div className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {stats.map((stat, i) => (
              <div
                key={i}
                className="p-5 rounded-xl bg-slate-900/40 border border-slate-700/50"
              >
                <div className="text-xs text-gray-400 mb-1">{stat.label}</div>
                <div className="text-lg font-bold text-white">{stat.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 主内容区 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧主区 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 我的项目 */}
            <div className="p-6 rounded-xl bg-slate-900/40 border border-slate-700/50">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-white">我的项目</h2>
                <Link
                  href="/projects"
                  className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  查看全部 →
                </Link>
              </div>
              <div className="space-y-4">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className="p-4 rounded-lg bg-slate-900/60 border border-slate-700/50 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                        <span className="text-white font-bold text-xs">{project.name[0]}</span>
                      </div>
                      <div>
                        <div className="font-semibold text-white flex items-center gap-2">
                          {project.name}
                          {project.github && (
                            <span className="text-xs text-gray-400">
                              <svg className="w-3.5 h-3.5 inline" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.268 2.75 1.026A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.026 2.747-1.026.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.939.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                              </svg>
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-400 mt-0.5">{project.stage}</div>
                        <div className="mt-2 w-40">
                          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                              style={{ width: `${project.progress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {project.blockers > 0 && (
                        <div className="flex items-center gap-1.5 text-orange-400 text-sm">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          {project.blockers} 个阻塞
                        </div>
                      )}
                      <Link
                        href="/projects"
                        className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-medium transition-colors"
                      >
                        继续开发
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 今日推荐任务 */}
            <div className="p-6 rounded-xl bg-slate-900/40 border border-slate-700/50">
              <h2 className="text-lg font-bold text-white mb-5">今日推荐任务</h2>
              <div className="space-y-4">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-4 rounded-lg bg-slate-900/60 border border-slate-700/50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            task.impact === 'high' ? 'bg-red-500/20 text-red-400' :
                            task.impact === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-blue-500/20 text-blue-400'
                          }`}>
                            {task.impact === 'high' ? '高影响' : task.impact === 'medium' ? '中影响' : '低影响'}
                          </span>
                          <span className="text-xs text-gray-400">{task.promptCategory}</span>
                          <span className="text-xs text-gray-500">· {task.eta}</span>
                        </div>
                        <div className="font-semibold text-white mt-1.5">{task.title}</div>
                        <div className="text-sm text-gray-400 mt-1">{task.reason}</div>
                      </div>
                      <Link
                        href={`/prompt?category=${encodeURIComponent(task.promptCategory)}&title=${encodeURIComponent(task.title)}`}
                        className="ml-4 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm font-medium transition-colors flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        生成 Prompt
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 右侧 */}
          <div className="space-y-6">
            {/* 快速输入 */}
            <div className="p-6 rounded-xl bg-slate-900/40 border border-slate-700/50">
              <h3 className="text-sm font-semibold text-gray-300 mb-4">快速输入</h3>
              <form onSubmit={handleQuickInputSubmit} className="space-y-3">
                <textarea
                  value={quickInput}
                  onChange={(e) => setQuickInput(e.target.value)}
                  placeholder="描述你现在想推进的事情…"
                  className="w-full h-32 px-4 py-3 bg-slate-900/60 border border-slate-700 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                />
                <button
                  type="submit"
                  disabled={!quickInput.trim()}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-all"
                >
                  生成精准 Prompt
                </button>
              </form>
            </div>

            {/* 最近 Prompt */}
            <div className="p-6 rounded-xl bg-slate-900/40 border border-slate-700/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-300">最近 Prompt</h3>
                <Link
                  href="/prompt/history"
                  className="text-xs text-gray-400 hover:text-gray-300"
                >
                  查看全部
                </Link>
              </div>
              <div className="space-y-3">
                {recentPrompts.length > 0 ? recentPrompts.map((prompt) => (
                  <div
                    key={prompt.id}
                    className="p-3 rounded-lg bg-slate-900/60 border border-slate-700/50 hover:border-slate-600 transition-colors cursor-pointer"
                    onClick={() => window.location.href = `/prompt/history?id=${prompt.id}`}
                  >
                    <div className="text-sm font-medium text-white truncate">{prompt.title}</div>
                    <div className="text-xs text-gray-400 mt-1 truncate">{prompt.input}</div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-500">
                        {new Date(prompt.createdAt).toLocaleDateString()}
                      </span>
                      <div className="flex items-center gap-2">
                        {prompt.favorite && (
                          <svg className="w-3.5 h-3.5 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                        )}
                        {prompt.score && (
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            prompt.score >= 80 ? 'bg-green-500/20 text-green-400' :
                            prompt.score >= 60 ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {prompt.score}分
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-6 text-gray-500 text-sm">
                    暂无执行记录
                  </div>
                )}
              </div>
            </div>

            {/* 快捷入口 */}
            <div className="p-6 rounded-xl bg-slate-900/40 border border-slate-700/50">
              <h3 className="text-sm font-semibold text-gray-300 mb-4">快捷入口</h3>
              <div className="grid grid-cols-2 gap-3">
                <Link
                  href="/projects"
                  className="p-3 rounded-lg bg-slate-900/60 border border-slate-700/50 hover:border-indigo-500/50 transition-colors text-center"
                >
                  <div className="text-sm font-medium text-white">项目中心</div>
                </Link>
                <Link
                  href="/prompt"
                  className="p-3 rounded-lg bg-slate-900/60 border border-slate-700/50 hover:border-indigo-500/50 transition-colors text-center"
                >
                  <div className="text-sm font-medium text-white">Prompt Studio</div>
                </Link>
                <Link
                  href="/prompt/history"
                  className="p-3 rounded-lg bg-slate-900/60 border border-slate-700/50 hover:border-indigo-500/50 transition-colors text-center"
                >
                  <div className="text-sm font-medium text-white">资产库</div>
                </Link>
                <Link
                  href="/fix"
                  className="p-3 rounded-lg bg-slate-900/60 border border-slate-700/50 hover:border-indigo-500/50 transition-colors text-center"
                >
                  <div className="text-sm font-medium text-white">问题修复</div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
