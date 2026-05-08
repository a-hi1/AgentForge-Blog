'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AgentBadge from '@/components/agent/AgentBadge';
import AgentStatus from '@/components/agent/AgentStatus';

interface ExecutionStep {
  agent: string;
  task: string;
  output: string;
  status: string;
  timestamp: string;
}

interface Execution {
  id: string;
  prompt: string;
  status?: string;
  summary?: string;
  timestamp: string;
  steps: ExecutionStep[];
}

export default function ComparePage() {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [selectedA, setSelectedA] = useState<string | null>(null);
  const [selectedB, setSelectedB] = useState<string | null>(null);

  useEffect(() => {
    loadExecutions();
  }, []);

  const loadExecutions = async () => {
    try {
      const response = await fetch('/api/executions');
      const data = await response.json();
      setExecutions(data);
    } catch (error) {
      console.error('Failed to load executions:', error);
    }
  };

  const execA = selectedA ? executions.find((e) => e.id === selectedA) : null;
  const execB = selectedB ? executions.find((e) => e.id === selectedB) : null;

  const calculateAgentStats = (steps: ExecutionStep[]) => {
    const stats: Record<string, number> = {};
    steps.forEach((step) => {
      stats[step.agent] = (stats[step.agent] || 0) + 1;
    });
    return stats;
  };

  const statsA = execA ? calculateAgentStats(execA.steps) : {};
  const statsB = execB ? calculateAgentStats(execB.steps) : {};

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* 头部 */}
        <div className="mb-8">
          <Link href="/lab" className="text-[#818cf8] hover:text-[#6366f1] flex items-center gap-2 mb-4">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Lab
          </Link>
          <h1 className="text-3xl font-bold text-[#f8fafc] mb-2">
            Compare Executions
          </h1>
          <p className="text-[#94a3b8]">Select two executions to compare</p>
        </div>

        {/* 选择器 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="p-6 glass-card rounded-xl">
            <label className="block text-sm font-medium text-[#f8fafc] mb-3">
              Execution A
            </label>
            <select
              value={selectedA || ''}
              onChange={(e) => setSelectedA(e.target.value)}
              className="w-full px-4 py-3 bg-[#1e293b]/80 border border-[rgba(255,255,255,0.1)] rounded-lg 
                         text-[#f8fafc] focus:outline-none focus:border-[#6366f1]"
            >
              <option value="">Select execution...</option>
              {executions.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.prompt.slice(0, 50)}... - {new Date(e.timestamp).toLocaleString()}
                </option>
              ))}
            </select>
          </div>

          <div className="p-6 glass-card rounded-xl">
            <label className="block text-sm font-medium text-[#f8fafc] mb-3">
              Execution B
            </label>
            <select
              value={selectedB || ''}
              onChange={(e) => setSelectedB(e.target.value)}
              className="w-full px-4 py-3 bg-[#1e293b]/80 border border-[rgba(255,255,255,0.1)] rounded-lg 
                         text-[#f8fafc] focus:outline-none focus:border-[#6366f1]"
            >
              <option value="">Select execution...</option>
              {executions.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.prompt.slice(0, 50)}... - {new Date(e.timestamp).toLocaleString()}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 比较内容 */}
        {execA && execB && (
          <div className="space-y-6">
            {/* 基本信息 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-6 glass-card rounded-xl">
                <h3 className="text-lg font-semibold text-[#f8fafc] mb-4">
                  Execution A
                </h3>
                {execA.status && <AgentStatus status={execA.status as any} className="mb-2" />}
                <p className="text-sm text-[#64748b] mb-2">
                  {new Date(execA.timestamp).toLocaleString()}
                </p>
                <div className="p-4 bg-[#0f172a] rounded-lg">
                  <p className="text-[#94a3b8]">{execA.prompt}</p>
                </div>
              </div>

              <div className="p-6 glass-card rounded-xl">
                <h3 className="text-lg font-semibold text-[#f8fafc] mb-4">
                  Execution B
                </h3>
                {execB.status && <AgentStatus status={execB.status as any} className="mb-2" />}
                <p className="text-sm text-[#64748b] mb-2">
                  {new Date(execB.timestamp).toLocaleString()}
                </p>
                <div className="p-4 bg-[#0f172a] rounded-lg">
                  <p className="text-[#94a3b8]">{execB.prompt}</p>
                </div>
              </div>
            </div>

            {/* Agent 贡献比较 */}
            <div className="p-6 glass-card rounded-xl">
              <h3 className="text-lg font-semibold text-[#f8fafc] mb-6">
                Agent Contribution Comparison
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-[#64748b] mb-4">Execution A</h4>
                  {Object.entries(statsA).map(([agent, count]) => (
                    <div key={agent} className="mb-3">
                      <div className="flex items-center gap-2 mb-1">
                        <AgentBadge agent={agent} size="sm" />
                        <span className="text-[#94a3b8] text-sm">{count} steps</span>
                      </div>
                      <div className="h-2 bg-[#1e293b] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#6366f1]"
                          style={{
                            width: `${(count / Object.values(statsA).reduce((a, b) => a + b, 0)) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <h4 className="text-sm font-medium text-[#64748b] mb-4">Execution B</h4>
                  {Object.entries(statsB).map(([agent, count]) => (
                    <div key={agent} className="mb-3">
                      <div className="flex items-center gap-2 mb-1">
                        <AgentBadge agent={agent} size="sm" />
                        <span className="text-[#94a3b8] text-sm">{count} steps</span>
                      </div>
                      <div className="h-2 bg-[#1e293b] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#8b5cf6]"
                          style={{
                            width: `${(count / Object.values(statsB).reduce((a, b) => a + b, 0)) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 步骤比较 */}
            <div className="p-6 glass-card rounded-xl">
              <h3 className="text-lg font-semibold text-[#f8fafc] mb-6">
                Step-by-Step Comparison
              </h3>
              <div className="space-y-6">
                {Array.from({ length: Math.max(execA.steps.length, execB.steps.length) }).map((_, index) => (
                  <div key={index} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div
                      className={`p-4 rounded-lg border ${
                        execA.steps[index]
                          ? 'border-[rgba(99,102,241,0.3)] bg-[rgba(99,102,241,0.05)]'
                          : 'border-[rgba(255,255,255,0.05)] bg-[#1e293b]/30 opacity-50'
                      }`}
                    >
                      {execA.steps[index] && (
                        <>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs text-[#64748b]">Step {index + 1}</span>
                            <AgentBadge agent={execA.steps[index].agent} size="sm" />
                          </div>
                          <p className="text-sm text-[#94a3b8] mb-2">
                            {execA.steps[index].task}
                          </p>
                          <div className="p-3 bg-[#0f172a] rounded text-xs font-mono text-[#64748b] max-h-32 overflow-y-auto">
                            {execA.steps[index].output.slice(0, 200)}...
                          </div>
                        </>
                      )}
                    </div>

                    <div
                      className={`p-4 rounded-lg border ${
                        execB.steps[index]
                          ? 'border-[rgba(139,92,246,0.3)] bg-[rgba(139,92,246,0.05)]'
                          : 'border-[rgba(255,255,255,0.05)] bg-[#1e293b]/30 opacity-50'
                      }`}
                    >
                      {execB.steps[index] && (
                        <>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs text-[#64748b]">Step {index + 1}</span>
                            <AgentBadge agent={execB.steps[index].agent} size="sm" />
                          </div>
                          <p className="text-sm text-[#94a3b8] mb-2">
                            {execB.steps[index].task}
                          </p>
                          <div className="p-3 bg-[#0f172a] rounded text-xs font-mono text-[#64748b] max-h-32 overflow-y-auto">
                            {execB.steps[index].output.slice(0, 200)}...
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
