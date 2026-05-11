export interface PromptScore {
  total: number;
  precision: number;
  contextRichness: number;
  constraintClarity: number;
  executability: number;
  safety: number;
  copyToAgent: number;
  feedback: string[];
  needsRewrite: boolean;
}

interface ScoreWeights {
  precision: number;
  contextRichness: number;
  constraintClarity: number;
  executability: number;
  safety: number;
  copyToAgent: number;
}

const WEIGHTS: ScoreWeights = {
  precision: 0.15,
  contextRichness: 0.15,
  constraintClarity: 0.15,
  executability: 0.20,
  safety: 0.10,
  copyToAgent: 0.25,
};

const REWRITE_THRESHOLD = 85;

function scorePrecision(prompt: string, context: string): { score: number; feedback: string[] } {
  let score = 60;
  const feedback: string[] = [];
  const lower = prompt.toLowerCase();

  const vagueTerms = ['等等', '之类', '诸如此格', '一般来说', '适当', '合理', '最好'];
  const vagueCount = vagueTerms.filter(t => lower.includes(t)).length;
  if (vagueCount === 0) {
    score += 20;
  } else if (vagueCount <= 2) {
    score += 10;
    feedback.push('存在少量模糊表述，建议替换为具体指标');
  } else {
    feedback.push('过多模糊表述（"等等"、"适当"等），建议全部替换为明确要求');
  }

  const hasNumbers = /\d+/.test(prompt);
  if (hasNumbers) score += 10;

  const hasSpecificTech = ['next.js', 'react', 'typescript', 'tailwind', 'supabase', 'prisma']
    .filter(t => lower.includes(t)).length;
  if (hasSpecificTech >= 2) score += 10;

  if (context && context.length > 20) {
    const contextKeywords = context.toLowerCase().split(/[,，、\s]+/).filter(w => w.length > 1);
    const matched = contextKeywords.filter(kw => lower.includes(kw)).length;
    if (matched >= 2) score += 10;
  }

  return { score: Math.min(100, score), feedback };
}

function scoreContextRichness(prompt: string): { score: number; feedback: string[] } {
  let score = 50;
  const feedback: string[] = [];

  const sections = ['背景', '目标', '约束', '上下文', '输入', '输出', '格式', '要求', '场景', '前提'];
  const foundSections = sections.filter(s => prompt.includes(s));
  score += Math.min(30, foundSections.length * 6);

  const wordCount = prompt.length;
  if (wordCount >= 500) {
    score += 20;
  } else if (wordCount >= 200) {
    score += 10;
    feedback.push('Prompt 长度偏短，建议增加更多上下文信息');
  } else {
    feedback.push('Prompt 过短，缺少必要的上下文信息');
  }

  return { score: Math.min(100, score), feedback };
}

function scoreConstraintClarity(prompt: string): { score: number; feedback: string[] } {
  let score = 50;
  const feedback: string[] = [];
  const lower = prompt.toLowerCase();

  const constraintIndicators = ['必须', '禁止', '不要', '不允许', '确保', '要求', '限制', '约束'];
  const constraintCount = constraintIndicators.filter(c => lower.includes(c)).length;
  score += Math.min(30, constraintCount * 7);

  const hasPositiveConstraints = ['必须', '确保', '要求'].some(c => lower.includes(c));
  const hasNegativeConstraints = ['禁止', '不要', '不允许'].some(c => lower.includes(c));
  if (hasPositiveConstraints && hasNegativeConstraints) {
    score += 20;
  } else if (hasPositiveConstraints || hasNegativeConstraints) {
    score += 10;
    feedback.push('建议同时定义正向要求和负向约束');
  } else {
    feedback.push('缺少明确的约束条件');
  }

  return { score: Math.min(100, score), feedback };
}

function scoreExecutability(prompt: string): { score: number; feedback: string[] } {
  let score = 50;
  const feedback: string[] = [];
  const lower = prompt.toLowerCase();

  const hasSteps = ['第一步', '步骤', 'step', '1.', '2.', '首先', '然后', '最后'].some(s => lower.includes(s));
  if (hasSteps) score += 15;

  const hasAcceptance = ['验收', '标准', '检查', '测试', '验证', '完成条件'].some(s => lower.includes(s));
  if (hasAcceptance) score += 20;
  else feedback.push('缺少验收标准，执行者无法判断是否完成');

  const hasOutputFormat = ['输出', '格式', '返回', '生成', '输出格式'].some(s => lower.includes(s));
  if (hasOutputFormat) score += 15;
  else feedback.push('缺少明确的输出格式要求');

  return { score: Math.min(100, score), feedback };
}

function scoreSafety(prompt: string): { score: number; feedback: string[] } {
  let score = 80;
  const feedback: string[] = [];
  const lower = prompt.toLowerCase();

  const dangerousPatterns = ['删除所有', 'drop table', 'truncate', 'rm -rf', 'format c:', 'exec(', 'eval('];
  const hasDangerous = dangerousPatterns.some(p => lower.includes(p));
  if (hasDangerous) {
    score -= 30;
    feedback.push('存在潜在危险操作指令，建议添加安全限制');
  }

  const hasSafetyNets = ['备份', '回滚', 'rollback', 'backup', '恢复'].some(s => lower.includes(s));
  if (hasDangerous && hasSafetyNets) {
    score += 15;
  }

  const hasPermissionCheck = ['权限', '认证', 'authorization', 'authentication', 'rls'].some(s => lower.includes(s));
  if (hasPermissionCheck) score += 10;

  return { score: Math.min(100, Math.max(0, score)), feedback };
}

function scoreCopyToAgent(prompt: string): { score: number; feedback: string[] } {
  let score = 40;
  const feedback: string[] = [];
  const lower = prompt.toLowerCase();

  const hasFilePath = /[a-zA-Z]:\\|\.\//.test(prompt) || prompt.includes('app/') || prompt.includes('src/') || prompt.includes('lib/') || prompt.includes('components/');
  if (hasFilePath) score += 15;
  else feedback.push('缺少具体文件路径，AI 无法定位修改位置');

  const hasTechStack = ['next.js', 'react', 'typescript', 'tailwind', 'supabase', 'prisma', 'zustand']
    .filter(t => lower.includes(t)).length;
  if (hasTechStack >= 2) score += 10;
  else feedback.push('未明确技术栈，AI 可能选择不一致的技术方案');

  const hasCodeBlock = prompt.includes('```');
  if (hasCodeBlock) score += 10;

  const hasAcceptance = ['验收', '标准', '完成条件', '测试通过', '编译通过', '0 errors']
    .some(s => lower.includes(s));
  if (hasAcceptance) score += 15;
  else feedback.push('缺少验收标准，无法判断执行是否完成');

  const hasPauseCondition = ['暂停', '遇到以下情况', '如果不确定', '暂停条件']
    .some(s => lower.includes(s));
  if (hasPauseCondition) score += 5;

  const vaguePatterns = ['请设计一个', '请实现一个', '请创建一个', '请开发一个'];
  const hasVagueRequest = vaguePatterns.some(p => lower.includes(p));
  const hasSpecificRequest = ['修改', '在.*文件', '将.*改为', '添加.*到', '更新.*接口']
    .some(p => new RegExp(p).test(lower));
  if (hasSpecificRequest && !hasVagueRequest) score += 5;
  else if (hasVagueRequest && !hasSpecificRequest) {
    feedback.push('请求过于宽泛，应具体说明修改哪个文件的哪个部分');
  }

  return { score: Math.min(100, score), feedback };
}

export function scorePrompt(prompt: string, context?: string): PromptScore {
  const precision = scorePrecision(prompt, context || '');
  const contextRichness = scoreContextRichness(prompt);
  const constraintClarity = scoreConstraintClarity(prompt);
  const executability = scoreExecutability(prompt);
  const safety = scoreSafety(prompt);
  const copyToAgent = scoreCopyToAgent(prompt);

  const total = Math.round(
    precision.score * WEIGHTS.precision +
    contextRichness.score * WEIGHTS.contextRichness +
    constraintClarity.score * WEIGHTS.constraintClarity +
    executability.score * WEIGHTS.executability +
    safety.score * WEIGHTS.safety +
    copyToAgent.score * WEIGHTS.copyToAgent
  );

  const feedback = [
    ...precision.feedback,
    ...contextRichness.feedback,
    ...constraintClarity.feedback,
    ...executability.feedback,
    ...safety.feedback,
    ...copyToAgent.feedback,
  ];

  return {
    total,
    precision: precision.score,
    contextRichness: contextRichness.score,
    constraintClarity: constraintClarity.score,
    executability: executability.score,
    safety: safety.score,
    copyToAgent: copyToAgent.score,
    feedback,
    needsRewrite: total < REWRITE_THRESHOLD,
  };
}

const REWRITE_SYSTEM_PROMPT = `你是一位 Prompt 工程专家。你的任务是根据评分反馈重写 Prompt，使其达到 85 分以上。

重写原则：
1. 消除所有模糊表述，替换为具体、可量化的要求
2. 补充缺失的上下文信息
3. 添加明确的正向要求和负向约束
4. 添加清晰的步骤和验收标准
5. 添加输出格式要求
6. 保持原意不变，不添加无关内容

直接输出重写后的完整 Prompt，不要解释。`;

export async function rewritePromptIfNeeded(
  prompt: string,
  context?: string,
  maxAttempts: number = 2
): Promise<{ prompt: string; score: PromptScore; rewritten: boolean }> {
  let currentPrompt = prompt;
  let currentScore = scorePrompt(currentPrompt, context);
  let rewritten = false;

  const apiKey = process.env.OPENAI_API_KEY;

  for (let attempt = 0; attempt < maxAttempts && currentScore.needsRewrite; attempt++) {
    if (!apiKey) {
      currentPrompt = rewritePromptLocal(currentPrompt, currentScore.feedback);
      currentScore = scorePrompt(currentPrompt, context);
      rewritten = true;
      continue;
    }

    try {
      const baseUrl = process.env.OPENAI_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4';
      const model = process.env.OPENAI_MODEL || 'glm-4-flash';

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: REWRITE_SYSTEM_PROMPT },
            { role: 'user', content: `请重写以下 Prompt，目标评分 >= 85。\n\n当前评分：${currentScore.total}\n反馈：\n${currentScore.feedback.map(f => `- ${f}`).join('\n')}\n\n原始 Prompt：\n${currentPrompt}` },
          ],
          temperature: 0.3,
          max_tokens: 4000,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        const content = result.choices?.[0]?.message?.content || '';
        if (content && content.length > 100) {
          currentPrompt = content;
          rewritten = true;
        }
      }
    } catch {
      currentPrompt = rewritePromptLocal(currentPrompt, currentScore.feedback);
      rewritten = true;
    }

    currentScore = scorePrompt(currentPrompt, context);
  }

  return { prompt: currentPrompt, score: currentScore, rewritten };
}

function rewritePromptLocal(prompt: string, feedback: string[]): string {
  let rewritten = prompt;

  if (feedback.some(f => f.includes('验收标准'))) {
    rewritten += '\n\n【验收标准】\n1. 功能实现完整，覆盖所有需求点\n2. 无 TypeScript 编译错误\n3. 页面渲染正常，交互流畅';
  }

  if (feedback.some(f => f.includes('输出格式'))) {
    rewritten += '\n\n【输出格式】\n请使用结构化的 Markdown 输出，包含标题、代码块和说明。';
  }

  if (feedback.some(f => f.includes('模糊表述'))) {
    rewritten = rewritten.replace(/等等/g, '以及其他相关功能');
    rewritten = rewritten.replace(/适当/g, '具体');
    rewritten = rewritten.replace(/合理/g, '明确');
  }

  if (feedback.some(f => f.includes('约束条件'))) {
    rewritten += '\n\n【约束条件】\n1. 使用 TypeScript 严格模式\n2. 遵循现有代码风格\n3. 不引入未经验证的第三方依赖';
  }

  return rewritten;
}
