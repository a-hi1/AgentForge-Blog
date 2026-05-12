'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { listProjectMemories } from '@/lib/project-memory/store';
import { buildMemoryContextPack, formatForClaude, formatForCursor, formatForGPT } from '@/lib/context-compiler/contextPack';
import type { ProjectMemory } from '@/lib/project-memory/types';

export default function Dashboard() {
  const [recentMemories, setRecentMemories] = useState<ProjectMemory[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    setRecentMemories(listProjectMemories());
  }, []);

  const handleQuickCopy = useCallback(async (memory: ProjectMemory, target: 'claude' | 'cursor' | 'gpt') => {
    const pack = buildMemoryContextPack(memory);
    const text = target === 'claude' ? formatForClaude(pack)
      : target === 'cursor' ? formatForCursor(pack)
      : formatForGPT(pack);

    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(`${memory.id}-${target}`);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  return (
    <div className="min-h-[calc(100vh-80px)] py-16 px-4">
      <div className="max-w-3xl mx-auto">

        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-[#FAFAFA] mb-4 leading-tight">
            让 AI 真正理解你的项目
          </h1>
          <p className="text-base text-[#71717A] max-w-lg mx-auto mb-8 leading-relaxed">
            保存项目上下文、技术决策和开发记忆，<br />
            一键导出给 Claude、Cursor、GPT。
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/memory"
              className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6] hover:from-[#7C3AED] hover:to-[#2563EB] text-sm font-medium text-white transition-all"
            >
              导入 GitHub 仓库
            </Link>
            <Link
              href="/prompt/discovery"
              className="px-5 py-2.5 rounded-lg border border-[rgba(255,255,255,0.1)] text-sm font-medium text-[#A1A1AA] hover:text-[#FAFAFA] hover:border-[rgba(255,255,255,0.2)] transition-all"
            >
              开始方向探索
            </Link>
          </div>
        </div>

        {/* Recent Memories */}
        {recentMemories.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-[#A1A1AA]">最近项目</h2>
              <Link href="/memory" className="text-xs text-[#52525B] hover:text-[#A1A1AA] transition-colors">
                查看全部 →
              </Link>
            </div>
            <div className="space-y-3">
              {recentMemories.slice(0, 3).map(m => (
                <div
                  key={m.id}
                  className="p-4 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#18181B]"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <Link href="/memory" className="text-sm font-medium text-[#FAFAFA] hover:text-[#60A5FA] transition-colors">
                        {m.repoOwner}/{m.repoName}
                      </Link>
                      {m.meta.description && (
                        <p className="text-xs text-[#52525B] mt-0.5 line-clamp-1">{m.meta.description}</p>
                      )}
                    </div>
                    <span className="text-[10px] text-[#3f3f46] shrink-0 ml-3">
                      {new Date(m.updatedAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {m.analysis.techStack.slice(0, 5).map(t => (
                      <span key={t} className="px-1.5 py-0.5 text-[10px] rounded bg-[rgba(59,130,246,0.08)] text-[#60A5FA] border border-[rgba(59,130,246,0.15)]">
                        {t}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-[10px] text-[#52525B]">
                      <span>{m.decisions.length} 决策</span>
                      <span>{m.todos.length} TODO</span>
                      <span>{m.sessions.length} 对话</span>
                    </div>

                    {/* Quick Export */}
                    <div className="flex items-center gap-1.5">
                      {(['claude', 'cursor', 'gpt'] as const).map(target => {
                        const key = `${m.id}-${target}`;
                        const isCopied = copied === key;
                        return (
                          <button
                            key={target}
                            type="button"
                            onClick={() => handleQuickCopy(m, target)}
                            className={`px-2 py-1 text-[10px] rounded border transition-all ${
                              isCopied
                                ? 'border-[#10B981] bg-[rgba(16,185,129,0.08)] text-[#34D399]'
                                : 'border-[rgba(255,255,255,0.06)] text-[#52525B] hover:text-[#A1A1AA] hover:border-[rgba(255,255,255,0.15)]'
                            }`}
                          >
                            {isCopied ? '已复制' : target === 'claude' ? 'Claude' : target === 'cursor' ? 'Cursor' : 'GPT'}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {recentMemories.length === 0 && (
          <div className="text-center py-12">
            <div className="w-12 h-12 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] flex items-center justify-center mx-auto mb-4">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#52525B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
            </div>
            <p className="text-sm text-[#71717A] mb-1">还没有项目记忆</p>
            <p className="text-xs text-[#52525B]">导入一个 GitHub 仓库，让 AI 理解你的项目</p>
          </div>
        )}

      </div>
    </div>
  );
}
