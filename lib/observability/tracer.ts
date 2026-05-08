/**
 * Execution Tracer
 * Records all execution details for debugging and analytics
 */

import { Step } from '@/lib/types/execution';

export interface ExecutionTrace {
  executionId: string;
  prompt: string;
  steps: Step[];
  duration: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  tokenUsage: number;
  timestamp: number;
  memoryInfluenced: boolean;
  memoriesUsed: number;
}

class ExecutionTracer {
  private traces: Map<string, ExecutionTrace> = new Map();
  private readonly MAX_TRACES = 1000;

  public startTrace(
    executionId: string,
    prompt: string
  ): void {
    const trace: ExecutionTrace = {
      executionId,
      prompt,
      steps: [],
      duration: 0,
      status: 'pending',
      tokenUsage: 0,
      timestamp: Date.now(),
      memoryInfluenced: false,
      memoriesUsed: 0
    };
    
    this.traces.set(executionId, trace);
    this.cleanupOldTraces();
  }

  public updateStatus(
    executionId: string,
    status: ExecutionTrace['status']
  ): void {
    const trace = this.traces.get(executionId);
    if (trace) {
      trace.status = status;
      if (status === 'completed' || status === 'failed') {
        trace.duration = Date.now() - trace.timestamp;
      }
    }
  }

  public addStep(executionId: string, step: Step): void {
    const trace = this.traces.get(executionId);
    if (trace) {
      trace.steps.push(step);
    }
  }

  public updateMemoryInfo(
    executionId: string,
    memoryInfluenced: boolean,
    memoriesUsed: number
  ): void {
    const trace = this.traces.get(executionId);
    if (trace) {
      trace.memoryInfluenced = memoryInfluenced;
      trace.memoriesUsed = memoriesUsed;
    }
  }

  public recordTokenUsage(executionId: string, tokens: number): void {
    const trace = this.traces.get(executionId);
    if (trace) {
      trace.tokenUsage += tokens;
    }
  }

  public getTrace(executionId: string): ExecutionTrace | undefined {
    return this.traces.get(executionId);
  }

  public getAllTraces(): ExecutionTrace[] {
    return Array.from(this.traces.values()).sort(
      (a, b) => b.timestamp - a.timestamp
    );
  }

  private cleanupOldTraces(): void {
    if (this.traces.size > this.MAX_TRACES) {
      const sortedTraces = Array.from(this.traces.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp);
      
      const toDelete = sortedTraces.slice(0, this.traces.size - this.MAX_TRACES);
      toDelete.forEach(([id]) => this.traces.delete(id));
    }
  }
}

export const executionTracer = new ExecutionTracer();
