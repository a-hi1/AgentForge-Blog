'use client';

import { Step } from '@/lib/types/execution';

interface AgentPipelineProps {
  steps: Step[];
}

export default function AgentPipeline({ steps }: AgentPipelineProps) {
  const getAgentIcon = (agent: string) => {
    if (agent.includes('Architect')) return '🏛️';
    if (agent.includes('Coding')) return '💻';
    if (agent.includes('Debug')) return '🔍';
    if (agent.includes('Optimization')) return '⚡';
    if (agent.includes('Deploy')) return '🚀';
    return '🤖';
  };

  const getAgentColor = (agent: string) => {
    if (agent.includes('Architect')) return '#818cf8';
    if (agent.includes('Coding')) return '#3b82f6';
    if (agent.includes('Debug')) return '#f59e0b';
    if (agent.includes('Optimization')) return '#10b981';
    if (agent.includes('Deploy')) return '#8b5cf6';
    return '#64748b';
  };

  return (
    <div className="glass-card rounded-xl p-6">
      <h3 className="text-lg font-bold text-[#f8fafc] mb-6">Agent Pipeline</h3>
      
      <div className="flex flex-col items-center space-y-4">
        {steps.length === 0 ? (
          <div className="text-[#64748b] text-center py-8">
            <p>Agent pipeline will appear here</p>
            <p className="text-sm mt-2">Click "Launch Demo" to start</p>
          </div>
        ) : (
          steps.map((step, index) => (
            <div key={step.step} className="flex items-center gap-4 w-full">
              {/* Agent Node */}
              <div 
                className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl transition-all duration-500 ${
                  step.status === 'completed' 
                    ? 'bg-[#10b981] shadow-lg shadow-[#10b981]/30' 
                    : step.status === 'executing' 
                      ? 'bg-[#6366f1] shadow-lg shadow-[#6366f1]/50 animate-pulse' 
                      : 'bg-[#1e293b] border border-[rgba(255,255,255,0.1)]'
                }`}
              >
                {getAgentIcon(step.agent)}
              </div>
              
              {/* Label */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`font-semibold ${
                    step.status === 'completed' ? 'text-[#10b981]' : 
                    step.status === 'executing' ? 'text-[#818cf8]' : 'text-[#64748b]'
                  }`}>
                    {step.agent}
                  </span>
                  {step.status === 'executing' && (
                    <span className="text-xs text-[#818cf8] animate-pulse">
                      thinking...
                    </span>
                  )}
                </div>
                <p className="text-sm text-[#64748b] truncate">{step.task}</p>
              </div>

              {/* Status Dot */}
              <div className={`w-3 h-3 rounded-full ${
                step.status === 'completed' ? 'bg-[#10b981]' : 
                step.status === 'executing' ? 'bg-[#818cf8] animate-pulse' : 'bg-[#64748b]'
              }`} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
