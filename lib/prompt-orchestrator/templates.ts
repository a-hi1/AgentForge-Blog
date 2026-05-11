import type { Complexity } from './reasoner';

export type PromptDepth = 'quick' | 'standard' | 'expert' | 'architect';

export interface CompiledPhase {
  id: string;
  name: string;
  description: string;
  prompt: string;
  depth: PromptDepth;
  score?: number;
  scoreFeedback?: string[];
  estimatedTime?: string;
  priority?: 'required' | 'recommended' | 'optional';
}