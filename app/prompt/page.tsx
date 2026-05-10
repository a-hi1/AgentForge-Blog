'use client';

import { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { analyzeProduct } from '@/lib/prompt-orchestrator/analyzer';
import { planPhases } from '@/lib/prompt-orchestrator/phasePlanner';
import { compilePromptPack } from '@/lib/prompt-orchestrator/promptCompiler';
import type { CompiledPack } from '@/lib/prompt-orchestrator/promptCompiler';
import PromptPhaseCard from '@/components/prompt/PromptPhaseCard';
import PromptOutput from '@/components/prompt/PromptOutput';
import StrategySummary from '@/components/prompt/StrategySummary';

const EXAMPLES = [
  '开发一个校园二手交易平台',
  '做一个 SaaS 团队协作工具，支持任务管理和文档协作',
  '构建一个 AI 驱动的代码审查助手',
  '开发一个在线教育平台，支持视频课程和作业批改',
  '做一个企业级 CRM 客户关系管理系统',
  '构建一个实时数据监控仪表板',
];

export default function PromptPage() {
  const [input, setInput] = useState('');
  const [pack, setPack] = useState<CompiledPack | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'input' | 'output' | 'summary'>('input');
  const [mobileView, setMobileView] = useState<'input' | 'phases' | 'output'>('input');

  const handleGenerate = useCallback(() => {
    if (!input.trim()) return;
    const analysis = analyzeProduct(input);
    const phases = planPhases(analysis, input);
    const compiled = compilePromptPack(input, analysis, phases);
    setPack(compiled);
    setSelectedIndex(0);
    setActiveTab('output');
    setMobileView('phases');
  }, [input]);

  const handleExampleClick = useCallback((example: string) => {
    setInput(example);
  }, []);

  const selectedPhase = useMemo(() => {
    return pack ? pack.phases[selectedIndex] ?? null : null;
  }, [pack, selectedIndex]);

  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col">
      <div className="border-b border-[rgba(255,255,255,0.06)] px-4 py-3">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-[#8B5CF6] animate-pulse" />
            <span className="text-[#A1A1AA] text-sm font-medium hidden sm:inline">Prompt Strategy Generator</span>
            <span className="text-[#71717A] text-xs hidden sm:inline">|</span>
            <div className="hidden sm:flex items-center gap-1 bg-[rgba(255,255,255,0.03)] rounded-lg p-0.5 border border-[rgba(255,255,255,0.06)]">
              <Link href="/playground" className="px-3 py-1 text-xs font-medium rounded-md text-[#71717A] hover:text-[#60A5FA] hover:bg-[rgba(59,130,246,0.08)] transition-all">
                执行模式
              </Link>
              <span className="px-3 py-1 text-xs font-medium rounded-md bg-[rgba(139,92,246,0.15)] text-[#A78BFA]">
                提示词模式
              </span>
            </div>
          </div>
          <div className="flex md:hidden gap-1">
            {(['input', 'phases', 'output'] as const).map(view => (
              <button
                key={view}
                onClick={() => setMobileView(view)}
                className={`px-3 py-1 text-xs rounded-md transition-all ${mobileView === view ? 'bg-[rgba(139,92,246,0.2)] text-[#A78BFA]' : 'text-[#71717A] hover:text-[#A1A1AA]'}`}
              >
                {{ input: '输入', phases: '阶段', output: '预览' }[view]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-grow flex max-w-[1600px] mx-auto w-full">
        <aside className={`${mobileView === 'input' ? 'flex' : 'hidden'} md:flex w-full md:w-80 lg:w-96 border-r border-[rgba(255,255,255,0.06)] flex-col bg-[#09090B]/50`}>
          <div className="p-5 border-b border-[rgba(255,255,255,0.06)]">
            <h2 className="text-sm font-semibold text-[#FAFAFA] mb-1">产品想法</h2>
            <p className="text-xs text-[#71717A] mb-4">输入一句产品描述，自动生成分阶段开发 Prompt</p>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="例如：开发一个校园二手交易平台..."
              className="w-full bg-[#111113] border border-[rgba(255,255,255,0.1)] rounded-xl px-4 py-3 text-[#FAFAFA] placeholder-[#71717A] focus:outline-none focus:border-[#8B5CF6] resize-none text-sm leading-relaxed min-h-[100px] max-h-[200px]"
              rows={4}
            />
            <button
              onClick={handleGenerate}
              disabled={!input.trim()}
              className="w-full mt-3 px-4 py-2.5 rounded-lg text-sm font-medium bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6] text-white hover:shadow-lg hover:shadow-[rgba(139,92,246,0.3)] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              生成 Prompt 策略
            </button>
          </div>

          <div className="flex-grow overflow-y-auto p-5">
            <h3 className="text-xs text-[#71717A] uppercase tracking-wider mb-3">快速示例</h3>
            <div className="space-y-2">
              {EXAMPLES.map((example, i) => (
                <button
                  key={i}
                  onClick={() => handleExampleClick(example)}
                  className="w-full text-left p-3 rounded-lg border border-[rgba(255,255,255,0.06)] hover:border-[rgba(139,92,246,0.3)] hover:bg-[rgba(139,92,246,0.05)] transition-all text-xs text-[#A1A1AA] hover:text-[#FAFAFA] leading-relaxed"
                >
                  {example}
                </button>
              ))}
            </div>

            {pack && (
              <div className="mt-6 pt-6 border-t border-[rgba(255,255,255,0.06)]">
                <StrategySummary pack={pack} />
              </div>
            )}
          </div>
        </aside>

        <div className={`${mobileView === 'phases' ? 'flex' : 'hidden'} md:flex w-full md:w-72 lg:w-80 border-r border-[rgba(255,255,255,0.06)] flex-col bg-[#09090B]/30`}>
          <div className="p-4 border-b border-[rgba(255,255,255,0.06)]">
            <h2 className="text-sm font-semibold text-[#FAFAFA]">
              {pack ? `${pack.phases.length} 个阶段` : '开发阶段'}
            </h2>
          </div>
          <div className="flex-grow overflow-y-auto p-3 space-y-2">
            {pack ? (
              pack.phases.map((phase, i) => (
                <PromptPhaseCard
                  key={phase.id}
                  phase={phase}
                  index={i}
                  isSelected={selectedIndex === i}
                  onSelect={() => { setSelectedIndex(i); setMobileView('output'); }}
                />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center px-6 py-20">
                <div className="w-12 h-12 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-[#71717A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
                  </svg>
                </div>
                <p className="text-xs text-[#71717A]">输入产品想法后生成阶段列表</p>
              </div>
            )}
          </div>
        </div>

        <main className={`${mobileView === 'output' ? 'flex' : 'hidden'} md:flex flex-col flex-grow min-w-0`}>
          <PromptOutput
            phase={selectedPhase}
            phaseIndex={selectedIndex}
            totalPhases={pack?.phases.length ?? 0}
          />
        </main>
      </div>
    </div>
  );
}
