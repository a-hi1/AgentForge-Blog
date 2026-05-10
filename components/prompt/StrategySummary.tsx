'use client';

import { memo } from 'react';
import { downloadMarkdown } from '@/lib/prompt-orchestrator/promptCompiler';
import CopyPromptButton from './CopyPromptButton';
import type { CompiledPack } from '@/lib/prompt-orchestrator/promptCompiler';

interface StrategySummaryProps {
  pack: CompiledPack;
}

const COMPLEXITY_MAP: Record<string, { label: string; color: string }> = {
  low: { label: '低', color: '#10B981' },
  medium: { label: '中', color: '#F59E0B' },
  high: { label: '高', color: '#EF4444' },
};

function StrategySummary({ pack }: StrategySummaryProps) {
  const { analysis, phases } = pack;
  const complexity = COMPLEXITY_MAP[analysis.complexity] || COMPLEXITY_MAP.medium;

  return (
    <div className="space-y-5">
      <div className="p-5 rounded-xl bg-[#0a0a0c] border border-[rgba(255,255,255,0.06)]">
        <h3 className="text-sm font-semibold text-[#FAFAFA] mb-4">项目分析</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-[#71717A] mb-1">产品类型</p>
            <p className="text-sm text-[#60A5FA] font-medium">{analysis.productTypeLabel}</p>
          </div>
          <div>
            <p className="text-xs text-[#71717A] mb-1">复杂度</p>
            <p className="text-sm font-medium" style={{ color: complexity.color }}>{complexity.label}</p>
          </div>
          <div>
            <p className="text-xs text-[#71717A] mb-1">开发阶段</p>
            <p className="text-sm text-[#FAFAFA] font-medium">{phases.length} 个</p>
          </div>
          <div>
            <p className="text-xs text-[#71717A] mb-1">Prompt 总数</p>
            <p className="text-sm text-[#FAFAFA] font-medium">{phases.length} 条</p>
          </div>
        </div>
      </div>

      <div className="p-5 rounded-xl bg-[#0a0a0c] border border-[rgba(255,255,255,0.06)]">
        <h3 className="text-sm font-semibold text-[#FAFAFA] mb-3">推荐技术栈</h3>
        <div className="flex flex-wrap gap-2">
          {analysis.recommendedStack.map((tech, i) => (
            <span key={i} className="px-2.5 py-1 text-xs font-medium text-[#818cf8] bg-[rgba(99,102,246,0.1)] rounded-md border border-[rgba(99,102,246,0.15)]">
              {tech}
            </span>
          ))}
        </div>
      </div>

      <div className="p-5 rounded-xl bg-[#0a0a0c] border border-[rgba(255,255,255,0.06)]">
        <h3 className="text-sm font-semibold text-[#FAFAFA] mb-3">阶段流程</h3>
        <div className="flex items-center gap-1 flex-wrap">
          {phases.map((phase, i) => (
            <div key={i} className="flex items-center">
              <span className="px-2 py-1 text-[10px] font-medium rounded bg-[rgba(255,255,255,0.05)] text-[#A1A1AA]">
                {phase.name}
              </span>
              {i < phases.length - 1 && (
                <svg className="w-3 h-3 text-[#71717A] mx-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => downloadMarkdown(pack.markdown, 'project-prompts.md')}
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-[rgba(24,24,27,0.72)] text-[#FAFAFA] border border-[rgba(255,255,255,0.1)] hover:border-[#3B82F6] hover:bg-[rgba(63,63,70,0.6)] transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          导出 Prompt Pack
        </button>
        <div className="flex-1">
          <CopyPromptButton text={pack.markdown} label="复制全部 Prompt" />
        </div>
      </div>
    </div>
  );
}

export default memo(StrategySummary);
