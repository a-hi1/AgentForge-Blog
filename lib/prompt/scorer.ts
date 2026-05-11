import { CompiledPack } from '@/lib/prompt-orchestrator/promptCompiler';

export interface QualityScore {
  overall: number;
  dimensions: {
    executionPrecision: number;
    boundaryStrictness: number;
    stepControl: number;
    copyToAgent: number;
    repairability: number;
  };
  feedback: string[];
}

function countPattern(text: string, pattern: RegExp): number {
  return (text.match(pattern) || []).length;
}

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(v)));
}

function scoreExecutionPrecision(prompt: string, pack: CompiledPack): number {
  let score = 0;

  const fileTreeMatch = prompt.match(/##\s*(?:Section\s*4|TARGET FILE TREE|文件结构|File Tree)/i);
  if (fileTreeMatch) score += 20;

  const fileCount = countPattern(prompt, /[\w-]+\.(ts|tsx|js|jsx|vue|py|go|css|scss)/g);
  score += Math.min(fileCount * 3, 30);

  const hasFileTasks = /##\s*(?:Section\s*5|FILE TASKS|文件任务)/i.test(prompt);
  if (hasFileTasks) score += 15;

  const taskCards = countPattern(prompt, /(?:文件|file)\s*[:：]/gi);
  score += Math.min(taskCards * 3, 20);

  if (pack.decompose && pack.decompose.tasks.length > 0) {
    score += Math.min(pack.decompose.tasks.length * 2, 15);
  }

  return clamp(score);
}

function scoreBoundaryStrictness(prompt: string): number {
  let score = 0;

  const forbiddenSection = /##\s*(?:Section\s*9|BOUNDARY|禁止|Boundary)/i.test(prompt);
  if (forbiddenSection) score += 25;

  const forbiddenCount = countPattern(prompt, /禁止|不得|不允许|must not|forbidden/gi);
  score += Math.min(forbiddenCount * 4, 30);

  const hasRole = /##\s*(?:Section\s*1|ROLE|角色)/i.test(prompt);
  if (hasRole) score += 15;

  const hasContract = /##\s*(?:Section\s*7|OUTPUT CONTRACT|输出协议)/i.test(prompt);
  if (hasContract) score += 15;

  const explicitTech = countPattern(prompt, /(?:选型|技术栈|tech stack|framework)/gi);
  score += Math.min(explicitTech * 3, 15);

  return clamp(score);
}

function scoreStepControl(prompt: string, pack: CompiledPack): number {
  let score = 0;

  const hasExecOrder = /##\s*(?:Section\s*6|EXECUTION ORDER|执行顺序|Execution Order)/i.test(prompt);
  if (hasExecOrder) score += 25;

  const phaseCount = countPattern(prompt, /Phase\s*\d|阶段\s*\d|步骤\s*\d/gi);
  score += Math.min(phaseCount * 8, 40);

  const hasPause = /DONE_PHASE|等待确认|pause|checkpoint/gi.test(prompt);
  if (hasPause) score += 20;

  if (pack.decompose && pack.decompose.phases.length > 0) {
    score += Math.min(pack.decompose.phases.length * 5, 15);
  }

  return clamp(score);
}

function scoreCopyToAgent(prompt: string): number {
  let score = 0;

  if (prompt.length > 2000) score += 15;
  if (prompt.length > 4000) score += 10;

  const hasValidation = /##\s*(?:Section\s*8|VALIDATION|验证|Checklist)/i.test(prompt);
  if (hasValidation) score += 20;

  const hasErrorTemplate = /##\s*(?:Section\s*10|ERROR|错误反馈)/i.test(prompt);
  if (hasErrorTemplate) score += 15;

  const checkboxCount = countPattern(prompt, /\[[ x]\]/g);
  score += Math.min(checkboxCount * 4, 20);

  const hasOutputContract = /Modified Files|Code|Verification|Risks/gi.test(prompt);
  if (hasOutputContract) score += 20;

  return clamp(score);
}

function scoreRepairability(prompt: string, pack: CompiledPack): number {
  let score = 0;

  const hasErrorTemplate = /##\s*(?:Section\s*10|ERROR|错误反馈)/i.test(prompt);
  if (hasErrorTemplate) score += 30;

  const hasBoundary = /##\s*(?:Section\s*9|BOUNDARY|禁止)/i.test(prompt);
  if (hasBoundary) score += 25;

  const hasPhases = /Phase|阶段|步骤/gi.test(prompt);
  if (hasPhases) score += 20;

  if (pack.decompose && pack.decompose.tasks.length > 0) {
    const hasDeps = pack.decompose.tasks.some(t => t.dependencies && t.dependencies.length > 0);
    if (hasDeps) score += 15;
  }

  const hasVerification = /验证|verify|test|check/gi.test(prompt);
  if (hasVerification) score += 10;

  return clamp(score);
}

export function evaluatePromptQuality(prompt: string, pack: CompiledPack): QualityScore {
  const executionPrecision = scoreExecutionPrecision(prompt, pack);
  const boundaryStrictness = scoreBoundaryStrictness(prompt);
  const stepControl = scoreStepControl(prompt, pack);
  const copyToAgent = scoreCopyToAgent(prompt);
  const repairability = scoreRepairability(prompt, pack);

  const overall = clamp(
    executionPrecision * 0.30 +
    boundaryStrictness * 0.20 +
    stepControl * 0.20 +
    copyToAgent * 0.20 +
    repairability * 0.10
  );

  const feedback: string[] = [];

  if (executionPrecision < 60) feedback.push('文件级任务粒度不够精确，缺少具体文件路径或函数签名');
  if (boundaryStrictness < 60) feedback.push('约束不够严格，缺少禁止项或角色定义');
  if (stepControl < 60) feedback.push('缺少分阶段执行和暂停确认点');
  if (copyToAgent < 60) feedback.push('可复制性不足，缺少输出格式或验证清单');
  if (repairability < 60) feedback.push('可修复性不足，缺少错误反馈模板或边界约束');

  if (prompt.length < 1000) feedback.push('总长度过短，可能遗漏关键细节');
  if (prompt.length > 8000) feedback.push('总长度过长，可能包含冗余信息');

  const sectionCount = countPattern(prompt, /##\s*(?:Section|第)/g);
  if (sectionCount < 5) feedback.push(`仅包含 ${sectionCount} 个章节，建议补充到 10 个`);

  return { overall, dimensions: { executionPrecision, boundaryStrictness, stepControl, copyToAgent, repairability }, feedback };
}

export function isVerified(score: QualityScore): boolean {
  return score.overall >= 80;
}

export interface PromptScore {
  overall: number;
  dimensions: {
    structure: number;
    professionalism: number;
    executability: number;
    executionSuccess: number;
  };
}

interface PromptScoreInput {
  prompt: string;
  projectType?: string;
  executionSuccess?: boolean;
  userFeedback?: string;
}

export function calculatePromptScore(input: PromptScoreInput): PromptScore {
  const { prompt, executionSuccess, userFeedback } = input;
  const len = prompt.length;

  let structure = 0;
  if (len > 500) structure += 20;
  if (len > 1500) structure += 15;
  const sections = countPattern(prompt, /##/g);
  structure += Math.min(sections * 8, 40);
  if (/ROLE|角色/i.test(prompt)) structure += 10;
  if (/BOUNDARY|禁止/i.test(prompt)) structure += 15;
  structure = clamp(structure);

  let professionalism = 0;
  if (/##/.test(prompt)) professionalism += 15;
  if (len > 1000) professionalism += 15;
  if (/Section|第.{1,3}章/.test(prompt)) professionalism += 15;
  if (/```/.test(prompt)) professionalism += 10;
  if (/(Phase|阶段)/i.test(prompt)) professionalism += 15;
  if (len > 3000) professionalism += 10;
  professionalism = clamp(professionalism);

  let executability = 0;
  const fileCount = countPattern(prompt, /[\w-]+\.(ts|tsx|js|jsx|vue|py|go)/g);
  executability += Math.min(fileCount * 5, 30);
  if (/禁止|不得|forbidden/i.test(prompt)) executability += 15;
  if (/(验证|verify|check|\[[ x]\])/i.test(prompt)) executability += 15;
  if (/(Phase|步骤|阶段)/i.test(prompt)) executability += 15;
  if (/DONE_PHASE|等待确认/i.test(prompt)) executability += 15;
  if (/Modified Files|Code|Verification/i.test(prompt)) executability += 10;
  executability = clamp(executability);

  let execSuccess = 50;
  if (executionSuccess === true) execSuccess = 95;
  else if (executionSuccess === false) execSuccess = 20;
  if (userFeedback === 'excellent') execSuccess = Math.max(execSuccess, 90);
  else if (userFeedback === 'failed') execSuccess = Math.min(execSuccess, 30);

  const overall = clamp(
    structure * 0.25 +
    professionalism * 0.2 +
    executability * 0.3 +
    execSuccess * 0.25
  );

  return {
    overall,
    dimensions: { structure, professionalism, executability, executionSuccess: execSuccess },
  };
}
