'use client';

import { memo } from 'react';
import CopyPromptButton from './CopyPromptButton';
import type { CompiledPack } from '@/lib/prompt-orchestrator/promptCompiler';

const downloadMarkdown = (content: string, filename: string) => {
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

function StrategySummary({ pack }: { pack: CompiledPack }) {
  if (!pack) return null;
  const { intent, decompose, markdown } = pack;

  return (
    <div className="space-y-5">
      <div className="p-5 rounded-xl bg-[#0a0a0c] border border-[rgba(255,255,255,0.06)]">
        <h3 className="text-sm font-semibold text-[#FAFAFA] mb-3">意图分析</h3>
        <div className="space-y-2 text-sm">
          <div><span className="text-[#71717A]">目标：</span><span className="text-[#A1A1AA]">{String(intent.businessGoal || '-')}</span></div>
          <div><span className="text-[#71717A]">用户：</span><span className="text-[#A1A1AA]">{String(intent.userType || '-')}</span></div>
          <div><span className="text-[#71717A]">形态：</span><span className="text-[#A1A1AA]">{String(intent.productShape || '-')}</span></div>
          <div><span className="text-[#71717A]">阶段：</span><span className="text-[#A1A1AA]">{String(intent.lifecycle || '-')}</span></div>
        </div>
      </div>

      {intent.decisionPoints.length > 0 && (
        <div className="p-5 rounded-xl bg-[#0a0a0c] border border-[rgba(255,255,255,0.06)]">
          <h3 className="text-sm font-semibold text-[#FAFAFA] mb-3">决策依据</h3>
          <div className="space-y-1.5">
            {intent.decisionPoints.map((point: string, i: number) => (
              <p key={i} className="text-xs text-[#A1A1AA]">🔍 {point}</p>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => downloadMarkdown(markdown, 'prompt.md')}
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-[rgba(24,24,27,0.72)] text-[#FAFAFA] border border-[rgba(255,255,255,0.1)] hover:border-[#3B82F6] hover:bg-[rgba(63,63,70,0.6)] transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          导出 Markdown
        </button>
        <div className="flex-1">
          <CopyPromptButton text={markdown} label="复制全部" />
        </div>
      </div>
    </div>
  );
}

export default memo(StrategySummary);
