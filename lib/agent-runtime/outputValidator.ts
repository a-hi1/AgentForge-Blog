import { CHINESE_OUTPUT_INSTRUCTION_RETRY } from './constants';

export interface ValidationResult {
  isValid: boolean;
  score: number;
  issues: string[];
  chineseRatio: number;
}

export function validateOutput(output: string): ValidationResult {
  const issues: string[] = [];
  let score = 100;

  const chineseRatio = calculateChineseRatio(output);
  if (chineseRatio < 0.5) {
    issues.push(`中文占比过低: ${(chineseRatio * 100).toFixed(0)}%，要求至少 50%`);
    score -= 30;
  }

  const codeBlockIssues = validateCodeBlocks(output);
  if (codeBlockIssues.length > 0) {
    issues.push(...codeBlockIssues);
    score -= codeBlockIssues.length * 10;
  }

  const structureScore = validateStructure(output);
  score -= (100 - structureScore) * 0.3;
  if (structureScore < 50) {
    issues.push('输出结构不完整，缺少必要的章节标题');
  }

  return {
    isValid: issues.length === 0 && score >= 60,
    score: Math.max(0, Math.round(score)),
    issues,
    chineseRatio,
  };
}

function calculateChineseRatio(text: string): number {
  const cleanText = text.replace(/```[\s\S]*?```/g, '').replace(/`[^`]+`/g, '');
  const totalChars = cleanText.replace(/\s/g, '').length;
  if (totalChars === 0) return 1;

  const chineseChars = (cleanText.match(/[\u4e00-\u9fff]/g) || []).length;
  return chineseChars / totalChars;
}

function validateCodeBlocks(text: string): string[] {
  const issues: string[] = [];
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
  let match;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    const code = match[2].trim();
    if (code.length < 10) {
      issues.push('代码块内容过短，可能是残缺代码');
    }

    const importCount = (code.match(/^import\s/gm) || []).length;
    const exportCount = (code.match(/^export\s/gm) || []).length;
    if (importCount > 0 && exportCount === 0 && !code.includes('function') && !code.includes('const ') && !code.includes('class ')) {
      issues.push('代码块只有 import 语句，缺少实际实现');
    }

    const openBraces = (code.match(/{/g) || []).length;
    const closeBraces = (code.match(/}/g) || []).length;
    if (Math.abs(openBraces - closeBraces) > 1) {
      issues.push('代码块括号不匹配');
    }
  }

  const unclosedFence = (text.match(/```/g) || []).length % 2;
  if (unclosedFence !== 0) {
    issues.push('代码围栏未正确闭合');
  }

  return issues;
}

function validateStructure(text: string): number {
  let score = 0;
  const hasMainHeading = /^#\s/m.test(text);
  if (hasMainHeading) score += 40;

  const headingCount = (text.match(/^#{1,3}\s/gm) || []).length;
  if (headingCount >= 3) score += 30;
  else if (headingCount >= 1) score += 15;

  const hasList = /^[-*]\s/m.test(text);
  if (hasList) score += 15;

  const hasCodeBlock = /```/.test(text);
  if (hasCodeBlock) score += 15;

  return Math.min(score, 100);
}

export function buildRetryInstruction(issues: string[]): string {
  return `\n\n【输出质量修正要求】
上一次输出存在以下问题：
${issues.map(i => `- ${i}`).join('\n')}

${CHINESE_OUTPUT_INSTRUCTION_RETRY}`;
}
