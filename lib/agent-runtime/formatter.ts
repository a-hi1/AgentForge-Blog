export interface StreamEvent {
  type: 'step_start' | 'step_chunk' | 'step_complete' | 'complete' | 'memory_influence' | 'memory_status';
  step: number;
  agent?: string;
  task?: string;
  output?: string;
  memories?: any[];
  memory_influenced?: boolean;
  adaptations?: string[];
  adaptation_reason?: string[];
  memory_influence_level?: number;
  message?: string;
  executionId?: string;
}

export function formatStepStart(step: number, agent: string, task: string): StreamEvent {
  return {
    type: 'step_start',
    step,
    agent,
    task,
  };
}

export function formatStepChunk(step: number, chunk: string): StreamEvent {
  return {
    type: 'step_chunk',
    step,
    output: chunk,
  };
}

export function formatStepComplete(step: number, output: string): StreamEvent {
  return {
    type: 'step_complete',
    step,
    output,
  };
}

export function formatComplete(): StreamEvent {
  return {
    type: 'complete',
    step: 0,
  };
}

export function formatMemoryInfluence(data: {
  memories_used: any[];
  memory_influenced: boolean;
  adaptations: string[];
  adaptation_reason?: string[];
  memory_influence_level?: number;
}): StreamEvent {
  return {
    type: 'memory_influence',
    step: 0,
    memories: data.memories_used,
    memory_influenced: data.memory_influenced,
    adaptations: data.adaptations,
    adaptation_reason: data.adaptation_reason,
    memory_influence_level: data.memory_influence_level
  };
}

export function formatMemoryStatus(message: string): StreamEvent {
  return {
    type: 'memory_status',
    step: 0,
    message: message
  };
}

export function encodeStreamEvent(event: StreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}
