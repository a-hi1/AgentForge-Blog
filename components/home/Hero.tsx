'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { getRecentConversations, createConversation } from '@/lib/session/conversations';
import type { Conversation, ConversationStatus } from '@/lib/session/conversations';

const STATUS_CONFIG: Record<ConversationStatus, { label: string; icon: string; color: string; bg: string; border: string }> = {
  draft: { label: '草稿', icon: '📝', color: 'text-[#71717A]', bg: 'bg-[rgba(255,255,255,0.05)]', border: 'border-[rgba(255,255,255,0.1)]' },
  repairing: { label: '修复中', icon: '🟡', color: 'text-[#F59E0B]', bg: 'bg-[rgba(245,158,11,0.08)]', border: 'border-[rgba(245,158,11,0.2)]' },
  verified: { label: '已验证', icon: '🟢', color: 'text-[#10B981]', bg: 'bg-[rgba(16,185,129,0.08)]', border: 'border-[rgba(16,185,129,0.2)]' },
  promoted: { label: '已沉淀 Skill', icon: '⭐', color: 'text-[#8B5CF6]', bg: 'bg-[rgba(139,92,246,0.08)]', border: 'border-[rgba(139,92,246,0.2)]' },
};

export default function Dashboard() {
  const [quickInput, setQuickInput] = useState('');
  const [recentConvs, setRecentConvs] = useState<Conversation[]>([]);

  useEffect(() => {
    setRecentConvs(getRecentConversations(8));
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

  const getStatusInfo = (status?: ConversationStatus) => STATUS_CONFIG[status || 'draft'] || STATUS_CONFIG.draft;

  const getLastIssue = (conv: Conversation): string | null => {
    if (!conv.repairHistory || conv.repairHistory.length === 0) return null;
    const latest = conv.repairHistory[conv.repairHistory.length - 1];
    const desc = latest.issueDescription || '';
    return desc.length > 60 ? desc.slice(0, 60) + '...' : desc;
  };

  return (
    <div className="min-h-[calc(100vh-80px)] py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-white mb-1">
            继续开发
          </h1>
          <p className="text-xs text-[#71717A]">选择一个任务继续修复，或开始新的工作</p>
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

        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#A1A1AA]">任务卡片</h2>
            <button
              onClick={handleNewSession}
              className="text-[10px] text-[#A78BFA] hover:text-[#8B5CF6] transition-colors"
            >
              + 新任务
            </button>
          </div>
          {recentConvs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {recentConvs.map(conv => {
                const statusInfo = getStatusInfo(conv.status);
                const lastIssue = getLastIssue(conv);
                return (
                  <Link
                    key={conv.id}
                    href={`/playground?conv=${conv.id}`}
                    className={`group p-4 rounded-xl border transition-all hover:shadow-lg ${statusInfo.border} bg-[#18181B] hover:bg-[#1a1a1f]`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-sm font-medium text-[#FAFAFA] truncate flex-1 mr-2 group-hover:text-[#60A5FA] transition-colors">
                        {conv.title}
                      </h3>
                      <span className={`shrink-0 px-2 py-0.5 text-[10px] rounded-full font-medium ${statusInfo.bg} ${statusInfo.color} ${statusInfo.border} border`}>
                        {statusInfo.icon} {statusInfo.label}
                      </span>
                    </div>
                    {lastIssue && (
                      <p className="text-[11px] text-[#71717A] mb-2 line-clamp-2">
                        最近问题：{lastIssue}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-[10px] text-[#52525B]">
                        <span>v{conv.currentVersion || 1}</span>
                        {conv.repairHistory && conv.repairHistory.length > 0 && (
                          <span>· {conv.repairHistory.length} 次修复</span>
                        )}
                      </div>
                      <span className="text-[10px] text-[#A78BFA] opacity-0 group-hover:opacity-100 transition-opacity">
                        继续修复 →
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center bg-[#18181B] rounded-xl border border-[rgba(255,255,255,0.06)]">
              <p className="text-xs text-[#52525B] mb-2">暂无任务</p>
              <p className="text-[10px] text-[#3f3f46]">输入产品想法开始第一个任务</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-[#18181B] border border-[rgba(255,255,255,0.06)]">
            <h3 className="text-xs font-semibold text-[#A1A1AA] mb-3">快速入口</h3>
            <div className="space-y-1.5">
              {[
                { label: 'Prompt Studio', href: '/prompt', desc: '生成新 Prompt' },
                { label: 'Workbench', href: '/playground', desc: '修复 & 迭代' },
                { label: 'Skill Vault', href: '/prompt/history', desc: '管理 Skill 资产' },
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

          <div className="p-4 rounded-xl bg-[#18181B] border border-[rgba(255,255,255,0.06)]">
            <h3 className="text-xs font-semibold text-[#A1A1AA] mb-3">工作流程</h3>
            <div className="space-y-3">
              {[
                { step: '1', text: '输入想法 → 生成高质量 Prompt', color: 'text-[#8B5CF6]' },
                { step: '2', text: '复制到 Agent 工具执行', color: 'text-[#3B82F6]' },
                { step: '3', text: '反馈问题 → 生成修复 Prompt', color: 'text-[#F59E0B]' },
                { step: '4', text: '验证成功 → 沉淀为 Skill', color: 'text-[#10B981]' },
              ].map(item => (
                <div key={item.step} className="flex items-center gap-3">
                  <span className={`w-5 h-5 rounded-full bg-[rgba(139,92,246,0.15)] ${item.color} text-[10px] flex items-center justify-center font-bold shrink-0`}>
                    {item.step}
                  </span>
                  <span className="text-xs text-[#A1A1AA]">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
