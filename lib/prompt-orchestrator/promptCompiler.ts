import type { IntentResult, ArchitectureResult } from './reasoner';
import type { CompiledPhase, PromptDepth } from './templates';

export interface CompiledPack {
  title: string;
  summary: string;
  intent: IntentResult;
  architecture: ArchitectureResult;
  phases: CompiledPhase[];
  depth: PromptDepth;
  markdown: string;
}

export function compilePromptPack(
  userIdea: string,
  intent: IntentResult,
  architecture: ArchitectureResult,
  prompt: string,
  depth: PromptDepth = 'standard',
): CompiledPack {
  const singlePhase: CompiledPhase = {
    id: 'full-prompt',
    name: '完整开发 Prompt',
    description: `${intent.businessGoal} — ${architecture.frontend} + ${architecture.backend}`,
    prompt,
    depth,
    estimatedTime: '—',
    priority: 'required',
  };

  const sections = [
    `# AgentForge Prompt`,
    '',
    `> ${userIdea}`,
    '',
    `> 📋 复制以下 Prompt 到 Cursor / Claude / Trae 中即可执行`,
    '',
    `## 推理链`,
    '',
    `**业务目标**: ${intent.businessGoal}`,
    `**目标用户**: ${intent.userType}`,
    `**产品形态**: ${intent.productShape}`,
    '',
    `## 技术架构`,
    '',
    `**前端**: ${architecture.frontend}`,
    `**后端**: ${architecture.backend}`,
    `**数据库**: ${architecture.db}`,
    `**基础设施**: ${architecture.infra.join(', ')}`,
    '',
    `**决策推理**: ${architecture.reasoning}`,
    '',
    architecture.rejectedAlternatives.length > 0 ? `**被拒绝的方案**:\n${architecture.rejectedAlternatives.map(r => `- ${r}`).join('\n')}` : '',
    '',
    '---',
    '',
    '## 生成的 Prompt',
    '',
    prompt,
    '',
    '---',
    '',
    '> 由 AgentForge 深度推理链路生成',
    '> 三阶段推理：意图识别 → 架构决策 → Prompt 编译',
  ].filter(Boolean);

  const markdown = sections.join('\n');

  return {
    title: `${intent.businessGoal.slice(0, 30)} — Prompt`,
    summary: `基于深度推理生成，${architecture.frontend} + ${architecture.backend} + ${architecture.db}`,
    intent,
    architecture,
    phases: [singlePhase],
    depth,
    markdown,
  };
}

export function downloadMarkdown(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}