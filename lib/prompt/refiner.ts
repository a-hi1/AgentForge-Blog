'use client';

export interface RefinementInput {
  originalPrompt: string;
  executionOutput?: string;
  issues?: string[];
  score?: number;
}

export interface RefinementResult {
  originalIssues: string[];
  strategy: string;
  improvedPrompt: string;
  improvements: string[];
}

export function refinePrompt(input: RefinementInput): RefinementResult {
  const issues = identifyIssues(input);
  const strategy = generateStrategy(issues, input);
  const improvedPrompt = generateImprovedPrompt(input.originalPrompt, strategy);
  const improvements = listImprovements(issues);

  return {
    originalIssues: issues,
    strategy,
    improvedPrompt,
    improvements
  };
}

function identifyIssues(input: RefinementInput): string[] {
  const issues: string[] = [];
  const prompt = input.originalPrompt;

  if (input.score && input.score < 70) {
    issues.push('原始 Prompt 评分较低');
  }

  if (!prompt.includes('#') && !prompt.includes('##')) {
    issues.push('缺少清晰的结构和标题');
  }

  if (!/角色|role|你是|你现在是/i.test(prompt)) {
    issues.push('缺少明确的角色定义');
  }

  if (!/步骤|step|阶段|phase|1\.|2\./i.test(prompt)) {
    issues.push('缺少结构化的执行步骤');
  }

  if (!/输出|返回|结果|格式|JSON|markdown/i.test(prompt)) {
    issues.push('缺少明确的输出格式要求');
  }

  if (!/必须|禁止|注意|要求|constraint/i.test(prompt)) {
    issues.push('缺少约束条件和注意事项');
  }

  if (prompt.length < 300) {
    issues.push('Prompt 过于简短，信息不够充分');
  }

  if (/简单|快速|随便/i.test(prompt)) {
    issues.push('使用了模糊的表述，不够精确');
  }

  if (input.executionOutput) {
    if (input.executionOutput.includes('错误') || 
        input.executionOutput.includes('error') || 
        input.executionOutput.includes('fail')) {
      issues.push('执行过程中出现错误');
    }
    if (input.executionOutput.length < 100) {
      issues.push('执行输出结果过于简略');
    }
  }

  if (input.issues && input.issues.length > 0) {
    issues.push(...input.issues);
  }

  if (issues.length === 0) {
    issues.push('无明显问题，可进行细节优化');
  }

  return issues;
}

function generateStrategy(issues: string[], input: RefinementInput): string {
  let strategy = '优化策略：\n\n';

  if (issues.includes('缺少清晰的结构和标题')) {
    strategy += '1. 添加清晰的标题和结构，使用 Markdown 格式\n';
  }
  if (issues.includes('缺少明确的角色定义')) {
    strategy += '2. 明确 AI 的角色和职责范围\n';
  }
  if (issues.includes('缺少结构化的执行步骤')) {
    strategy += '3. 将任务分解为多个可执行的步骤\n';
  }
  if (issues.includes('缺少明确的输出格式要求')) {
    strategy += '4. 详细说明期望的输出格式和结构\n';
  }
  if (issues.includes('缺少约束条件和注意事项')) {
    strategy += '5. 添加必要的约束条件和注意事项\n';
  }
  if (issues.includes('Prompt 过于简短，信息不够充分')) {
    strategy += '6. 扩展 Prompt，提供更多上下文信息\n';
  }
  if (issues.includes('使用了模糊的表述，不够精确')) {
    strategy += '7. 将模糊表述替换为精确的要求\n';
  }
  if (issues.includes('执行过程中出现错误')) {
    strategy += '8. 修复导致错误的指令\n';
  }

  if (strategy === '优化策略：\n\n') {
    strategy += '1. 保持原有结构和内容\n';
    strategy += '2. 优化表述，提高清晰度\n';
    strategy += '3. 增加必要的细节和约束\n';
  }

  return strategy;
}

function generateImprovedPrompt(originalPrompt: string, strategy: string): string {
  let improvedPrompt = '';

  if (!originalPrompt.includes('角色') && !originalPrompt.includes('role')) {
    improvedPrompt += '# 角色\n你是一位专业的 AI 开发助手，精通全栈开发、架构设计和代码优化。\n\n';
  }

  if (!originalPrompt.includes('#') && !originalPrompt.includes('##')) {
    improvedPrompt += '# 任务\n' + originalPrompt + '\n\n';
  } else {
    improvedPrompt = originalPrompt;
  }

  if (!originalPrompt.includes('步骤') && !originalPrompt.includes('step')) {
    improvedPrompt += '# 执行步骤\n1. 理解任务需求\n2. 制定实现方案\n3. 编写高质量代码\n4. 进行必要的测试\n5. 提供完整的输出\n\n';
  }

  if (!originalPrompt.includes('输出') && !originalPrompt.includes('返回') && !originalPrompt.includes('format')) {
    improvedPrompt += '# 输出要求\n请按照以下格式输出：\n- 清晰的代码和说明\n- 必要的注释\n- 完整的可执行代码\n\n';
  }

  if (!originalPrompt.includes('必须') && !originalPrompt.includes('禁止')) {
    improvedPrompt += '# 注意事项\n- 代码质量优先\n- 遵循最佳实践\n- 提供完整的实现\n\n';
  }

  return improvedPrompt;
}

function listImprovements(issues: string[]): string[] {
  const improvements: string[] = [];

  if (issues.includes('缺少清晰的结构和标题')) {
    improvements.push('添加了清晰的标题结构');
  }
  if (issues.includes('缺少明确的角色定义')) {
    improvements.push('明确定义了 AI 角色');
  }
  if (issues.includes('缺少结构化的执行步骤')) {
    improvements.push('增加了分步骤执行指南');
  }
  if (issues.includes('缺少明确的输出格式要求')) {
    improvements.push('明确了输出格式要求');
  }
  if (issues.includes('缺少约束条件和注意事项')) {
    improvements.push('添加了注意事项和约束');
  }
  if (issues.includes('Prompt 过于简短，信息不够充分')) {
    improvements.push('扩展了 Prompt 内容和信息');
  }
  if (issues.includes('使用了模糊的表述，不够精确')) {
    improvements.push('优化了表述，提高了精确度');
  }

  if (improvements.length === 0) {
    improvements.push('优化了表述和细节');
    improvements.push('增强了 Prompt 的清晰度');
  }

  return improvements;
}

export interface RepairInput {
  originalPrompt: string;
  issueDescription: string;
  taskContext?: string;
  previousFixes?: string[];
}

export interface RepairResult {
  repairPrompt: string;
  rootCause: string;
  fixStrategy: string;
  preventionAdvice: string;
}

const FAILURE_PATTERNS: { pattern: RegExp; rootCause: string; strategy: string }[] = [
  { pattern: /cannot find module|module not found|no such file/i, rootCause: '缺少依赖或路径引用错误', strategy: '在 Prompt 中明确列出所有依赖包和正确的 import 路径' },
  { pattern: /type error|type.*not assignable|property.*does not exist/i, rootCause: '类型定义缺失或不匹配', strategy: '为 Prompt 补充完整的类型定义和接口约束' },
  { pattern: /syntax error|unexpected token|parse error/i, rootCause: '代码语法或结构问题', strategy: '在 Prompt 中添加更严格的代码格式约束和示例' },
  { pattern: /undefined is not|null is not|cannot read prop/i, rootCause: '空值未处理或数据结构假设错误', strategy: '要求 Agent 添加空值检查和防御性编程' },
  { pattern: /cors|access-control|blocked by policy/i, rootCause: '跨域或权限配置缺失', strategy: '在 Prompt 中明确 CORS 配置和权限需求' },
  { pattern: /timeout|ETIMEDOUT|request timeout/i, rootCause: '异步操作未正确处理或超时', strategy: '添加超时处理和错误重试机制的指令' },
  { pattern: /ECONNREFUSED|fetch failed|network error/i, rootCause: '服务连接失败或端点配置错误', strategy: '确认服务地址并在 Prompt 中指定连接重试逻辑' },
  { pattern: /permission denied|EACCES|403/i, rootCause: '权限不足或认证配置缺失', strategy: '明确权限需求和认证流程' },
  { pattern: /out of memory|heap.*limit|allocation failed/i, rootCause: '内存泄漏或数据量超出限制', strategy: '添加内存优化指令和分批处理要求' },
  { pattern: /hydration|server.*client.*mismatch/i, rootCause: 'SSR/客户端渲染不一致', strategy: '在 Prompt 中明确 SSR 兼容性要求' },
];

function extractFailurePattern(issueDescription: string): { rootCause: string; strategy: string } {
  for (const fp of FAILURE_PATTERNS) {
    if (fp.pattern.test(issueDescription)) {
      return { rootCause: fp.rootCause, strategy: fp.strategy };
    }
  }
  const lc = issueDescription.toLowerCase();
  if (lc.includes('样式') || lc.includes('css') || lc.includes('布局')) {
    return { rootCause: '样式或布局实现不符合预期', strategy: '在 Prompt 中添加更精确的 UI 描述和响应式要求' };
  }
  if (lc.includes('性能') || lc.includes('慢') || lc.includes('卡')) {
    return { rootCause: '性能未达预期', strategy: '添加性能优化指令，明确量化指标' };
  }
  if (lc.includes('逻辑') || lc.includes('业务') || lc.includes('流程')) {
    return { rootCause: '业务逻辑理解偏差', strategy: '补充完整的业务流程描述和边界条件' };
  }
  return { rootCause: '需要更多上下文才能精确判断', strategy: '在 Prompt 中补充问题描述和期望行为' };
}

export function generateRepairPrompt(input: RepairInput): RepairResult {
  const { originalPrompt, issueDescription, taskContext, previousFixes } = input;

  const { rootCause, strategy } = extractFailurePattern(issueDescription);

  const repairParts: string[] = [];

  repairParts.push(`## 问题修复指令`);
  repairParts.push('');
  repairParts.push(`### 当前遇到的问题`);
  repairParts.push(issueDescription.trim());
  repairParts.push('');

  if (taskContext) {
    repairParts.push(`### 任务背景`);
    repairParts.push(taskContext.trim());
    repairParts.push('');
  }

  if (previousFixes && previousFixes.length > 0) {
    repairParts.push(`### 已尝试的修复方案（不要重复）`);
    previousFixes.forEach((fix, i) => {
      repairParts.push(`${i + 1}. ${fix}`);
    });
    repairParts.push('');
  }

  repairParts.push(`### 修复要求`);
  repairParts.push(`1. 分析上述问题的根本原因（预判：${rootCause}）`);
  repairParts.push(`2. 提供完整的修复方案，而非仅指出问题`);
  repairParts.push(`3. 修复时保留原有正常功能不受影响`);
  repairParts.push(`4. 给出修改后的完整代码，可直接替换使用`);
  repairParts.push(`5. 说明修改的原理，帮助理解为什么这样修复`);
  repairParts.push('');

  repairParts.push(`### 原始 Prompt（供参考上下文）`);
  repairParts.push('```');
  repairParts.push(originalPrompt.trim());
  repairParts.push('```');

  const repairPrompt = repairParts.join('\n');

  const preventionParts: string[] = [];
  preventionParts.push('下次生成类似任务的 Prompt 时，建议：');
  if (strategy.includes('类型')) {
    preventionParts.push('- 在 Prompt 中预先定义所有 TypeScript 接口');
  }
  if (strategy.includes('依赖')) {
    preventionParts.push('- 列出完整的依赖清单和版本要求');
  }
  if (strategy.includes('空值')) {
    preventionParts.push('- 明确要求防御性编程和空值检查');
  }
  preventionParts.push(`- ${strategy}`);

  return {
    repairPrompt,
    rootCause,
    fixStrategy: strategy,
    preventionAdvice: preventionParts.join('\n'),
  };
}
