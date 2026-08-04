'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function InterviewPage() {
  const [currentChapter, setCurrentChapter] = useState(0);

  const chapters = [
    {
      title: '系统概览',
      content:
        'AgentForge 是一个基于 Next.js 的记忆增强多 Agent 工程工作台。DeepSeek 负责对话规划，MaxKB 本地向量负责语义检索，pgvector 负责持久化记忆。',
      keyPoints: ['OLED 深色工作台', '语义设计系统', 'SSE 可观测执行'],
    },
    {
      title: '运行时执行',
      content: '基于流式的多角色 Agent 执行，支持逐步记录、质量评分与回放。',
      keyPoints: ['Planner → Architect → Coding → Debug → Deploy', '规则校验重试', '进度事件流'],
    },
    {
      title: '云端持久化',
      content: '基于 Supabase PostgreSQL 存储执行记录与记忆；本地也可回退运行。',
      keyPoints: ['PostgreSQL + pgvector', 'Supabase', '本地降级'],
    },
    {
      title: '记忆系统',
      content:
        'Embedding 优先走 MaxKB text2vec-base-chinese，失败后回退 OpenAI 兼容接口或本地哈希，再结合关键词检索。',
      keyPoints: ['MaxKB 768 维向量', 'match_memories RPC', '标签/关键词回退'],
    },
    {
      title: '自适应规划',
      content: '根据历史经验与当前任务动态调整计划，可插入诊断 Agent 或精简步骤。',
      keyPoints: ['记忆影响计划', '角色插入', '优先级调整'],
    },
    {
      title: '工程决策',
      content: '为可维护性与面试可解释性做的明确权衡：类型安全、渐进增强、可演示降级。',
      keyPoints: ['TypeScript strict', '渐进增强', '可防御的简历亮点'],
    },
  ];

  const progress = ((currentChapter + 1) / chapters.length) * 100;

  return (
    <div className="page-shell py-12 sm:py-16">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10 animate-fade-up">
          <span className="badge badge-violet mb-4">Interview Walkthrough</span>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">系统介绍</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            引导式浏览工程架构，适合面试讲解
          </p>
        </div>

        <div className="mb-8 animate-fade-up animate-delay-1">
          <div className="flex justify-between text-xs text-[var(--text-muted)] mb-2">
            <span>
              第 {currentChapter + 1} 章，共 {chapters.length} 章
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-blue-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="glass-card mesh-panel p-6 sm:p-8 mb-8 animate-fade-up animate-delay-2">
          <p className="section-label mb-3">Chapter {String(currentChapter + 1).padStart(2, '0')}</p>
          <h2 className="text-2xl font-bold text-white mb-4">
            {chapters[currentChapter].title}
          </h2>
          <p className="text-[var(--text-secondary)] text-base leading-relaxed mb-6">
            {chapters[currentChapter].content}
          </p>
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-white">关键要点</h3>
            {chapters[currentChapter].keyPoints.map((point, i) => (
              <div key={i} className="flex items-start gap-3 text-sm text-[var(--text-tertiary)]">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
                <span>{point}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
          <button
            type="button"
            onClick={() => setCurrentChapter(Math.max(0, currentChapter - 1))}
            disabled={currentChapter === 0}
            className="btn-secondary"
          >
            上一章
          </button>

          {currentChapter < chapters.length - 1 ? (
            <button
              type="button"
              onClick={() => setCurrentChapter(currentChapter + 1)}
              className="btn-primary"
            >
              下一章
            </button>
          ) : (
            <Link href="/showcase" className="btn-primary text-center">
              前往能力展示
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
