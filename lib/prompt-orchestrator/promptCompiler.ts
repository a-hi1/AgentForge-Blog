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

  if (reasoning.businessModel) {
    lines.push('');
    lines.push('**商业模式**:');
    lines.push(reasoning.businessModel);
  }

  if (reasoning.coreUsers && reasoning.coreUsers.length > 0) {
    lines.push('');
    lines.push('**核心用户**:');
    reasoning.coreUsers.forEach(u => lines.push(`- ${u}`));
  }

  if (reasoning.technicalBoundaries && reasoning.technicalBoundaries.length > 0) {
    lines.push('');
    lines.push('**技术边界**:');
    reasoning.technicalBoundaries.forEach(b => lines.push(`- 🔒 ${b}`));
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

const EMPTY_PATTERNS = [
  /根据实际需求/g,
  /适当选择/g,
  /合理设计/g,
  /必要时/g,
  /可以考虑/g,
  /酌情/g,
  /视情况而定/g,
  /灵活处理/g,
];

const GENERIC_PATTERNS = [
  /使用合适的技术栈/g,
  /实现基本功能/g,
  /确保用户体验/g,
  /做好错误处理/g,
  /添加必要的/g,
];

export interface SpecificityReport {
  score: number;
  emptyPhrases: string[];
  genericPhrases: string[];
  missingDetails: string[];
  suggestions: string[];
}

export function validateSpecificity(prompt: string, reasoning?: { constraints?: string[]; risks?: string[] }): SpecificityReport {
  const emptyPhrases: string[] = [];
  const genericPhrases: string[] = [];
  const missingDetails: string[] = [];
  const suggestions: string[] = [];

  for (const pattern of EMPTY_PATTERNS) {
    const matches = prompt.match(pattern);
    if (matches) emptyPhrases.push(...matches);
  }

  for (const pattern of GENERIC_PATTERNS) {
    const matches = prompt.match(pattern);
    if (matches) genericPhrases.push(...matches);
  }

  if (!prompt.includes('技术栈') && !prompt.includes('TypeScript') && !prompt.includes('React')) {
    missingDetails.push('未指定具体技术栈');
  }
  if (!prompt.includes('验收') && !prompt.includes('标准') && !prompt.includes('完成条件')) {
    missingDetails.push('缺少明确验收标准');
  }
  if (!prompt.includes('禁止') && !prompt.includes('不要') && !prompt.includes('约束')) {
    missingDetails.push('缺少明确约束条件');
  }

  if (emptyPhrases.length > 0) suggestions.push('替换模糊表述为具体技术指令');
  if (genericPhrases.length > 0) suggestions.push('增加项目特定的技术细节');
  if (missingDetails.length > 0) suggestions.push('补充缺失的关键信息');

  const score = Math.max(0, 100 - emptyPhrases.length * 12 - genericPhrases.length * 10 - missingDetails.length * 8);

  return { score, emptyPhrases, genericPhrases, missingDetails, suggestions };
}

export function injectConstraints(prompt: string, reasoning?: { constraints?: string[]; risks?: string[]; technicalBoundaries?: string[] }): string {
  if (!reasoning) return prompt;

  const sections: string[] = [prompt];

  if (reasoning.constraints && reasoning.constraints.length > 0) {
    sections.push('\n## 技术约束\n' + reasoning.constraints.map(c => `- ${c}`).join('\n'));
  }

  if (reasoning.risks && reasoning.risks.length > 0) {
    sections.push('\n## 风险提示\n' + reasoning.risks.map(r => `- ⚠️ ${r}`).join('\n'));
  }

  if (reasoning.technicalBoundaries && reasoning.technicalBoundaries.length > 0) {
    sections.push('\n## 技术边界\n' + reasoning.technicalBoundaries.map(b => `- 🔒 ${b}`).join('\n'));
  }

  return sections.join('\n');
}
