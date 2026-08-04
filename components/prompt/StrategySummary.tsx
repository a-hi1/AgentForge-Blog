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
  const { intent, markdown } = pack;

  return (
    <div className="space-y-5">
      <div className="p-5 glass-card rounded-xl">
        <h3 className="text-sm font-semibold text-[var(--text)] mb-3">意图分析</h3>
        <div className="space-y-2 text-sm">
          <div><span className="text-[var(--text-tertiary)]">目标：</span><span className="text-[var(--text-secondary)]">{String(intent.businessGoal || '-')}</span></div>
          <div><span className="text-[var(--text-tertiary)]">用户：</span><span className="text-[var(--text-secondary)]">{String(intent.userType || '-')}</span></div>
          <div><span className="text-[var(--text-tertiary)]">形态：</span><span className="text-[var(--text-secondary)]">{String(intent.productShape || '-')}</span></div>
          <div><span className="text-[var(--text-tertiary)]">阶段：</span><span className="text-[var(--text-secondary)]">{String(intent.lifecycle || '-')}</span></div>
        </div>
      </div>

      {intent.decisionPoints.length > 0 && (
        <div className="p-5 glass-card rounded-xl">
          <h3 className="text-sm font-semibold text-[var(--text)] mb-3">决策依据</h3>
          <div className="space-y-1.5">
            {intent.decisionPoints.map((point: string, i: number) => (
              <p key={i} className="text-xs text-[var(--text-secondary)] flex items-start gap-2">
                <svg className="w-3.5 h-3.5 text-[#60A5FA] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {point}
              </p>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => downloadMarkdown(markdown, 'prompt.md')}
          className="btn-secondary flex-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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
