import { CompiledPack } from '@/lib/prompt-orchestrator/promptCompiler';

export interface QualityScore {
  overall: number;
  dimensions: {
    sectionCompleteness: number;
    taskSpecificity: number;
    fileGranularity: number;
    antiGeneric: number;
    executableScore: number;
    dependencyClarity: number;
    architectureConsistency: number;
  };
  penalties: string[];
  feedback: string[];
}

function countPattern(text: string, pattern: RegExp): number {
  return (text.match(pattern) || []).length;
}

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(v)));
}

const GENERIC_EXPRESSIONS = [
  '适合 MVP', '适合mvp',
  '开发效率高',
  '可扩展',
  '简单易用',
  '性能优异',
  '稳定可靠',
  '社区活跃',
  '文档丰富',
  '生态完善',
  '我建议',
  '可能',
  '通常',
  '一般来说',
  '这样更好',
  '推荐使用',
  '建议采用',
  '比较合适',
];

const REQUIRED_SECTIONS = [
  '项目背景', '技术方案', '文件任务', '推进节奏',
  '开发提醒', '交付格式', '验收确认', '边界约束',
];

function scoreSectionCompleteness(prompt: string): number {
  let score = 0;
  const sectionMatches = prompt.match(/##\s+.+/g) || [];
  score += Math.min(sectionMatches.length * 12, 60);

  // Each matched required section adds points
  for (const section of REQUIRED_SECTIONS) {
    if (prompt.includes(section)) score += 5;
  }

  return clamp(score);
}

function scoreTaskSpecificity(prompt: string, pack: CompiledPack): number {
  let score = 0;

  const tasks = pack.decompose?.tasks || [];
  if (tasks.length >= 5) score += 20;
  if (tasks.length >= 8) score += 10;
  if (tasks.length < 3) score -= 25;

  // Check for concrete implementation requirements (function signatures)
  for (const task of tasks) {
    for (const req of (task.implementationRequirements || [])) {
      if (/function|=>|export|interface|type/.test(req)) score += 2;
    }
  }
  score = Math.min(score, 40);

  // Check for forbidden items per task
  const tasksWithForbidden = tasks.filter(t => t.forbiddenItems && t.forbiddenItems.length > 0).length;
  score += Math.min(tasksWithForbidden * 3, 15);

  // Check for dependency tracking
  const tasksWithDeps = tasks.filter(t => t.dependencies && t.dependencies.length > 0).length;
  score += Math.min(tasksWithDeps * 2, 10);

  return clamp(score);
}

function scoreFileGranularity(prompt: string, pack: CompiledPack): number {
  let score = 0;

  const filePathPattern = /[\w-]+\/[\w-]+\.(ts|tsx|js|jsx|vue|py|go)/g;
  const filePaths = prompt.match(filePathPattern) || [];
  score += Math.min(filePaths.length * 6, 40);

  const fileTaskCards = countPattern(prompt, /###\s+[\w-/]+\.\w+/g);
  score += Math.min(fileTaskCards * 8, 40);

  const tasks = pack.decompose?.tasks || [];
  if (tasks.length > 0) {
    const hasFilePerTask = tasks.every(t => t.file && t.file.includes('.'));
    if (hasFilePerTask) score += 20;
  }

  return clamp(score);
}

function scoreAntiGeneric(prompt: string): number {
  let score = 100;
  let genericCount = 0;

  for (const expr of GENERIC_EXPRESSIONS) {
    const matches = prompt.match(new RegExp(expr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'));
    if (matches) genericCount += matches.length;
  }

  score -= genericCount * 5;

  // Extra penalty for "适合 MVP" or "开发效率高" without concrete reasoning
  const mvpMatch = prompt.match(/适合\s*MVP/gi);
  if (mvpMatch) score -= mvpMatch.length * 10;

  const efficiencyMatch = prompt.match(/开发效率高/gi);
  if (efficiencyMatch) score -= efficiencyMatch.length * 10;

  const extendableMatch = prompt.match(/可扩展(?!性)/gi);
  if (extendableMatch) score -= extendableMatch.length * 8;

  return clamp(score);
}

function scoreExecutableScore(prompt: string, pack: CompiledPack): number {
  let score = 0;

  // Has phase-based execution order
  const phases = pack.decompose?.phases || [];
  if (phases.length >= 2) score += 25;
  if (phases.length >= 4) score += 10;

  // Has pause/checkpoint markers
  if (/DONE_PHASE|暂停确认|checkpoint|等我确认/gi.test(prompt)) score += 15;

  // Has acceptance checklist with checkboxes
  const checkboxCount = countPattern(prompt, /\[[ x]\]/g);
  score += Math.min(checkboxCount * 5, 20);

  // Has concrete output format
  if (/Modified Files|修改的文件|Code|代码|Verification|验证方式/gi.test(prompt)) score += 15;

  // Has error handling instructions
  if (/错误|error|问题|Exception/gi.test(prompt)) score += 15;

  return clamp(score);
}

function scoreDependencyClarity(prompt: string, pack: CompiledPack): number {
  let score = 0;

  const tasks = pack.decompose?.tasks || [];
  const tasksWithDeps = tasks.filter(t => t.dependencies && t.dependencies.length > 0).length;

  if (tasks.length > 0) {
    const depRatio = tasksWithDeps / tasks.length;
    score += Math.round(depRatio * 50);
  }

  // Check if dependencies are explicitly listed in prompt
  const depMentions = countPattern(prompt, /前置依赖|依赖|depends on|requires/gi);
  score += Math.min(depMentions * 8, 30);

  // Phase ordering clarity
  const phaseMentions = countPattern(prompt, /Phase\s*\d|第\s*\d\s*阶段/gi);
  score += Math.min(phaseMentions * 5, 20);

  return clamp(score);
}

function scoreArchitectureConsistency(prompt: string, pack: CompiledPack): number {
  let score = 50; // baseline

  const arch = pack.architecture;
  if (arch) {
    // Check if frontend is mentioned in tasks
    if (arch.frontend) {
      const feKey = arch.frontend.split('—')[0].split('（')[0].trim().toLowerCase();
      if (prompt.toLowerCase().includes(feKey)) score += 15;
    }

    // Check if backend is mentioned
    if (arch.backend) {
      const beKey = arch.backend.split('—')[0].split('（')[0].trim().toLowerCase();
      if (prompt.toLowerCase().includes(beKey)) score += 10;
    }

    // Rejected alternatives mentioned
    if (arch.rejectedAlternatives && arch.rejectedAlternatives.length > 0) {
      score += Math.min(arch.rejectedAlternatives.length * 5, 15);
    }
  }

  // Consistency: no contradictory tech mentions
  if ((prompt.includes('React') || prompt.includes('Next')) && prompt.includes('Vue') && !prompt.includes('对比')) {
    score -= 20;
  }

  return clamp(score);
}

export function evaluatePromptQuality(prompt: string, pack: CompiledPack): QualityScore {
  const penalties: string[] = [];

  // Critical data-leak checks (hard penalties)
  if (prompt.includes('[object Object]')) {
    penalties.push('检测到 [object Object]：数据未正确字符串化');
  }
  if (prompt.includes('undefined')) {
    penalties.push('检测到 undefined：字段值未正确填充');
  }
  if (prompt.includes('null') && prompt.includes('"null"') === false && !prompt.includes('nullable')) {
    penalties.push('检测到 null 值暴露：字段可能缺失');
  }

  // Generic expressions count
  let genericTotal = 0;
  for (const expr of GENERIC_EXPRESSIONS) {
    genericTotal += countPattern(prompt, new RegExp(expr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'));
  }
  if (genericTotal > 8) {
    penalties.push(`泛化表达过多（${genericTotal}处）："${GENERIC_EXPRESSIONS.slice(0, 3).join('""')}"等`);
  }

  const tasks = pack.decompose?.tasks || [];
  const phases = pack.decompose?.phases || [];

  if (tasks.length < 3) {
    penalties.push(`文件任务仅 ${tasks.length} 个，至少需要 3 个`);
  }
  if (phases.length < 2) {
    penalties.push(`开发阶段仅 ${phases.length} 个，至少需要 2 个`);
  }
  if (!/\[[ x]\]/.test(prompt)) {
    penalties.push('缺少 checkbox 式验收标准');
  }
  if ((prompt.match(/禁止|不要做|避免/gi) || []).length < 2) {
    penalties.push('禁止事项少于 2 条');
  }
  if (!/风险|risk|注意|提醒/gi.test(prompt)) {
    penalties.push('缺少风险提醒');
  }
  if (prompt.length < 1000) {
    penalties.push(`Prompt 过短（${prompt.length}字符），内容不足`);
  }

  const dimensions = {
    sectionCompleteness: scoreSectionCompleteness(prompt),
    taskSpecificity: scoreTaskSpecificity(prompt, pack),
    fileGranularity: scoreFileGranularity(prompt, pack),
    antiGeneric: scoreAntiGeneric(prompt),
    executableScore: scoreExecutableScore(prompt, pack),
    dependencyClarity: scoreDependencyClarity(prompt, pack),
    architectureConsistency: scoreArchitectureConsistency(prompt, pack),
  };

  let overall = clamp(
    dimensions.sectionCompleteness * 0.15 +
    dimensions.taskSpecificity * 0.20 +
    dimensions.fileGranularity * 0.15 +
    dimensions.antiGeneric * 0.15 +
    dimensions.executableScore * 0.15 +
    dimensions.dependencyClarity * 0.10 +
    dimensions.architectureConsistency * 0.10
  );

  // Apply penalties
  overall = Math.max(0, overall - penalties.length * 5);

  const feedback: string[] = [];
  if (dimensions.sectionCompleteness < 60) feedback.push('Section 完整性不足，建议补充缺失章节');
  if (dimensions.taskSpecificity < 60) feedback.push('任务不够具体，缺少函数签名和实现要求');
  if (dimensions.fileGranularity < 60) feedback.push('文件级粒度不够，缺少具体文件路径');
  if (dimensions.antiGeneric < 60) feedback.push('存在较多泛化表达，减少"适合MVP""开发效率高"等');  if (dimensions.executableScore < 60) feedback.push('可执行性不足，缺少阶段划分和暂停确认点');
  if (dimensions.dependencyClarity < 60) feedback.push('依赖关系不够清晰，Agent可能按错误顺序执行');
  if (dimensions.architectureConsistency < 60) feedback.push('技术选型与任务描述不一致');

  return { overall, dimensions, penalties, feedback };
}

export function isVerified(score: QualityScore): boolean {
  return score.overall >= 80 && score.penalties.length === 0;
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
  if (/角色|合作/.test(prompt)) structure += 10;
  if (/禁止|不要做/.test(prompt)) structure += 15;
  structure = clamp(structure);

  let professionalism = 0;
  if (/##/.test(prompt)) professionalism += 15;
  if (len > 1000) professionalism += 15;
  if (/(Phase|阶段)/i.test(prompt)) professionalism += 15;
  if (/```/.test(prompt)) professionalism += 10;
  if (/风险|tradeoff|取舍/i.test(prompt)) professionalism += 15;
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
