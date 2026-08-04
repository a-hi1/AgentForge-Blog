'use client';

import { memo, type ReactNode } from 'react';
import { Step } from '@/lib/types/execution';

interface AgentPipelineProps {
  steps: Step[];
}

function getAgentIcon(agent: string): ReactNode {
  const props = {
    className: 'w-6 h-6',
    fill: 'none',
    stroke: 'currentColor',
    viewBox: '0 0 24 24',
    'aria-hidden': true as const,
  };

  if (agent.includes('Architect')) {
    return (
      <svg {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    );
  }
  if (agent.includes('Coding')) {
    return (
      <svg {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    );
  }
  if (agent.includes('Debug')) {
    return (
      <svg {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    );
  }
  if (agent.includes('Optimization')) {
    return (
      <svg {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    );
  }
  if (agent.includes('Deploy')) {
    return (
      <svg {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
      </svg>
    );
  }
  return (
    <svg {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function AgentPipeline({ steps }: AgentPipelineProps) {
  return (
    <div className="glass-card rounded-xl p-6">
      <h3 className="text-lg font-bold text-[var(--text)] mb-6">Agent 执行管线</h3>

      <div className="flex flex-col items-center space-y-4">
        {steps.length === 0 ? (
          <div className="text-[var(--text-tertiary)] text-center py-8">
            <p>Agent 执行管线将在此处显示</p>
            <p className="text-sm mt-2">点击「启动执行」开始</p>
          </div>
        ) : (
          steps.map((step) => (
            <div key={step.step} className="flex items-center gap-4 w-full">
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-500 ${
                  step.status === 'completed'
                    ? 'bg-[#10B981] text-white shadow-lg shadow-[#10B981]/30'
                    : step.status === 'executing'
                      ? 'bg-[#3B82F6] text-white shadow-lg shadow-[#3B82F6]/50 animate-pulse'
                      : 'bg-[rgba(24,24,27,0.72)] border border-[var(--border-light)] text-[var(--text-tertiary)]'
                }`}
              >
                {getAgentIcon(step.agent)}
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`font-semibold ${
                    step.status === 'completed' ? 'text-[#10B981]' :
                    step.status === 'executing' ? 'text-[#60A5FA]' : 'text-[var(--text-tertiary)]'
                  }`}>
                    {step.agent}
                  </span>
                  {step.status === 'executing' && (
                    <span className="text-xs text-[#60A5FA] animate-pulse">执行中...</span>
                  )}
                </div>
                <p className="text-sm text-[var(--text-tertiary)] truncate">{step.task}</p>
              </div>

              <div className={`w-3 h-3 rounded-full ${
                step.status === 'completed' ? 'bg-[#10B981]' :
                step.status === 'executing' ? 'bg-[#60A5FA] animate-pulse' : 'bg-[var(--text-tertiary)]'
              }`} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default memo(AgentPipeline);
