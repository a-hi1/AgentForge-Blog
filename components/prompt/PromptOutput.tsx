'use client';

import { memo } from 'react';
import { useRouter } from 'next/navigation';
import CopyPromptButton from './CopyPromptButton';
import type { CompiledPhase } from '@/lib/prompt-orchestrator/templates';

interface PromptOutputProps {
  phase: CompiledPhase | null;
  phaseIndex: number;
  totalPhases: number;
  savedAssetId?: string | null;
}

function PromptOutput({ phase, phaseIndex, totalPhases, savedAssetId }: PromptOutputProps) {
  const router = useRouter();

  const handleSendToPlayground = () => {
    if (!phase) return;
    const encoded = encodeURIComponent(phase.prompt);
    const url = savedAssetId
      ? `/playground?prompt=${encoded}&assetId=${savedAssetId}`
      : `/playground?prompt=${encoded}`;
    router.push(url);
  };

  if (!phase) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-8 py-20">
        <div className="w-16 h-16 rounded-2xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-[#71717A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.25 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
          </svg>
        </div>
        <h3 className="text-[#FAFAFA] font-medium mb-2">选择一个阶段查看 Prompt</h3>
        <p className="text-[#71717A] text-sm">
          点击左侧阶段列表，即可预览和复制该阶段的完整 Prompt
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-5 border-b border-[rgba(255,255,255,0.06)]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#71717A] font-mono">
              Phase {phaseIndex + 1} / {totalPhases}
            </span>
            <h2 className="text-lg font-semibold text-[#FAFAFA]">{phase.name}</h2>
          </div>
          <div className="flex items-center gap-3">
            {phase.score !== undefined && (
              <span className={`text-xs font-medium px-2 py-1 rounded-md ${
                phase.score >= 85
                  ? 'bg-[rgba(16,185,129,0.1)] text-[#10B981]'
                  : 'bg-[rgba(245,158,11,0.1)] text-[#F59E0B]'
              }`}>
                质量 {phase.score}分
              </span>
            )}
            <CopyPromptButton text={phase.prompt} />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSendToPlayground}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6] text-white text-xs font-medium hover:shadow-lg transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            发送到 Playground
          </button>
        </div>
        <p className="text-sm text-[#71717A] mt-2">{phase.description}</p>
        {phase.scoreFeedback && phase.scoreFeedback.length > 0 && (
          <div className="mt-3 p-3 rounded-lg bg-[rgba(245,158,11,0.05)] border border-[rgba(245,158,11,0.15)]">
            <p className="text-[10px] text-[#F59E0B] font-medium mb-1.5">改进建议</p>
            <div className="space-y-1">
              {phase.scoreFeedback.map((fb, i) => (
                <p key={i} className="text-[11px] text-[#A1A1AA] leading-relaxed">· {fb}</p>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        <pre className="text-sm text-[#A1A1AA] whitespace-pre-wrap font-mono leading-relaxed bg-[#0a0a0c] rounded-xl p-5 border border-[rgba(255,255,255,0.04)]">
          {phase.prompt}
        </pre>
      </div>
    </div>
  );
}

export default memo(PromptOutput);
