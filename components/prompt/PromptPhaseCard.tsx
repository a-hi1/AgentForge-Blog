'use client';

import { memo } from 'react';
import type { CompiledPhase } from '@/lib/prompt-orchestrator/templates';

interface PromptPhaseCardProps {
  phase: CompiledPhase;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
}

function PromptPhaseCard({ phase, index, isSelected, onSelect }: PromptPhaseCardProps) {
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
          <h3 className={`text-sm font-semibold truncate mb-1.5 ${isSelected ? 'text-[#60A5FA]' : 'text-[#FAFAFA]'}`}>
            {phase.name}
          </h3>
          <p className="text-xs text-[#71717A] line-clamp-2 leading-relaxed">
            {phase.description}
          </p>
        </div>
      </div>
    </button>
  );
}

export default memo(PromptPhaseCard);
