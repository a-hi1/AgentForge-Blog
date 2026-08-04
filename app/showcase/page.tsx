'use client';

import { useState } from 'react';
import Link from 'next/link';
import DemoRunner from '@/components/showcase/DemoRunner';
import AgentPipeline from '@/components/showcase/AgentPipeline';
import ScenarioSelector from '@/components/showcase/ScenarioSelector';
import DemoMetrics from '@/components/showcase/DemoMetrics';
import CapabilityStoryboard from '@/components/showcase/CapabilityStoryboard';
import ArchitectureCanvas from '@/components/showcase/ArchitectureCanvas';
import CapabilityComparison from '@/components/showcase/CapabilityComparison';
import { downloadReport, ExecutionReport } from '@/lib/demo/reportExporter';
import { Step } from '@/lib/types/execution';

const scenarios = [
  { id: 'saas', name: 'SaaS 平台构建', prompt: 'Build a production-ready SaaS blog platform with authentication, CMS, and deployment pipeline' },
  { id: 'debug', name: '生产问题诊断', prompt: 'Debug and fix production performance issues in a high-traffic application' },
  { id: 'deploy', name: 'AI 平台部署', prompt: 'Deploy enterprise AI engineering platform with containerization and CI/CD' },
  { id: 'refactor', name: '架构现代化', prompt: 'Refactor and modernize legacy monolith into microservice architecture' },
  { id: 'optimize', name: '性能深度优化', prompt: 'Optimize application performance bottlenecks through caching, indexing, and query optimization' },
];

const capabilityIcons = {
  storage: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.5 6.75C4.5 8.407 7.858 9.75 12 9.75s7.5-1.343 7.5-3m-15 0c0-1.657 3.358-3 7.5-3s7.5 1.343 7.5 3m-15 0v10.5c0 1.657 3.358 3 7.5 3s7.5-1.343 7.5-3V6.75m-15 5.25c0 1.657 3.358 3 7.5 3s7.5-1.343 7.5-3" />
  ),
  memory: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5m5.25-11.396a2.25 2.25 0 013.5 1.864v3.85c0 .597.237 1.169.659 1.591L19 15m-9.25-11.896A2.25 2.25 0 006.25 4.968v3.85c0 .597-.237 1.169-.659 1.591L4.5 11.5m9.75-8.396a2.25 2.25 0 013.5 1.864v3.85c0 .597.237 1.169.659 1.591l1.091 1.091M6 15.75h12M7.5 20.25h9" />
  ),
  adaptive: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.023 9.348h4.992V4.356m-.997 4.993a8.25 8.25 0 10.683 8.301M2.985 19.644v-4.992h4.992m-3.995-.001a8.25 8.25 0 0013.775 3.099" />
  ),
  observability: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 3v11.25A3.75 3.75 0 007.5 18h13.5M7.5 14.25l3-3 2.25 2.25L17.25 9l3.75 3.75" />
  ),
};

function CapabilityIcon({ type }: { type: keyof typeof capabilityIcons }) {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      {capabilityIcons[type]}
    </svg>
  );
}

export default function ShowcasePage() {
  const [selectedScenario, setSelectedScenario] = useState(scenarios[0]);
  const [isRunning, setIsRunning] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [memoriesUsed, setMemoriesUsed] = useState<any[]>([]);
  const [memoryInfluenced, setMemoryInfluenced] = useState(false);
  const [adaptations, setAdaptations] = useState<string[]>([]);
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  return (
    <main className="min-h-[calc(100vh-144px)] py-10 sm:py-14">
      <div className="page-shell max-w-7xl">
        <section className="mb-10 border-b border-white/[0.06] pb-10 sm:mb-12 sm:pb-12">
          <div className="mb-7 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <span className="badge badge-blue mb-5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#60A5FA] shadow-[0_0_12px_rgba(96,165,250,0.8)]" />
                工程能力中心
              </span>
              <h1 className="mb-4 text-3xl font-bold text-[#FAFAFA] sm:text-4xl">
                AI 智能工程能力展示
              </h1>
              <p className="max-w-xl text-sm leading-7 text-[#A1A1AA] sm:text-base">
                实时观察多代理协同、记忆驱动决策和自适应规划的完整工程链路。
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-[#71717A]">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#10B981]/20 bg-[#10B981]/10 text-[#34D399]">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12.75l4.5 4.5L19 6.75" />
                </svg>
              </span>
              <div>
                <p className="font-medium text-[#D4D4D8]">系统在线</p>
                <p>实时执行通道已就绪</p>
              </div>
            </div>
          </div>
          <DemoMetrics />
        </section>

        <section className="mb-8">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="section-label mb-2">SCENARIO</p>
              <h2 className="text-lg font-semibold text-[#FAFAFA]">选择工程场景</h2>
            </div>
            <span className="hidden text-xs text-[#52525B] sm:block">切换场景将重置当前运行状态</span>
          </div>
          <ScenarioSelector
            scenarios={scenarios}
            selectedId={selectedScenario.id}
            onSelect={(id) => {
              const scenario = scenarios.find(s => s.id === id);
              if (scenario) {
                setSelectedScenario(scenario);
                setSteps([]);
                setLogs([]);
                setIsRunning(false);
              }
            }}
          />
        </section>

        <section className="mb-14 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-6">
            <DemoRunner
              prompt={selectedScenario.prompt}
              isRunning={isRunning}
              setIsRunning={setIsRunning}
              steps={steps}
              setSteps={setSteps}
              memoriesUsed={memoriesUsed}
              setMemoriesUsed={setMemoriesUsed}
              memoryInfluenced={memoryInfluenced}
              setMemoryInfluenced={setMemoryInfluenced}
              adaptations={adaptations}
              setAdaptations={setAdaptations}
              executionId={executionId}
              setExecutionId={setExecutionId}
              logs={logs}
              setLogs={setLogs}
            />
            <AgentPipeline steps={steps} />
          </div>

          <aside className="min-w-0 xl:sticky xl:top-24 xl:self-start">
            <CapabilityStoryboard
              steps={steps}
              memoriesUsed={memoriesUsed}
              memoryInfluenced={memoryInfluenced}
              adaptations={adaptations}
            />
          </aside>
        </section>

        <section className="mb-14">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="section-label mb-2">ARCHITECTURE</p>
              <h2 className="text-xl font-semibold text-[#FAFAFA]">系统架构</h2>
            </div>
            <p className="text-sm text-[#71717A]">点击节点探索组件详情</p>
          </div>
          <ArchitectureCanvas />
        </section>

        <section className="mb-14">
          <CapabilityComparison />
        </section>

        {steps.length > 0 && (
          <section className="glass-card mb-14 flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <p className="section-label mb-2">EXECUTION REPORT</p>
              <h2 className="text-base font-semibold text-[#FAFAFA]">执行数据已准备完成</h2>
              <p className="mt-1 text-sm text-[#71717A]">导出包含步骤、记忆引用和规划调整的完整报告。</p>
            </div>
            <button
              onClick={() => {
                const report: ExecutionReport = {
                  prompt: selectedScenario.prompt,
                  steps,
                  memoriesUsed,
                  memoryInfluenced,
                  adaptations,
                  executionId,
                  timestamp: new Date(),
                };
                downloadReport(report);
              }}
              className="btn-secondary shrink-0"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 3v12m0 0l4-4m-4 4l-4-4M5 19.5h14" />
              </svg>
              导出执行报告
            </button>
          </section>
        )}

        <section className="glass-card mb-14 overflow-hidden">
          <div className="border-b border-white/[0.06] px-6 py-5">
            <p className="section-label mb-2">VERIFICATION</p>
            <h2 className="text-lg font-semibold text-[#FAFAFA]">工程能力验证</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4">
            {[
              { type: 'storage' as const, title: '云存储持久性', description: 'Supabase 实时数据持久化', tone: 'text-[#60A5FA]', border: 'lg:border-r border-white/[0.06]' },
              { type: 'memory' as const, title: '记忆系统', description: '基于向量检索的自适应记忆', tone: 'text-[#C4B5FD]', border: 'lg:border-r border-white/[0.06]' },
              { type: 'adaptive' as const, title: '自适应规划', description: '记忆驱动的动态流程调整', tone: 'text-[#34D399]', border: 'lg:border-r border-white/[0.06]' },
              { type: 'observability' as const, title: '可观测性', description: '全链路执行追踪与分析', tone: 'text-[#FBBF24]', border: '' },
            ].map((capability) => (
              <div key={capability.title} className={`border-b border-white/[0.06] p-6 sm:even:border-l sm:last:border-b-0 lg:border-b-0 ${capability.border}`}>
                <div className={`mb-5 flex h-10 w-10 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] ${capability.tone}`}>
                  <CapabilityIcon type={capability.type} />
                </div>
                <h3 className="mb-1.5 text-sm font-semibold text-[#FAFAFA]">{capability.title}</h3>
                <p className="text-xs leading-5 text-[#71717A]">{capability.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-5 border-t border-white/[0.06] pt-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-[#D4D4D8]">深入了解 AgentForge 系统设计</p>
            <p className="mt-1 text-xs text-[#71717A]">查看架构决策、能力边界与完整工程说明。</p>
          </div>
          <Link href="/interview" className="btn-primary shrink-0">
            查看系统完整说明
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </section>
      </div>
    </main>
  );
}
