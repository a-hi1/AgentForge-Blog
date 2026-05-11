'use client';

import { memo } from 'react';
import { downloadMarkdown } from '@/lib/prompt-orchestrator/promptCompiler';
import CopyPromptButton from './CopyPromptButton';
import type { CompiledPack } from '@/lib/prompt-orchestrator/promptCompiler';

interface StrategySummaryProps {
  pack: CompiledPack;
}

function StrategySummary({ pack }: StrategySummaryProps) {
  const { intent, architecture, phases, depth } = pack;

  return (
    <div className="space-y-5">
      <div className="p-5 rounded-xl bg-[#0a0a0c] border border-[rgba(255,255,255,0.06)]">
        <h3 className="text-sm font-semibold text-[#FAFAFA] mb-4">推理结果</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-[#71717A] mb-1">业务目标</p>
            <p className="text-sm text-[#60A5FA] font-medium">{intent.businessGoal}</p>
          </div>
          <div>
            <p className="text-xs text-[#71717A] mb-1">目标用户</p>
            <p className="text-sm text-[#A1A1AA] font-medium">{intent.userType}</p>
          </div>
          <div>
            <p className="text-xs text-[#71717A] mb-1">产品形态</p>
            <p className="text-sm text-[#A1A1AA] font-medium">{intent.productShape}</p>
          </div>
          <div>
            <p className="text-xs text-[#71717A] mb-1">项目阶段</p>
            <p className="text-sm text-[#A1A1AA] font-medium">{intent.lifecycle}</p>
          </div>
        </div>
      </div>

      <div className="p-5 rounded-xl bg-[#0a0a0c] border border-[rgba(255,255,255,0.06)]">
        <h3 className="text-sm font-semibold text-[#FAFAFA] mb-3">技术架构</h3>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <p className="text-xs text-[#71717A] mb-1">前端</p>
            <span className="px-2.5 py-1 text-xs font-medium text-[#818cf8] bg-[rgba(99,102,246,0.1)] rounded-md border border-[rgba(99,102,246,0.15)]">
              {architecture.frontend}
            </span>
          </div>
          <div>
            <p className="text-xs text-[#71717A] mb-1">后端</p>
            <span className="px-2.5 py-1 text-xs font-medium text-[#818cf8] bg-[rgba(99,102,246,0.1)] rounded-md border border-[rgba(99,102,246,0.15)]">
              {architecture.backend}
            </span>
          </div>
          <div>
            <p className="text-xs text-[#71717A] mb-1">数据库</p>
            <span className="px-2.5 py-1 text-xs font-medium text-[#818cf8] bg-[rgba(99,102,246,0.1)] rounded-md border border-[rgba(99,102,246,0.15)]">
              {architecture.db}
            </span>
          </div>
          <div>
            <p className="text-xs text-[#71717A] mb-1">基础设施</p>
            <div className="flex flex-wrap gap-1">
              {architecture.infra.map((item, i) => (
                <span key={i} className="px-2 py-0.5 text-[10px] font-medium text-[#A78BFA] bg-[rgba(139,92,246,0.1)] rounded-md border border-[rgba(139,92,246,0.15)]">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
        <p className="text-xs text-[#71717A] leading-relaxed">{architecture.reasoning}</p>
      </div>

      {architecture.rejectedAlternatives.length > 0 && (
        <div className="p-5 rounded-xl bg-[#0a0a0c] border border-[rgba(255,255,255,0.06)]">
          <h3 className="text-sm font-semibold text-[#FAFAFA] mb-3">被拒绝的方案</h3>
          <div className="space-y-1.5">
            {architecture.rejectedAlternatives.map((alt, i) => (
              <p key={i} className="text-xs text-[#F59E0B]">❌ {alt}</p>
            ))}
          </div>
        </div>
      )}

      {intent.decisionPoints.length > 0 && (
        <div className="p-5 rounded-xl bg-[#0a0a0c] border border-[rgba(255,255,255,0.06)]">
          <h3 className="text-sm font-semibold text-[#FAFAFA] mb-3">决策依据</h3>
          <div className="space-y-1.5">
            {intent.decisionPoints.map((point, i) => (
              <p key={i} className="text-xs text-[#A1A1AA]">🔍 {point}</p>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => downloadMarkdown(pack.markdown, 'prompt.md')}
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-[rgba(24,24,27,0.72)] text-[#FAFAFA] border border-[rgba(255,255,255,0.1)] hover:border-[#3B82F6] hover:bg-[rgba(63,63,70,0.6)] transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          导出 Markdown
        </button>
        <div className="flex-1">
          <CopyPromptButton text={pack.markdown} label="复制全部" />
        </div>
      </div>
    </div>
  );
}

export default memo(StrategySummary);