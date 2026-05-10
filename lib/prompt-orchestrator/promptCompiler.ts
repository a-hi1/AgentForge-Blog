import type { ProjectReasoning } from './reasoner';
import type { CompiledPhase, PromptDepth } from './templates';

export interface CompiledPack {
  title: string;
  summary: string;
  reasoning: ProjectReasoning;
  phases: CompiledPhase[];
  depth: PromptDepth;
  markdown: string;
}

function analysisSection(reasoning: ProjectReasoning, depth: PromptDepth): string {
  const complexityMap: Record<string, string> = { low: '低', medium: '中', high: '高' };
  const depthMap: Record<string, string> = { quick: '快速', standard: '标准', expert: '专家', architect: '架构师' };
  const lines = [
    `## 项目分析`,
    '',
    `**项目类型**: ${reasoning.primaryTypeLabel}${reasoning.secondaryTypes.length > 0 ? `（复合型：${reasoning.secondaryTypes.join(' + ')}）` : ''}`,
    `**技术复杂度**: ${complexityMap[reasoning.complexity] || reasoning.complexity}`,
    `**分析确信度**: ${reasoning.confidence}%`,
    `**输出深度**: ${depthMap[depth]}`,
    `**推荐技术栈**:`,
    ...reasoning.recommendedStack.map(s => `- ${s}`),
    `**开发阶段数**: ${reasoning.estimatedPhases}`,
  ];

  if (reasoning.domainFeatures.length > 0) {
    lines.push('');
    lines.push('**领域特征**:');
    reasoning.domainFeatures.slice(0, 6).forEach(f => lines.push(`- ${f}`));
  }

  if (reasoning.hiddenRequirements.length > 0) {
    lines.push('');
    lines.push('**隐含需求**:');
    reasoning.hiddenRequirements.forEach(r => lines.push(`- ${r}`));
  }

  if (reasoning.risks.length > 0) {
    lines.push('');
    lines.push('**风险提示**:');
    reasoning.risks.forEach(r => lines.push(`- ⚠️ ${r}`));
  }

  if (reasoning.rawAnalysis) {
    lines.push('');
    lines.push(`> ${reasoning.rawAnalysis}`);
  }

  return lines.join('\n');
}

function phaseSummarySection(phases: CompiledPhase[]): string {
  return `## 开发阶段总览

| 阶段 | 名称 | 类别 | 说明 |
|------|------|------|------|
${phases.map((p, i) => `| ${i + 1} | ${p.name} | ${p.category} | ${p.description} |`).join('\n')}
`;
}

function phasePromptSection(phase: CompiledPhase, index: number): string {
  return `## Phase ${index + 1}: ${phase.name}

> ${phase.description}

---

\`\`\`
${phase.prompt}
\`\`\`
`;
}

export function compilePromptPack(
  userIdea: string,
  reasoning: ProjectReasoning,
  phases: CompiledPhase[],
  depth: PromptDepth = 'standard',
): CompiledPack {
  const sections = [
    `# AgentForge Prompt Pack`,
    '',
    `> ${userIdea}`,
    '',
    analysisSection(reasoning, depth),
    '',
    phaseSummarySection(phases),
    '',
    ...phases.map((phase, i) => phasePromptSection(phase, i)),
    '',
    '---',
    '',
    '> 由 AgentForge Prompt Strategy Generator v2 智能生成',
    '> 每个阶段的 Prompt 经过动态推理、深度适配和质量评分',
    '> 复制到 Claude / Trae / Cursor 中即可执行',
  ];

  const markdown = sections.join('\n');

  return {
    title: `${reasoning.primaryTypeLabel} — Prompt Pack`,
    summary: `共 ${phases.length} 个阶段，${depth} 深度，覆盖从需求分析到项目复盘的完整开发流程`,
    reasoning,
    phases,
    depth,
    markdown,
  };
}

export function compileSinglePhaseMarkdown(
  phase: CompiledPhase,
  index: number,
  reasoning: ProjectReasoning
): string {
  return [
    `# Phase ${index + 1}: ${phase.name}`,
    '',
    `> ${phase.description}`,
    '',
    `**项目类型**: ${reasoning.primaryTypeLabel}`,
    `**技术复杂度**: ${reasoning.complexity}`,
    '',
    '---',
    '',
    phase.prompt,
  ].join('\n');
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
