import type { ProjectReasoning } from './reasoner';
import type { PromptDepth, CompiledPhase } from './templates';
import { buildDynamicPhases, getPhaseCountForType } from './templates';

export type { CompiledPhase as Phase };
export type { PromptDepth };

export interface PhasePlanResult {
  phases: CompiledPhase[];
  depth: PromptDepth;
  reasoning: ProjectReasoning;
}

export function planPhases(
  reasoning: ProjectReasoning,
  userIdea: string,
  depth: PromptDepth = 'standard',
  clarificationContext?: string
): CompiledPhase[] {
  return buildDynamicPhases(userIdea, reasoning, depth, clarificationContext);
}

export { getPhaseCountForType };
