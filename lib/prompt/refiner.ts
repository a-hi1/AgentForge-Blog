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
