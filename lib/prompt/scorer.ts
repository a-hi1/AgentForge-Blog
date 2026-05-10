'use client';

export interface PromptScore {
  score: number;
  grade: 'excellent' | 'great' | 'good' | 'average' | 'needs_improvement';
  gradeLabel: string;
  dimensions: {
    structure: number;
    professionalism: number;
    executability: number;
    executionSuccess: number;
    userFeedback: number;
    retryCount: number;
  };
  feedback: string[];
}

export interface ScoreInput {
  prompt: string;
  projectType?: string;
  executionSuccess?: boolean;
  userFeedback?: 'excellent' | 'average' | 'failed';
  retryCount?: number;
  executionOutput?: string;
}

export function calculatePromptScore(input: ScoreInput): PromptScore {
  const structure = calculateStructureScore(input.prompt);
  const professionalism = calculateProfessionalismScore(input.prompt);
  const executability = calculateExecutabilityScore(input.prompt);
  const executionSuccess = input.executionSuccess !== undefined 
    ? (input.executionSuccess ? 100 : 20) 
    : 70;
  const userFeedback = input.userFeedback 
    ? getUserFeedbackScore(input.userFeedback)
    : 70;
  const retryCount = input.retryCount 
    ? Math.max(0, 100 - input.retryCount * 10)
    : 70;

  const weights = {
    structure: 0.2,
    professionalism: 0.15,
    executability: 0.2,
    executionSuccess: 0.25,
    userFeedback: 0.15,
    retryCount: 0.05
  };

  const totalScore = Math.round(
    structure * weights.structure +
    professionalism * weights.professionalism +
    executability * weights.executability +
    executionSuccess * weights.executionSuccess +
    userFeedback * weights.userFeedback +
    retryCount * weights.retryCount
  );

  const { grade, gradeLabel } = getGrade(totalScore);

  const feedback = generateFeedback(totalScore, {
    structure,
    professionalism,
    executability,
    executionSuccess,
    userFeedback,
    retryCount
  });

  return {
    score: totalScore,
    grade,
    gradeLabel,
    dimensions: {
      structure,
      professionalism,
      executability,
      executionSuccess,
      userFeedback,
      retryCount
    },
    feedback
  };
}

function calculateStructureScore(prompt: string): number {
  let score = 50;
  if (!prompt) return 30;

  if (prompt.includes('#')) score += 10;
  if (prompt.includes('##')) score += 5;
  if (prompt.includes('###')) score += 5;
  if (prompt.includes('- ')) score += 5;
  if (prompt.includes('* ')) score += 3;
  if (prompt.includes('1.') || prompt.includes('2.') || prompt.includes('3.')) score += 5;
  
  if (prompt.length > 500) score += 5;
  if (prompt.length > 1000) score += 5;
  if (prompt.length > 2000) score += 5;

  const hasRole = /角色|role|你是|你现在是/i.test(prompt);
  if (hasRole) score += 5;

  const hasSteps = /步骤|step|阶段|phase|1\.|2\./i.test(prompt);
  if (hasSteps) score += 5;

  const hasConstraints = /必须|禁止|注意|要求|constraint/i.test(prompt);
  if (hasConstraints) score += 5;

  const hasExamples = /例如|比如|example|for example/i.test(prompt);
  if (hasExamples) score += 2;

  return Math.min(100, score);
}

function calculateProfessionalismScore(prompt: string): number {
  let score = 60;
  if (!prompt) return 40;

  const chineseChars = (prompt.match(/[\u4e00-\u9fff]/g) || []).length;
  const totalChars = prompt.length;
  const chineseRatio = chineseChars / Math.max(1, totalChars);
  
  if (chineseRatio > 0.8) score += 10;
  else if (chineseRatio > 0.5) score += 5;
  
  const hasTechnicalTerms = /API|架构|组件|模块|代码|开发|部署|优化/i.test(prompt);
  if (hasTechnicalTerms) score += 5;

  const hasClearInstruction = /请|请你|需要|需要你|帮助|协助|你要/i.test(prompt);
  if (hasClearInstruction) score += 5;

  const hasOutputFormat = /输出|返回|结果|格式|JSON|markdown/i.test(prompt);
  if (hasOutputFormat) score += 10;

  const hasTaskDefinition = /任务|task|目标|objective|需求|requirement/i.test(prompt);
  if (hasTaskDefinition) score += 10;

  return Math.min(100, score);
}

function calculateExecutabilityScore(prompt: string): number {
  let score = 50;
  if (!prompt) return 30;

  const hasClearOutput = /生成|创建|编写|写|实现|开发|build|create|write|generate/i.test(prompt);
  if (hasClearOutput) score += 10;

  const hasSpecificInstructions = /函数|方法|文件|类|组件|module|component|function|class/i.test(prompt);
  if (hasSpecificInstructions) score += 10;

  const hasMeasurableGoal = /完成|成功|验收|通过|test|validate|verify/i.test(prompt);
  if (hasMeasurableGoal) score += 5;

  const hasErrorHandling = /错误|异常|error|exception|失败|fail/i.test(prompt);
  if (hasErrorHandling) score += 5;

  const hasEdgeCases = /边界|边缘|edge|case|特殊情况/i.test(prompt);
  if (hasEdgeCases) score += 5;

  const hasClarity = /明确|清晰|具体|详细|clear|specific|detailed/i.test(prompt);
  if (hasClarity) score += 5;

  const isTooShort = prompt.length < 100;
  if (isTooShort) score -= 10;

  return Math.max(0, Math.min(100, score));
}

function getUserFeedbackScore(feedback: 'excellent' | 'average' | 'failed'): number {
  switch (feedback) {
    case 'excellent': return 100;
    case 'average': return 60;
    case 'failed': return 20;
    default: return 70;
  }
}

function getGrade(score: number): { grade: PromptScore['grade']; gradeLabel: string } {
  if (score >= 90) return { grade: 'excellent', gradeLabel: '卓越' };
  if (score >= 80) return { grade: 'great', gradeLabel: '优秀' };
  if (score >= 70) return { grade: 'good', gradeLabel: '良好' };
  if (score >= 60) return { grade: 'average', gradeLabel: '一般' };
  return { grade: 'needs_improvement', gradeLabel: '需优化' };
}

function generateFeedback(totalScore: number, dimensions: any): string[] {
  const feedback: string[] = [];
  
  if (dimensions.structure < 70) {
    feedback.push('建议增加清晰的结构，使用标题、列表等格式');
  }
  
  if (dimensions.executability < 70) {
    feedback.push('建议明确输出要求和验收标准');
  }
  
  if (dimensions.professionalism < 70) {
    feedback.push('建议使用更专业的技术术语和表述');
  }
  
  if (dimensions.executionSuccess < 60) {
    feedback.push('执行成功率较低，建议检查 Prompt 指令清晰度');
  }
  
  if (totalScore < 70) {
    feedback.push('综合评分较低，建议使用智能优化功能改进');
  }
  
  if (feedback.length === 0) {
    feedback.push('Prompt 质量良好，继续保持！');
  }
  
  return feedback;
}

export function recalculatePromptScore(promptHistory: any, feedback?: 'excellent' | 'average' | 'failed'): PromptScore {
  return calculatePromptScore({
    prompt: promptHistory.output,
    projectType: promptHistory.project_type,
    executionSuccess: promptHistory.execution_success,
    userFeedback: feedback || promptHistory.feedback,
    retryCount: 0
  });
}
