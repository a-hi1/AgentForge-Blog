import { IntentResult, ArchitectureResult, DecomposeResult } from './reasoner';

export interface CompiledPack {
  intent: IntentResult;
  architecture: ArchitectureResult;
  decompose: DecomposeResult;
  markdown: string;
}

export function compilePromptPack(
  intent: IntentResult,
  architecture: ArchitectureResult,
  decompose: DecomposeResult,
  promptMarkdown: string
): CompiledPack {
  return {
    intent,
    architecture,
    decompose,
    markdown: promptMarkdown,
  };
}
