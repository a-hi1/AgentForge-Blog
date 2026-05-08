'use client';

import { useState, useEffect, useRef } from 'react';
import AgentBadge from '@/components/agent/AgentBadge';
import AgentStatus from '@/components/agent/AgentStatus';
import { Step } from '@/lib/types/execution';

interface DemoRunnerProps {
  prompt: string;
  isRunning: boolean;
  setIsRunning: (v: boolean) => void;
  steps: Step[];
  setSteps: (steps: Step[] | ((prev: Step[]) => Step[])) => void;
  memoriesUsed: any[];
  setMemoriesUsed: (memories: any[]) => void;
  memoryInfluenced: boolean;
  setMemoryInfluenced: (v: boolean) => void;
  adaptations: string[];
  setAdaptations: (adaptations: string[]) => void;
  executionId: string | null;
  setExecutionId: (id: string | null) => void;
  logs: string[];
  setLogs: (logs: string[] | ((prev: string[]) => string[])) => void;
}

export default function DemoRunner({ 
  prompt,
  isRunning, 
  setIsRunning, 
  steps, 
  setSteps, 
  memoriesUsed, 
  setMemoriesUsed, 
  memoryInfluenced, 
  setMemoryInfluenced, 
  adaptations, 
  setAdaptations, 
  executionId, 
  setExecutionId, 
  logs, 
  setLogs 
}: DemoRunnerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev: string[]) => [...prev, `[${timestamp}] ${message}`]);
  };

  const runDemo = async () => {
    if (isLoading || isRunning) return;
    
    setSteps([]);
    setMemoriesUsed([]);
    setMemoryInfluenced(false);
    setAdaptations([]);
    setExecutionId(null);
    setLogs([]);
    setIsRunning(true);
    setIsLoading(true);

    try {
      addLog('正在启动执行...');
      
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        throw new Error(`请求失败: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data.trim()) {
                try {
                  const event = JSON.parse(data);
                  handleStreamEvent(event);
                } catch (e) {
                  console.error('Parse error:', e);
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error:', error);
      addLog(`错误: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
      setIsRunning(false);
    }
  };

  const handleStreamEvent = (event: any) => {
    if (event.type === 'memory_status') {
      addLog(event.message);
    } else if (event.type === 'memory_influence') {
      setMemoriesUsed(event.memories || []);
      setMemoryInfluenced(event.memory_influenced || false);
      setAdaptations(event.adaptations || []);
      if ((event.memories?.length ?? 0) > 0) {
        addLog(`已召回 ${event.memories?.length ?? 0} 条相关记忆`);
      }
    } else if (event.type === 'step_start') {
      const newStep: Step = {
        step: event.step,
        agent: event.agent,
        task: event.task,
        output: '',
        status: 'executing',
      };
      setSteps(prev => [...prev, newStep]);
      addLog(`${event.agent} 已开始: ${event.task}`);
    } else if (event.type === 'step_chunk') {
      setSteps(prev => {
        const newSteps = [...prev];
        const stepIndex = newSteps.findIndex(s => s.step === event.step);
        if (stepIndex >= 0) {
          newSteps[stepIndex] = {
            ...newSteps[stepIndex],
            output: newSteps[stepIndex].output + event.output,
          };
        }
        return newSteps;
      });
    } else if (event.type === 'step_complete') {
      setSteps(prev => {
        const newSteps = [...prev];
        const stepIndex = newSteps.findIndex(s => s.step === event.step);
        if (stepIndex >= 0) {
          newSteps[stepIndex] = {
            ...newSteps[stepIndex],
            output: event.output,
            status: 'completed',
          };
        }
        return newSteps;
      });
      addLog(`✅ ${event.agent} 已完成`);
    } else if (event.type === 'complete') {
      setExecutionId(event.executionId || `exec-${Date.now()}`);
      addLog('执行完成!');
    }
  };

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const currentStep = steps.find(s => s.status === 'executing');
  const lastCompletedStep = [...steps].reverse().find(s => s.status === 'completed');

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div className="p-5 border-b border-[rgba(255,255,255,0.06)]">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-[#FAFAFA]">
            实时执行
          </h3>
          <div className="flex items-center gap-3">
            {isRunning ? (
              <button
                onClick={() => {
                  setIsLoading(false);
                  setIsRunning(false);
                }}
                className="px-4 py-2 bg-[rgba(239,68,68,0.1)] text-[#ef4444] rounded-lg text-xs font-medium hover:bg-[rgba(239,68,68,0.2)] transition-all border border-[rgba(239,68,68,0.2)]"
              >
                停止
              </button>
            ) : (
              <button
                onClick={runDemo}
                disabled={isLoading}
                className="px-5 py-2.5 bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white rounded-lg text-sm font-medium hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? '执行中...' : '启动执行'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="p-6">
        {currentStep ? (
          <div className="mb-6 p-4 bg-[#111113] rounded-lg border border-[rgba(59,130,246,0.2)]">
            <div className="flex items-center gap-3 mb-3">
              <AgentBadge agent={currentStep.agent} />
              <AgentStatus status="executing" size="sm" />
            </div>
            <p className="text-[#A1A1AA]">{currentStep.task}</p>
          </div>
        ) : lastCompletedStep ? (
          <div className="mb-6 p-4 bg-[#111113] rounded-lg border border-[rgba(16,185,129,0.2)]">
            <div className="flex items-center gap-3 mb-3">
              <AgentBadge agent={lastCompletedStep.agent} />
              <AgentStatus status="completed" size="sm" />
            </div>
            <p className="text-[#A1A1AA]">{lastCompletedStep.task}</p>
          </div>
        ) : null}

        <div className="bg-[#09090B] rounded-lg p-4 max-h-56 overflow-y-auto font-mono text-xs">
          {logs.length === 0 ? (
            <p className="text-[#71717A]">选择场景后点击「启动执行」...</p>
          ) : (
            logs.map((log, i) => (
              <p key={i} className={`mb-1 ${log.includes('✅') ? 'text-[#10B981]' : 'text-[#A1A1AA]'}`}>
                {log}
              </p>
            ))
          )}
          <div ref={scrollRef} />
        </div>
      </div>
    </div>
  );
}
