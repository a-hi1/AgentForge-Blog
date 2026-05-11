'use client';

import { memo, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { CompiledPhase } from '@/lib/prompt-orchestrator/templates';

interface PromptOutputProps {
  phase: CompiledPhase | null;
  phaseIndex: number;
  totalPhases: number;
  savedAssetId?: string | null;
}

function PromptOutput({ phase, phaseIndex, totalPhases, savedAssetId }: PromptOutputProps) {
  const router = useRouter();
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [copied, setCopied] = useState(false);
  const preRef = useRef<HTMLPreElement>(null);

  const handleSendToPlayground = () => {
    if (!phase) return;
    const encoded = encodeURIComponent(phase.prompt);
    const url = savedAssetId
      ? `/playground?prompt=${encoded}&assetId=${savedAssetId}`
      : `/playground?prompt=${encoded}`;
    router.push(url);
  };

  const handleCopyExecution = useCallback(async () => {
    if (!phase) return;
    try {
      await navigator.clipboard.writeText(phase.prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = phase.prompt;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [phase]);

  const handleExportMd = useCallback(() => {
    if (!phase) return;
    const content = `# ${phase.name}\n\n> ${phase.description}\n\n---\n\n${phase.prompt}`;
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `phase-${phaseIndex + 1}-${phase.name.replace(/\s+/g, '-')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [phase, phaseIndex]);

  const handleSelectAll = useCallback(() => {
    if (preRef.current) {
      const range = document.createRange();
      range.selectNodeContents(preRef.current);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }, []);

  if (!phase) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-8 py-20">
        <div className="w-16 h-16 rounded-2xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-[#71717A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
          </svg>
        </div>
        <h3 className="text-[#FAFAFA] font-medium mb-2">选择一个阶段查看 Prompt</h3>
        <p className="text-[#71717A] text-sm">
          点击左侧阶段列表，即可预览和复制该阶段的完整 Prompt
        </p>
      </div>
    );
  }

  const lineCount = phase.prompt.split('\n').length;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]">
        <div className="flex items-center gap-3">
          <span className="text-xs text-[#71717A] font-mono">
            Phase {phaseIndex + 1}/{totalPhases}
          </span>
          <h2 className="text-sm font-medium text-[#FAFAFA]">{phase.name}</h2>
          {phase.score !== undefined && (
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
              phase.score >= 85
                ? 'bg-[rgba(16,185,129,0.1)] text-[#10B981]'
                : 'bg-[rgba(245,158,11,0.1)] text-[#F59E0B]'
            }`}>
              {phase.score}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCopyExecution}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              copied
                ? 'bg-[rgba(16,185,129,0.15)] text-[#10B981]'
                : 'bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6] text-white hover:shadow-lg'
            }`}
          >
            {copied ? (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
              </svg>
            )}
            {copied ? '已复制' : '复制执行'}
          </button>
          <button
            onClick={handleSendToPlayground}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[rgba(255,255,255,0.05)] text-[#A1A1AA] text-xs font-medium hover:bg-[rgba(255,255,255,0.08)] transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Playground
          </button>
          <button
            onClick={handleExportMd}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[rgba(255,255,255,0.05)] text-[#A1A1AA] text-xs font-medium hover:bg-[rgba(255,255,255,0.08)] transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            导出 md
          </button>
          <button
            onClick={handleSelectAll}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-[rgba(255,255,255,0.05)] text-[#71717A] text-xs hover:bg-[rgba(255,255,255,0.08)] transition-all"
            title="全选"
          >
            全选
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-[#09090b]">
        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col items-end pt-5 pr-3 text-[#3f3f46] text-[11px] font-mono select-none border-r border-[rgba(255,255,255,0.04)] bg-[#09090b]">
            {Array.from({ length: lineCount }, (_, i) => (
              <div key={i} className="leading-[1.7] h-[1.7em]">{i + 1}</div>
            ))}
          </div>
          <pre
            ref={preRef}
            className="text-[13px] text-[#D4D4D8] whitespace-pre-wrap font-mono leading-[1.7] pl-14 pr-5 py-5"
          >
            {phase.prompt}
          </pre>
        </div>
      </div>

      <div className="border-t border-[rgba(255,255,255,0.06)]">
        <button
          onClick={() => setShowAnalysis(!showAnalysis)}
          className="w-full flex items-center justify-between px-4 py-2 text-xs text-[#71717A] hover:text-[#A1A1AA] hover:bg-[rgba(255,255,255,0.02)] transition-all"
        >
          <span>查看生成推理</span>
          <svg
            className={`w-3.5 h-3.5 transition-transform ${showAnalysis ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showAnalysis && (
          <div className="px-4 pb-4 space-y-2 max-h-48 overflow-y-auto">
            <p className="text-[11px] text-[#52525B]">{phase.description}</p>
            {phase.scoreFeedback && phase.scoreFeedback.length > 0 && (
              <div className="p-2.5 rounded-lg bg-[rgba(245,158,11,0.05)] border border-[rgba(245,158,11,0.1)]">
                <p className="text-[10px] text-[#F59E0B] font-medium mb-1">改进建议</p>
                <div className="space-y-0.5">
                  {phase.scoreFeedback.map((fb, i) => (
                    <p key={i} className="text-[10px] text-[#71717A] leading-relaxed">· {fb}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(PromptOutput);
