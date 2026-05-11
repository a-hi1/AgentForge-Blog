export interface RepairInput {
  originalPrompt: string;
  failedStep: string;
  error: string;
  file?: string;
  expectedBehavior?: string;
  actualBehavior?: string;
  log?: string;
  generatedCodeSummary?: string;
}

export interface RepairOutput {
  rootCause: string;
  fixScope: string;
  filesToModify: string[];
  repairPrompt: string;
  forbidden: string[];
}

function extractSections(prompt: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const regex = /(?:^|\n)##\s+(?:Section\s+\d+:\s*)?(.+?)(?:\n|$)/g;
  const matches = Array.from(prompt.matchAll(regex));

  for (let i = 0; i < matches.length; i++) {
    const name = matches[i][1].trim();
    const start = matches[i].index! + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index! : prompt.length;
    sections[name] = prompt.slice(start, end).trim();
  }

  if (Object.keys(sections).length === 0) {
    sections['全文'] = prompt;
  }

  return sections;
}

function buildRelevantContext(prompt: string, failedStep: string, file?: string): string {
  const sections = extractSections(prompt);
  const relevant: string[] = [];

  for (const [name, content] of Object.entries(sections)) {
    const nameLower = name.toLowerCase();
    const stepLower = failedStep.toLowerCase();

    if (
      nameLower.includes('file') ||
      nameLower.includes('task') ||
      nameLower.includes('role') ||
      nameLower.includes('execution') ||
      nameLower.includes('context') ||
      nameLower.includes('boundary')
    ) {
      relevant.push(`## ${name}\n${content}`);
      continue;
    }

    if (stepLower.includes(nameLower) || nameLower.includes(stepLower)) {
      relevant.push(`## ${name}\n${content}`);
    }
  }

  if (file) {
    for (const [, content] of Object.entries(sections)) {
      if (content.includes(file)) {
        relevant.push(`相关上下文:\n${content}`);
        break;
      }
    }
  }

  return relevant.join('\n\n').slice(0, 2000);
}

export function generateRepairPrompt(input: RepairInput): RepairOutput {
  const { originalPrompt, failedStep, error, file, expectedBehavior, actualBehavior, log, generatedCodeSummary } = input;

  const relevantContext = buildRelevantContext(originalPrompt, failedStep, file);

  const filesToModify = file ? [file] : [];
  if (!file) {
    const fileRegex = /(?:文件|file|src|app|lib|components)[\s/\\]*[\w./]+\.(?:ts|tsx|js|jsx)/gi;
    const found = failedStep.match(fileRegex);
    if (found) filesToModify.push(...found.slice(0, 2));
  }

  const forbidden = [
    '禁止重新生成整个项目',
    '禁止修改未在修复范围中列出的文件',
    '禁止删除原有功能',
    '禁止引入新的未声明依赖',
    '禁止输出解释性长文',
    `仅允许修改: ${filesToModify.length > 0 ? filesToModify.join(', ') : '由你判断的最小范围'}`,
  ];

  const parts: string[] = [];

  parts.push('# 精准修复指令');
  parts.push('');
  parts.push('你是修复引擎。仅修复以下问题，不做任何额外改动。');
  parts.push('');

  parts.push('## 问题定位');
  parts.push('');
  parts.push(`**失败步骤**: ${failedStep}`);
  parts.push(`**错误**: ${error}`);
  if (file) parts.push(`**当前文件**: ${file}`);
  if (expectedBehavior) parts.push(`**期望行为**: ${expectedBehavior}`);
  if (actualBehavior) parts.push(`**实际行为**: ${actualBehavior}`);
  parts.push('');

  if (log) {
    parts.push('## 错误日志');
    parts.push('```');
    parts.push(log.slice(0, 1000));
    parts.push('```');
    parts.push('');
  }

  parts.push('## 原始 Prompt 上下文');
  parts.push('');
  parts.push(relevantContext || originalPrompt.slice(0, 1500));
  parts.push('');

  if (generatedCodeSummary) {
    parts.push('## 已生成代码摘要');
    parts.push('');
    parts.push(generatedCodeSummary.slice(0, 800));
    parts.push('');
  }

  parts.push('## 修复范围');
  parts.push('');
  parts.push(`仅修改以下文件: ${filesToModify.length > 0 ? filesToModify.join(', ') : '(请根据错误判断最小范围)'}`);
  parts.push('');

  parts.push('## 输出要求');
  parts.push('');
  parts.push('### Modified Files');
  parts.push('列出所有被修改的文件路径');
  parts.push('');
  parts.push('### Root Cause');
  parts.push('一句话说明根因');
  parts.push('');
  parts.push('### Fix');
  parts.push('仅输出修改部分的代码，使用 diff 或完整文件替换');
  parts.push('');
  parts.push('### Verification');
  parts.push('如何验证修复成功');
  parts.push('');

  parts.push('## 禁止项');
  parts.push('');
  forbidden.forEach(f => parts.push(`- ${f}`));
  parts.push('');
  parts.push('完成后输出: FIX_DONE');

  return {
    rootCause: `[待确认] ${error}`,
    fixScope: `仅修改 ${filesToModify.join(', ') || '最小范围'}`,
    filesToModify,
    repairPrompt: parts.join('\n'),
    forbidden,
  };
}

export function formatRepairForCopy(input: RepairInput): string {
  return generateRepairPrompt(input).repairPrompt;
}

export function extractFixFiles(repairPrompt: string): string[] {
  const fileRegex = /(?:修改|fix|file|src|app|lib|components)[\s/\\]*[\w./]+\.(?:ts|tsx|js|jsx)/gi;
  const matches = repairPrompt.match(fileRegex) || [];
  return Array.from(new Set(matches));
}

export function validateRepairPrompt(prompt: string): boolean {
  const minLength = 200;
  const hasSections = prompt.includes('##');
  const hasForbidden = prompt.includes('禁止');
  const hasOutputFormat = prompt.includes('Modified Files') || prompt.includes('FIX_DONE');

  return prompt.length >= minLength && hasSections && hasForbidden && hasOutputFormat;
}

export interface RefinementInput {
  originalPrompt: string;
  score?: number;
  humanFeedback?: string;
}

export interface RefinementResult {
  originalIssues: string[];
  strategy: string;
  improvements: string[];
  improvedPrompt: string;
}

function detectIssues(prompt: string): string[] {
  const issues: string[] = [];

  if (prompt.length < 800) issues.push('内容过短，缺少关键细节');
  if (!/(##|ROLE|角色)/i.test(prompt)) issues.push('缺少角色定义');
  if (!/(禁止|不得|forbidden)/i.test(prompt)) issues.push('缺少明确约束');
  if (!/(Phase|阶段|步骤)/i.test(prompt)) issues.push('缺少执行阶段划分');
  if (!/(验证|verify|check)/i.test(prompt)) issues.push('缺少验证清单');
  if (!/[\w-]+\.(ts|tsx|js|jsx)/.test(prompt)) issues.push('缺少具体文件路径');
  if (prompt.length > 8000) issues.push('内容过长，可能包含冗余信息');

  const sectionCount = (prompt.match(/##/g) || []).length;
  if (sectionCount < 3) issues.push(`仅 ${sectionCount} 个章节，结构不足`);

  return issues;
}

export function refinePrompt(input: RefinementInput): RefinementResult {
  const { originalPrompt, score, humanFeedback } = input;
  const issues = detectIssues(originalPrompt);
  const suggestions: string[] = [];
  let improved = originalPrompt;

  if (issues.includes('内容过短，缺少关键细节')) {
    suggestions.push('补充详细功能需求和技术约束');
  }
  if (issues.includes('缺少角色定义')) {
    improved = `## ROLE\n你是资深全栈工程师。严格按要求实现，不做额外扩展。\n\n${improved}`;
    suggestions.push('添加了角色定义章节');
  }
  if (issues.includes('缺少明确约束')) {
    improved += '\n\n## BOUNDARY\n- 禁止修改未指定的文件\n- 禁止引入未声明的依赖\n- 禁止自动重构';
    suggestions.push('添加了边界约束');
  }
  if (issues.includes('缺少执行阶段划分')) {
    suggestions.push('建议拆分为多个执行阶段，每阶段后暂停确认');
  }
  if (issues.includes('缺少验证清单')) {
    improved += '\n\n## VALIDATION\n- [ ] npm run dev 无报错\n- [ ] TS 0 errors\n- [ ] 功能可用';
    suggestions.push('添加了验证清单');
  }

  if (humanFeedback) {
    improved += `\n\n## 人类反馈修正\n${humanFeedback}`;
    suggestions.push('整合了人类反馈');
  }

  const strategy = issues.length > 0
    ? `发现 ${issues.length} 个问题: ${issues.join('; ')}。${suggestions.length > 0 ? '已自动修复部分问题。' : '建议手动补充。'}`
    : 'Prompt 结构完整，建议保持。';

  return {
    originalIssues: issues,
    strategy,
    improvements: suggestions,
    improvedPrompt: improved,
  };
}
