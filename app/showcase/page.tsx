'use client';

import { useState } from 'react';
import Link from 'next/link';
import DemoRunner from '@/components/showcase/DemoRunner';
import AgentPipeline from '@/components/showcase/AgentPipeline';
import CapabilityStoryboard from '@/components/showcase/CapabilityStoryboard';
import ArchitectureCanvas from '@/components/showcase/ArchitectureCanvas';
import ScenarioSelector from '@/components/showcase/ScenarioSelector';
import DemoMetrics from '@/components/showcase/DemoMetrics';
import { downloadReport, ExecutionReport } from '@/lib/demo/reportExporter';
import { Step } from '@/lib/types/execution';

const scenarios = [
  { id: 'saas', name: 'SaaS 平台构建', prompt: 'Build a production-ready SaaS blog platform with authentication, CMS, and deployment pipeline' },
  { id: 'debug', name: '生产问题诊断', prompt: 'Debug and fix production performance issues in a high-traffic application' },
  { id: 'deploy', name: 'AI 平台部署', prompt: 'Deploy enterprise AI engineering platform with containerization and CI/CD' },
  { id: 'refactor', name: '架构现代化', prompt: 'Refactor and modernize legacy monolith into microservice architecture' },
  { id: 'optimize', name: '性能深度优化', prompt: 'Optimize application performance bottlenecks through caching, indexing, and query optimization' },
];

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
    <div className="min-h-[calc(100vh-144px)] py-8 px-4">
      <div className="max-w-7xl mx-auto">
        
        <section className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[rgba(99,102,241,0.08)] border border-[rgba(99,102,241,0.2)] text-[#818cf8] text-xs font-medium tracking-wider mb-6">
            工程能力中心
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-[#f8fafc] mb-3">
            AI 智能工程能力展示
          </h1>
          <p className="text-sm text-[#64748b] max-w-xl mx-auto mb-8">
            实时观察多代理协同、记忆驱动决策和自适应规划的完整工程链路。
          </p>
          
          {/* Live Metrics */}
          <DemoMetrics />
        </section>

        {/* Scenario Selector */}
        <section className="mb-12">
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

        {/* Main Demo Area */}
        <section className="grid lg:grid-cols-3 gap-8 mb-12">
          
          {/* Left: Live Execution */}
          <div className="lg:col-span-2 space-y-6">
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

          {/* Right: Capability Storyboard */}
          <div>
            <CapabilityStoryboard 
              steps={steps} 
              memoriesUsed={memoriesUsed} 
              memoryInfluenced={memoryInfluenced}
              adaptations={adaptations}
            />
          </div>

        </section>

        <section className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-xl font-semibold text-[#f8fafc] mb-2">系统架构</h2>
            <p className="text-[#64748b] text-sm">点击节点探索组件详情</p>
          </div>
          <ArchitectureCanvas />
        </section>

        {/* Export Section */}
        {steps.length > 0 && (
          <section className="mb-12 text-center">
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
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#1e293b] text-[#f8fafc] font-semibold border border-[rgba(255,255,255,0.15)] hover:bg-[#334155] hover:border-[#6366f1] transition-all"
            >
              📥 导出执行报告
            </button>
          </section>
        )}

        <section className="glass-card rounded-xl p-8 mb-12">
          <h2 className="text-xl font-semibold text-[#f8fafc] mb-6 text-center">
            工程能力验证
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-[#6366f1]/20 to-[#8b5cf6]/20 flex items-center justify-center text-lg">💾</div>
              <h3 className="text-[#f8fafc] text-sm font-semibold mb-1">云存储持久性</h3>
              <p className="text-[#64748b] text-xs">Supabase 实时数据持久化</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-[#8b5cf6]/20 to-[#a78bfa]/20 flex items-center justify-center text-lg">🧠</div>
              <h3 className="text-[#f8fafc] text-sm font-semibold mb-1">记忆系统</h3>
              <p className="text-[#64748b] text-xs">基于向量检索的自适应记忆</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-[#10b981]/20 to-[#34d399]/20 flex items-center justify-center text-lg">🔄</div>
              <h3 className="text-[#f8fafc] text-sm font-semibold mb-1">自适应规划</h3>
              <p className="text-[#64748b] text-xs">记忆驱动的动态流程调整</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-[#f59e0b]/20 to-[#fbbf24]/20 flex items-center justify-center text-lg">📊</div>
              <h3 className="text-[#f8fafc] text-sm font-semibold mb-1">可观测性</h3>
              <p className="text-[#64748b] text-xs">全链路执行追踪与分析</p>
            </div>
          </div>
        </section>

        <section className="text-center">
          <Link
            href="/interview"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-lg bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] text-white font-semibold hover:shadow-lg hover:shadow-[rgba(99,102,241,0.35)] transition-all text-sm"
          >
            查看系统完整说明
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
          </Link>
        </section>

      </div>
    </div>
  );
}
