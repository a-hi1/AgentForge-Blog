'use client';

import { memo } from 'react';
import type { Phase } from '@/lib/prompt-orchestrator/phasePlanner';

interface PromptPhaseCardProps {
  phase: Phase;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  '启动': { bg: 'rgba(16,185,129,0.1)', text: '#10B981', border: 'rgba(16,185,129,0.2)' },
  '设计': { bg: 'rgba(139,92,246,0.1)', text: '#8B5CF6', border: 'rgba(139,92,246,0.2)' },
  '开发': { bg: 'rgba(59,130,246,0.1)', text: '#3B82F6', border: 'rgba(59,130,246,0.2)' },
  '质量': { bg: 'rgba(245,158,11,0.1)', text: '#F59E0B', border: 'rgba(245,158,11,0.2)' },
  '部署': { bg: 'rgba(239,68,68,0.1)', text: '#EF4444', border: 'rgba(239,68,68,0.2)' },
  '收尾': { bg: 'rgba(99,102,241,0.1)', text: '#6366F1', border: 'rgba(99,102,241,0.2)' },
};

function PromptPhaseCard({ phase, index, isSelected, onSelect }: PromptPhaseCardProps) {
  const colors = CATEGORY_COLORS[phase.category] || CATEGORY_COLORS['开发'];

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-4 rounded-xl border transition-all ${
        isSelected
          ? 'border-[#3B82F6] bg-[rgba(59,130,246,0.08)] ring-1 ring-[rgba(59,130,246,0.3)]'
          : 'border-[rgba(255,255,255,0.06)] hover:border-[rgba(59,130,246,0.3)] hover:bg-[rgba(255,255,255,0.02)]'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
          isSelected ? 'bg-[#3B82F6] text-white' : 'bg-[rgba(255,255,255,0.06)] text-[#71717A]'
        }`}>
          {index + 1}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className="px-2 py-0.5 text-[10px] font-medium rounded-full"
              style={{ backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
            >
              {phase.category}
            </span>
            <h3 className={`text-sm font-semibold truncate ${isSelected ? 'text-[#60A5FA]' : 'text-[#FAFAFA]'}`}>
              {phase.name}
            </h3>
          </div>
          <p className="text-xs text-[#71717A] line-clamp-2 leading-relaxed">
            {phase.description}
          </p>
        </div>
      </div>
    </button>
  );
}

export default memo(PromptPhaseCard);
