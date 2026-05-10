import { AnalysisResult } from './analyzer';
import { Phase } from './phasePlanner';

export interface CompiledPack {
  title: string;
  summary: string;
  analysis: AnalysisResult;
  phases: Phase[];
  markdown: string;
}

function analysisSection(analysis: AnalysisResult): string {
  return `## 项目分析

**产品类型**: ${analysis.productTypeLabel}
**复杂度**: ${analysis.complexity === 'high' ? '高' : analysis.complexity === 'low' ? '低' : '中'}
**建议技术栈**:
${analysis.recommendedStack.map(s => `- ${s}`).join('\n')}
**开发阶段数**: ${analysis.estimatedPhases}
${analysis.keywords.length > 0 ? `**识别关键词**: ${analysis.keywords.join(', ')}` : ''}
`;
}

function phaseSummarySection(phases: Phase[]): string {
  return `## 开发阶段总览

| 阶段 | 名称 | 类别 | 说明 |
|------|------|------|------|
${phases.map((p, i) => `| ${i + 1} | ${p.name} | ${p.category} | ${p.description} |`).join('\n')}
`;
}

function phasePromptSection(phase: Phase, index: number): string {
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
  analysis: AnalysisResult,
  phases: Phase[],
): CompiledPack {
  const sections = [
    `# AgentForge Prompt Pack`,
    '',
    `> ${userIdea}`,
    '',
    analysisSection(analysis),
    '',
    phaseSummarySection(phases),
    '',
    ...phases.map((phase, i) => phasePromptSection(phase, i)),
    '',
    '---',
    '',
    '> 由 AgentForge Prompt Strategy Generator 自动生成',
    '> 复制每个阶段的 Prompt 到 Claude / Trae / Cursor 中即可执行',
  ];

  const markdown = sections.join('\n');

  return {
    title: `${analysis.productTypeLabel} — Prompt Pack`,
    summary: `共 ${phases.length} 个阶段，覆盖从需求分析到项目复盘的完整开发流程`,
    analysis,
    phases,
    markdown,
  };
}

export function compileSinglePhaseMarkdown(phase: Phase, index: number, analysis: AnalysisResult): string {
  return [
    `# Phase ${index + 1}: ${phase.name}`,
    '',
    `> ${phase.description}`,
    '',
    `**产品类型**: ${analysis.productTypeLabel}`,
    `**复杂度**: ${analysis.complexity}`,
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
