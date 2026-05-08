'use client';

import { memo } from 'react';
import { Step } from '@/lib/types/execution';

interface AgentPipelineProps {
  steps: Step[];
}

function AgentPipeline({ steps }: AgentPipelineProps) {
  const getAgentIcon = (agent: string) => {
    if (agent.includes('Architect')) return '🏛️';
    if (agent.includes('Coding')) return '💻';
    if (agent.includes('Debug')) return '🔍';
    if (agent.includes('Optimization')) return '⚡';
    if (agent.includes('Deploy')) return '🚀';
    return '🤖';
  };

  return (
    <div className="glass-card rounded-xl p-6">
      <h3 className="text-lg font-bold text-[#FAFAFA] mb-6">Agent 执行管线</h3>
      
      <div className="flex flex-col items-center space-y-4">
        {steps.length === 0 ? (
          <div className="text-[#71717A] text-center py-8">
            <p>Agent 执行管线将在此处显示</p>
            <p className="text-sm mt-2">点击「启动执行」开始</p>
          </div>
        ) : (
          steps.map((step) => (
            <div key={step.step} className="flex items-center gap-4 w-full">
              <div 
                className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl transition-all duration-500 ${
                  step.status === 'completed' 
                    ? 'bg-[#10B981] shadow-lg shadow-[#10B981]/30' 
                    : step.status === 'executing' 
                      ? 'bg-[#3B82F6] shadow-lg shadow-[#3B82F6]/50 animate-pulse' 
                      : 'bg-[rgba(24,24,27,0.72)] border border-[rgba(255,255,255,0.1)]'
                }`}
              >
                {getAgentIcon(step.agent)}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`font-semibold ${
                    step.status === 'completed' ? 'text-[#10B981]' : 
                    step.status === 'executing' ? 'text-[#60A5FA]' : 'text-[#71717A]'
                  }`}>
                    {step.agent}
                  </span>
                  {step.status === 'executing' && (
                    <span className="text-xs text-[#60A5FA] animate-pulse">执行中...</span>
                  )}
                </div>
                <p className="text-sm text-[#71717A] truncate">{step.task}</p>
              </div>

              <div className={`w-3 h-3 rounded-full ${
                step.status === 'completed' ? 'bg-[#10B981]' : 
                step.status === 'executing' ? 'bg-[#60A5FA] animate-pulse' : 'bg-[#71717A]'
              }`} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default memo(AgentPipeline);