'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function InterviewPage() {
  const [currentChapter, setCurrentChapter] = useState(0);

  const chapters = [
    {
      title: '系统概览',
      content: 'AgentForge 智能工程系统是一个基于 Next.js 构建的、具有记忆增强功能的自适应工程系统。',
      keyPoints: ['优先深色模式', '玻璃态 UI', '实时指标'],
    },
    {
      title: '运行时执行',
      content: '基于流式的智能代理执行，提供逐步记录和回放功能。',
      keyPoints: ['实时流式', '逐步回放', '性能监控'],
    },
    {
      title: '云端持久化',
      content: '基于 Supabase 的存储层，使用 PostgreSQL 存储执行和记忆数据。',
      keyPoints: ['PostgreSQL', 'Supabase', '本地回退'],
    },
    {
      title: '记忆系统',
      content: '基于关键词重叠和时效性的相关性检索。',
      keyPoints: ['LLM 提取', '相关性评分', '记忆链接'],
    },
    {
      title: '自适应规划',
      content: '基于历史经验和当前任务的动态计划生成。',
      keyPoints: ['智能代理插入', '任务精简', '优先级调整'],
    },
    {
      title: '工程决策',
      content: '为可维护性和性能精心选择的权衡方案。',
      keyPoints: ['类型安全', '渐进式增强', '回退系统'],
    },
  ];

  return (
    <div className="min-h-[calc(100vh-144px)] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-[#f8fafc] mb-4">
            系统介绍
          </h1>
          <p className="text-[#94a3b8]">
            引导式浏览工程架构
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-[#64748b] mb-2">
            <span>第 {currentChapter + 1} 章，共 {chapters.length} 章</span>
            <span>{Math.round(((currentChapter + 1) / chapters.length) * 100)}%</span>
          </div>
          <div className="h-2 bg-[#1e293b] rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] transition-all duration-500"
              style={{ width: `${((currentChapter + 1) / chapters.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Chapter Content */}
        <div className="glass-card rounded-xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-[#818cf8] mb-4">
            {chapters[currentChapter].title}
          </h2>
          <p className="text-[#94a3b8] text-lg mb-6">
            {chapters[currentChapter].content}
          </p>
          <div className="space-y-2">
            <h3 className="text-[#f8fafc] font-semibold">关键要点：</h3>
            {chapters[currentChapter].keyPoints.map((point, i) => (
              <div key={i} className="flex items-start gap-3 text-[#94a3b8]">
                <span className="text-[#6366f1]">•</span>
                <span>{point}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => setCurrentChapter(Math.max(0, currentChapter - 1))}
            disabled={currentChapter === 0}
            className="px-6 py-3 rounded-lg bg-[#1e293b] text-[#f8fafc] border border-[rgba(255,255,255,0.15)] hover:bg-[#334155] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            ← 上一章
          </button>
          
          {currentChapter < chapters.length - 1 ? (
            <button
              onClick={() => setCurrentChapter(currentChapter + 1)}
              className="px-6 py-3 rounded-lg bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] text-white font-semibold hover:shadow-lg transition-all"
            >
              下一章 →
            </button>
          ) : (
            <Link
              href="/showcase"
              className="px-6 py-3 rounded-lg bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] text-white font-semibold hover:shadow-lg transition-all"
            >
              🚀 前往能力展示
            </Link>
          )}
        </div>

      </div>
    </div>
  );
}
