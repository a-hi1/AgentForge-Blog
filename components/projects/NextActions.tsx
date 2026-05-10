'use client';

import { ProjectBlocker, NextAction } from '@/lib/projects/projectState';
import Link from 'next/link';

interface NextActionsProps {
  blockers: ProjectBlocker[];
  nextActions: NextAction[];
}

const priorityColors: Record<string, string> = {
  'high': 'text-[#EF4444] bg-[rgba(239,68,68,0.15)] border-[rgba(239,68,68,0.25)]',
  'medium': 'text-[#F59E0B] bg-[rgba(245,158,11,0.15)] border-[rgba(245,158,11,0.25)]',
  'low': 'text-[#10B981] bg-[rgba(16,185,129,0.15)] border-[rgba(16,185,129,0.25)]',
};

const impactLabels: Record<string, string> = {
  'critical': '重大',
  'major': '重要',
  'minor': '一般',
};

const impactColors: Record<string, string> = {
  'critical': 'text-[#EF4444]',
  'major': 'text-[#F59E0B]',
  'minor': 'text-[#10B981]',
};

export default function NextActions({ blockers, nextActions }: NextActionsProps) {
  return (
    <div className="space-y-6">
      {blockers.length > 0 && (
        <div className="p-6 bg-[#111113] rounded-xl border border-[rgba(255,255,255,0.06)]">
          <h2 className="text-lg font-semibold text-[#FAFAFA] mb-4">当前问题</h2>
          <div className="space-y-3">
            {blockers.map((blocker) => (
              <div 
                key={blocker.id}
                className="p-4 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)]"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-sm font-medium text-[#FAFAFA]">{blocker.title}</h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${priorityColors[blocker.priority]}`}>
                    {blocker.priority === 'high' ? '高' : blocker.priority === 'medium' ? '中' : '低'}优先级
                  </span>
                </div>
                <p className="text-xs text-[#71717A] mb-2">{blocker.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#52525B]">
                    来源: {blocker.source}
                  </span>
                  <span className="text-[10px] text-[#52525B]">
                    {blocker.detectedDate.toLocaleDateString('zh-CN')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="p-6 bg-[#111113] rounded-xl border border-[rgba(255,255,255,0.06)]">
        <h2 className="text-lg font-semibold text-[#FAFAFA] mb-4">推荐下一步</h2>
        <div className="space-y-3">
          {nextActions.map((action) => (
            <div 
              key={action.id}
              className="p-4 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)]"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-sm font-medium text-[#FAFAFA]">{action.title}</h3>
                  <p className="text-xs text-[#71717A] mt-1">{action.description}</p>
                </div>
                <span className={`text-[10px] font-medium ${impactColors[action.impact]}`}>
                  {impactLabels[action.impact]}
                </span>
              </div>
              
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-[#52525B]">
                  预计耗时: {action.estimatedTime}
                </span>
                <div className="flex gap-2">
                  {action.suggestedPrompt ? (
                    <Link 
                      href={`/prompt?idea=${encodeURIComponent(action.suggestedPrompt)}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6] text-white hover:shadow-lg hover:shadow-[rgba(139,92,246,0.25)] transition-all"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      生成提示词
                    </Link>
                  ) : (
                    <Link 
                      href={action.targetRoute}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[rgba(24,24,27,0.72)] text-[#A1A1AA] hover:text-[#FAFAFA] border border-[rgba(255,255,255,0.1)] hover:border-[rgba(59,130,246,0.35)] transition-all"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                      前往
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
