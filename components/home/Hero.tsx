'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { generateDailyTask, DailyTask } from '@/lib/projects/recommendationEngine';
import { getPromptHistory } from '@/lib/prompt/history';

const QUICK_LINKS = [
  { label: 'Prompt Studio', href: '/prompt', desc: '生成新 Prompt' },
  { label: '资产库', href: '/prompt/history', desc: '管理 Prompt 资产' },
  { label: 'Playground', href: '/playground', desc: '执行测试' },
  { label: '项目中心', href: '/projects', desc: '查看项目' },
  { label: '问题修复', href: '/fix', desc: '分析失败任务' },
];

export default function Dashboard() {
  const [dailyTask, setDailyTask] = useState<DailyTask | null>(null);
  const [recentPrompts, setRecentPrompts] = useState<any[]>([]);
  const [quickInput, setQuickInput] = useState('');

  useEffect(() => {
    getPromptHistory({ limit: 50 }).then(history => {
      setRecentPrompts(history.slice(0, 5));
      const task = generateDailyTask(history, '产品收敛重构');
      setDailyTask(task);
    }).catch(() => {});
  }, []);

  const handleQuickInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickInput.trim()) {
      window.location.href = `/prompt?idea=${encodeURIComponent(quickInput.trim())}`;
    }
  };

  const getPriorityConfig = (priority: DailyTask['priority']) => {
    switch (priority) {
      case 'critical':
        return {
          border: 'border-red-500/40',
          bg: 'bg-red-500/5',
          badge: 'bg-red-500/20 text-red-400',
          label: '紧急',
          iconColor: 'text-red-400',
          button: 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500',
        };
      case 'high':
        return {
          border: 'border-yellow-500/40',
          bg: 'bg-yellow-500/5',
          badge: 'bg-yellow-500/20 text-yellow-400',
          label: '重要',
          iconColor: 'text-yellow-400',
          button: 'bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500',
        };
      default:
        return {
          border: 'border-indigo-500/30',
          bg: 'bg-indigo-500/5',
          badge: 'bg-indigo-500/20 text-indigo-400',
          label: '建议',
          iconColor: 'text-indigo-400',
          button: 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500',
        };
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-1">
            AgentForge <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">DevOS</span>
          </h1>
          <p className="text-sm text-gray-400">Prompt 驱动的 AI 开发工作台</p>
        </div>

        {dailyTask && (() => {
          const cfg = getPriorityConfig(dailyTask.priority);
          return (
            <div className={`mb-8 p-6 rounded-xl ${cfg.bg} border ${cfg.border}`}>
              <div className="flex items-center gap-2 mb-4">
                <svg className={`w-5 h-5 ${cfg.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h2 className="text-lg font-bold text-white">今日主任务</h2>
                <span className={`text-xs px-2 py-0.5 rounded-full ${cfg.badge}`}>{cfg.label}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-gray-400">{dailyTask.category}</span>
              </div>

              <h3 className="text-xl font-semibold text-white mb-4">{dailyTask.title}</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-700/50">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className="text-xs font-medium text-red-400">当前阻塞</span>
                  </div>
                  <p className="text-sm text-gray-300">{dailyTask.blocker}</p>
                </div>
                <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-700/50">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    <span className="text-xs font-medium text-green-400">完成收益</span>
                  </div>
                  <p className="text-sm text-gray-300">{dailyTask.benefit}</p>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-slate-900/40 border border-slate-700/30 mb-4">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-xs font-medium text-blue-400">为什么做</span>
                </div>
                <p className="text-sm text-gray-400">{dailyTask.reason}</p>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400 flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  预计 {dailyTask.eta}
                </span>
                <Link
                  href={dailyTask.actionHref}
                  className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-white text-sm font-medium ${cfg.button} transition-all`}
                >
                  {dailyTask.actionLabel}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </div>
            </div>
          );
        })()}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="p-6 rounded-xl bg-slate-900/40 border border-slate-700/50">
              <h3 className="text-sm font-semibold text-gray-300 mb-4">快速输入</h3>
              <form onSubmit={handleQuickInputSubmit} className="space-y-3">
                <textarea
                  value={quickInput}
                  onChange={(e) => setQuickInput(e.target.value)}
                  placeholder="描述你现在想推进的事情…"
                  className="w-full h-28 px-4 py-3 bg-slate-900/60 border border-slate-700 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
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

            <div className="p-6 rounded-xl bg-slate-900/40 border border-slate-700/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-300">最近 Prompt</h3>
                <Link href="/prompt/history" className="text-xs text-gray-400 hover:text-gray-300">
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
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white truncate">{prompt.title}</div>
                        <div className="text-xs text-gray-400 mt-1 truncate">{prompt.input}</div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-gray-500">{prompt.category}</span>
                          {prompt.score !== undefined && (
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              prompt.score >= 80 ? 'bg-green-500/20 text-green-400' :
                              prompt.score >= 60 ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-red-500/20 text-red-400'
                            }`}>
                              {prompt.score}分
                            </span>
                          )}
                          {prompt.feedback && (
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              prompt.feedback === 'excellent' ? 'bg-green-500/20 text-green-400' :
                              prompt.feedback === 'average' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-red-500/20 text-red-400'
                            }`}>
                              {prompt.feedback === 'excellent' ? '优秀' : prompt.feedback === 'average' ? '一般' : '失败'}
                            </span>
                          )}
                        </div>
                      </div>
                      <svg className="w-4 h-4 text-gray-500 shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-6 text-gray-500 text-sm">
                    暂无执行记录
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="p-6 rounded-xl bg-slate-900/40 border border-slate-700/50">
              <h3 className="text-sm font-semibold text-gray-300 mb-4">快捷入口</h3>
              <div className="space-y-2">
                {QUICK_LINKS.map(link => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-800/60 transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm text-gray-300 group-hover:text-white transition-colors">{link.label}</div>
                      <div className="text-xs text-gray-500">{link.desc}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
