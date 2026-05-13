import { IntentResult, DecomposeResult } from './reasoner';

export interface CompiledPack {
  intent: IntentResult;
  decompose: DecomposeResult;
  markdown: string;
}

export function compilePromptPack(
  intent: IntentResult,
  decompose: DecomposeResult,
  promptMarkdown: string
): CompiledPack {
  return {
    intent,
    decompose,
    markdown: promptMarkdown,
  };
}
