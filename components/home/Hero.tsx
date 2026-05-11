'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { generateDailyTask, DailyTask } from '@/lib/projects/recommendationEngine';
import { getPromptHistory } from '@/lib/prompt/history';
import { getRecentConversations, createConversation } from '@/lib/session/conversations';
import type { Conversation } from '@/lib/session/conversations';

export default function Dashboard() {
  const [dailyTask, setDailyTask] = useState<DailyTask | null>(null);
  const [quickInput, setQuickInput] = useState('');
  const [recentConvs, setRecentConvs] = useState<Conversation[]>([]);

  useEffect(() => {
    setRecentConvs(getRecentConversations(5));
    getPromptHistory({ limit: 50 }).then(history => {
      const task = generateDailyTask(history, '产品收敛重构');
      setDailyTask(task);
    }).catch(() => {});
  }, []);

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickInput.trim()) {
      const conv = createConversation(quickInput.trim());
      window.location.href = `/playground?conv=${conv.id}`;
    }
  };

  const handleNewSession = () => {
    const conv = createConversation();
    window.location.href = `/playground?conv=${conv.id}`;
  };

  return (
    <div className="min-h-[calc(100vh-80px)] py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-white mb-1">
            继续开发
          </h1>
          <p className="text-xs text-[#71717A]">选择一个会话继续，或开始新的工作</p>
        </div>

        <div className="mb-6">
          <form onSubmit={handleQuickSubmit} className="flex gap-2">
            <input
              value={quickInput}
              onChange={e => setQuickInput(e.target.value)}
              placeholder="描述你现在想推进的事情…"
              className="flex-1 px-4 py-3 bg-[#18181B] border border-[rgba(255,255,255,0.08)] rounded-xl text-sm text-white placeholder-[#52525B] focus:outline-none focus:border-[#3B82F6] transition-colors"
            />
            <button
              type="submit"
              disabled={!quickInput.trim()}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6] hover:from-[#7C3AED] hover:to-[#2563EB] disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium text-white transition-all shrink-0"
            >
              开始
            </button>
          </form>
        </div>

        {dailyTask && (
          <div className="mb-6 p-4 rounded-xl bg-[rgba(59,130,246,0.05)] border border-[rgba(59,130,246,0.15)]">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[rgba(59,130,246,0.15)] text-[#60A5FA]">今日任务</span>
                  {dailyTask.realityBadge && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[rgba(16,185,129,0.15)] text-[#10B981]">{dailyTask.realityBadge}</span>
                  )}
                </div>
                <p className="text-sm font-medium text-[#FAFAFA] truncate">{dailyTask.title}</p>
                <p className="text-xs text-[#71717A] mt-0.5 truncate">{dailyTask.reason}</p>
              </div>
              <Link
                href={dailyTask.actionHref}
                className="shrink-0 ml-4 px-4 py-2 rounded-lg text-xs font-medium bg-[rgba(59,130,246,0.15)] text-[#60A5FA] hover:bg-[rgba(59,130,246,0.25)] transition-all"
              >
                {dailyTask.actionLabel}
              </Link>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-[#18181B] border border-[rgba(255,255,255,0.06)]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-[#A1A1AA]">最近会话</h3>
              <button
                onClick={handleNewSession}
                className="text-[10px] text-[#A78BFA] hover:text-[#8B5CF6] transition-colors"
              >
                + 新会话
              </button>
            </div>
            {recentConvs.length > 0 ? (
              <div className="space-y-1.5">
                {recentConvs.map(conv => (
                  <Link
                    key={conv.id}
                    href={`/playground?conv=${conv.id}`}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-[rgba(255,255,255,0.03)] transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[#FAFAFA] truncate group-hover:text-[#60A5FA] transition-colors">{conv.title}</p>
                      <p className="text-[10px] text-[#52525B] mt-0.5">{conv.messageCount} 条消息</p>
                    </div>
                    <svg className="w-3.5 h-3.5 text-[#3f3f46] group-hover:text-[#52525B] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#52525B] py-4 text-center">暂无会话</p>
            )}
          </div>

          <div className="p-4 rounded-xl bg-[#18181B] border border-[rgba(255,255,255,0.06)]">
            <h3 className="text-xs font-semibold text-[#A1A1AA] mb-3">快速入口</h3>
            <div className="space-y-1.5">
              {[
                { label: 'Prompt Studio', href: '/prompt', desc: '生成新 Prompt' },
                { label: 'Playground', href: '/playground', desc: '执行测试' },
                { label: '资产库', href: '/prompt/history', desc: '管理 Prompt' },
                { label: '项目中心', href: '/projects', desc: '查看项目' },
              ].map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[rgba(255,255,255,0.03)] transition-colors group"
                >
                  <div className="w-7 h-7 rounded-lg bg-[rgba(139,92,246,0.1)] border border-[rgba(139,92,246,0.15)] flex items-center justify-center shrink-0">
                    <svg className="w-3.5 h-3.5 text-[#A78BFA]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-xs text-[#FAFAFA] group-hover:text-[#60A5FA] transition-colors">{link.label}</div>
                    <div className="text-[10px] text-[#52525B]">{link.desc}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
