export interface ExecutionTruthScore {
  overall: number;
  successRate: number;
  completeness: number;
  engineeringQuality: number;
  errorPatterns: string[];
  needsPromptUpgrade: boolean;
  upgradeSuggestions: string[];
}

function hasCodeBlocks(text: string): boolean {
  return /```[\s\S]*?```/.test(text);
}

function hasStructuredSections(text: string): boolean {
  const headings = text.match(/^#{1,3}\s+.+$/gm);
  return (headings?.length || 0) >= 2;
}

function hasSpecificContent(text: string): boolean {
  const specificPatterns = [
    /\b(export|import|function|class|const|let|var|interface|type)\b/,
    /\b(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER)\b/i,
    /\b(GET|POST|PUT|DELETE|PATCH)\b/,
    /\b(http|https):\/\/\S+/,
    /\b\w+\.\w+\.\w+/,
    /['"][\w\-./]+['"]/,
  ];
  return specificPatterns.filter(p => p.test(text)).length >= 2;
}

function hasGenericTemplates(text: string): boolean {
  const genericPatterns = [
    /需要结合具体业务场景/,
    /根据实际需求进行调整/,
    /此处省略.*具体实现/,
    /TODO/,
    /待完善/,
    /仅供参考/,
  ];
  return genericPatterns.filter(p => p.test(text)).length >= 1;
}

function detectErrorPatterns(text: string): string[] {
  const patterns: string[] = [];

  if (hasGenericTemplates(text)) {
    patterns.push('包含模板化/占位内容');
  }
  if (!hasStructuredSections(text) && text.length > 200) {
    patterns.push('缺乏结构化组织');
  }
  if (!hasCodeBlocks(text) && text.length > 300) {
    patterns.push('缺少代码实现');
  }
  if (text.length < 100) {
    patterns.push('输出过短，可能不完整');
  }
  if (/(.)\1{5,}/.test(text)) {
    patterns.push('包含重复内容');
  }

  const sentences = text.split(/[。！？\n]/).filter(s => s.trim().length > 5);
  const uniqueSentences = new Set(sentences.map(s => s.trim().slice(0, 30)));
  if (sentences.length > 5 && uniqueSentences.size < sentences.length * 0.6) {
    patterns.push('内容重复度高');
  }

  return patterns;
}

function checkCompleteness(text: string, originalPrompt: string): number {
  let score = 50;

  if (text.length > 500) score += 10;
  if (text.length > 1000) score += 10;
  if (hasStructuredSections(text)) score += 10;
  if (hasCodeBlocks(text)) score += 10;

  const promptKeywords = originalPrompt
    .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 1);
  const matchedKeywords = promptKeywords.filter(w => text.includes(w));
  if (promptKeywords.length > 0) {
    const matchRatio = matchedKeywords.length / promptKeywords.length;
    score += Math.round(matchRatio * 10);
  }

  return Math.min(100, score);
}

function checkEngineeringQuality(text: string): number {
  let score = 40;

  if (hasCodeBlocks(text)) score += 15;
  if (/\b(typescript|javascript|python|rust|go)\b/i.test(text)) score += 5;
  if (/\b(interface|type|class)\b/.test(text)) score += 5;
  if (/\b(error|exception|catch|try|throw)\b/i.test(text)) score += 5;
  if (/\b(test|spec|describe|it\(|expect)\b/i.test(text)) score += 5;
  if (/\b(async|await|Promise|callback)\b/.test(text)) score += 5;
  if (hasSpecificContent(text)) score += 10;

  return Math.min(100, score);
}

export function analyzeExecutionResult(
  result: string,
  originalPrompt: string
): ExecutionTruthScore {
  const errorPatterns = detectErrorPatterns(result);
  const completeness = checkCompleteness(result, originalPrompt);
  const engineeringQuality = checkEngineeringQuality(result);

  let successRate = 60;
  if (errorPatterns.length === 0) successRate += 20;
  if (hasCodeBlocks(result)) successRate += 10;
  if (hasStructuredSections(result)) successRate += 10;
  if (result.length > 300) successRate += 5;
  successRate = Math.min(100, Math.max(0, successRate - errorPatterns.length * 10));

  const overall = Math.round(
    successRate * 0.3 + completeness * 0.3 + engineeringQuality * 0.4
  );

  const needsPromptUpgrade = overall < 60 || errorPatterns.length >= 2;
  const upgradeSuggestions: string[] = [];

  if (errorPatterns.includes('包含模板化/占位内容')) {
    upgradeSuggestions.push('增加具体约束，要求输出包含实际代码');
  }
  if (errorPatterns.includes('缺少代码实现')) {
    upgradeSuggestions.push('明确要求输出包含可运行的代码片段');
  }
  if (errorPatterns.includes('输出过短，可能不完整')) {
    upgradeSuggestions.push('增加详细度要求，指定最小输出长度');
  }
  if (errorPatterns.includes('缺乏结构化组织')) {
    upgradeSuggestions.push('要求使用 Markdown 标题和分段结构');
  }
  if (completeness < 50) {
    upgradeSuggestions.push('Prompt 需要更明确的需求描述和验收标准');
  }
  if (engineeringQuality < 50) {
    upgradeSuggestions.push('增加技术栈约束和工程规范要求');
  }

  return {
    overall,
    successRate,
    completeness,
    engineeringQuality,
    errorPatterns,
    needsPromptUpgrade,
    upgradeSuggestions,
  };
}
