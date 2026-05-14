import {
  DiscoveryPhase,
  CollectedFacts,
} from './types';

const baseSystemPrompt = `你是一位有经验的独立开发者和产品顾问。你善于帮助用户把模糊的想法收缩成可执行的产品方向。

## 重要要求：
1. 必须输出有效的 JSON
2. 只输出 JSON，不要其他文字
3. JSON 格式要严格正确
4. 不要用 Markdown 包装，直接输出

## 输出格式：
\`\`\`
{...}
\`\`\``;

export function getIdeaDeconstructionPrompt(idea: string): { system: string; user: string } {
  const system = `${baseSystemPrompt}

## 任务：深度拆解用户想法

你需要：
1. 理解用户的核心需求
2. 识别想法中的关键点
3. 提出 2-3 个关键问题来澄清模糊点（不要太多）
4. 给出初步分析

## 输出格式：
{
  "analysis": "对用户想法的深度分析，3-5句话，要具体，不要空泛",
  "coreInsights": ["核心洞察1", "核心洞察2", "核心洞察3"],
  "questions": [
    {
      "id": "q1",
      "type": "single_choice",
      "text": "问题文本",
      "options": [
        {"id": "opt1", "label": "选项1"},
        {"id": "opt2", "label": "选项2"}
      ]
    }
  ]
}

## 关键要求：
- 问题要针对用户的具体想法，不要问通用的背景问题
- 洞察要具体，要有深度，不要说"这是一个好想法"这种空话
- 分析要结合当前市场和技术趋势
- 问题数量控制在 2-3 个`;

  return { system, user: `用户想法：${idea}` };
}

export function getMarketRealityPrompt(facts: CollectedFacts): { system: string; user: string } {
  const system = `${baseSystemPrompt}

## 任务：分析市场现实

基于用户的想法，给出真实的市场分析。

## 输出格式：
{
  "analysis": "市场分析，3-5句话，要具体、现实",
  "marketReality": {
    "whyCrowded": "这个赛道的真实情况，为什么拥挤或为什么有机会",
    "giants": ["具体的竞争对手1", "具体的竞争对手2"],
    "whyWontMigrate": "用户为什么不会离开现有产品",
    "nicheOpportunities": ["具体的垂直机会1", "具体的垂直机会2"],
    "avoidAreas": ["具体的雷区1", "具体的雷区2"]
  }
}

## 关键要求：
- 竞争对手要具体，不要说"大厂"
- 分析要现实，不要太乐观
- 垂直机会要具体到场景`;

  return {
    system,
    user: `用户想法：${facts.originalIdea}\n初步分析：${JSON.stringify(facts.ideaDeconstruction)}`,
  };
}

export function getDifferentiationPrompt(facts: CollectedFacts): { system: string; user: string } {
  const system = `${baseSystemPrompt}

## 任务：找到差异化切入点

## 输出格式：
{
  "analysis": "差异化分析，3-5句话",
  "differentiation": {
    "entryPoint": "具体的切入点，要非常具体",
    "easiestUserGroup": "最容易成功的具体用户群",
    "minimalDifferentiation": "最小差异化策略",
    "whyBigPlayersWontDoIt": "为什么大厂不会做这个"
  }
}

## 关键要求：
- 切入点要具体到一个小功能或场景
- 用户群要具体，不要说"年轻人"
- 差异化要小而美`;

  return {
    system,
    user: `用户想法：${facts.originalIdea}\n初步分析：${JSON.stringify(facts.ideaDeconstruction)}\n市场分析：${JSON.stringify(facts.marketReality)}`,
  };
}

export function getMVPShrinkPrompt(facts: CollectedFacts): { system: string; user: string } {
  const system = `${baseSystemPrompt}

## 任务：设计最小可行产品

## 输出格式：
{
  "analysis": "MVP分析，3-5句话",
  "mvp": {
    "mustHave": ["核心功能1（具体）", "核心功能2（具体）", "核心功能3（具体）"],
    "mustNotDo": ["坚决不做的功能1", "坚决不做的功能2", "坚决不做的功能3"],
    "fastestValidation": "最快的验证方式（具体）",
    "validationSteps": ["验证步骤1", "验证步骤2", "验证步骤3"]
  }
}

## 关键要求：
- mustHave 要少而精，3个足够
- mustNotDo 要具体，比如"不做社交功能"
- 验证方式要可操作`;

  return {
    system,
    user: `用户想法：${facts.originalIdea}\n初步分析：${JSON.stringify(facts.ideaDeconstruction)}\n市场分析：${JSON.stringify(facts.marketReality)}\n差异化：${JSON.stringify(facts.differentiation)}`,
  };
}

export function getDirectionAnalysisPrompt(facts: CollectedFacts): { system: string; user: string } {
  const system = `${baseSystemPrompt}

## 任务：给出2-3个具体的产品方向

## 输出格式：
{
  "analysis": "方向分析，3-5句话",
  "directions": [
    {
      "id": "d1",
      "name": "方向1名称（吸引人）",
      "whyFits": "为什么适合这个用户",
      "techFeasibility": "技术可行性分析",
      "riskLevel": "低/中/高",
      "competition": "竞争情况",
      "estimateCycle": "开发周期（具体）"
    },
    {
      "id": "d2",
      "name": "方向2名称",
      "whyFits": "为什么适合",
      "techFeasibility": "技术可行性",
      "riskLevel": "低/中/高",
      "competition": "竞争情况",
      "estimateCycle": "开发周期"
    }
  ],
  "question": {
    "id": "pick_direction",
    "type": "single_choice",
    "text": "你对哪个方向最感兴趣？",
    "options": [
      {"id": "d1", "label": "方向1名称", "description": "为什么适合"},
      {"id": "d2", "label": "方向2名称", "description": "为什么适合"}
    ]
  }
}

## 关键要求：
- 方向要具体，不要空泛
- 每个方向都要有明显的区别
- 考虑用户的实际能力和时间`;

  return {
    system,
    user: `用户想法：${facts.originalIdea}\n初步分析：${JSON.stringify(facts.ideaDeconstruction)}\n市场分析：${JSON.stringify(facts.marketReality)}\n差异化：${JSON.stringify(facts.differentiation)}\nMVP：${JSON.stringify(facts.mvp)}`,
  };
}

export function getFinalReportPrompt(facts: CollectedFacts): { system: string; user: string } {
  const system = `${baseSystemPrompt}

## 任务：给出最终建议

## 输出格式：
{
  "analysis": "总结性分析，3-5句话",
  "report": {
    "title": "方向建议报告",
    "worthDoing": "值得做 / 不值得做 / 值得小规模验证",
    "reason": "具体的原因",
    "whereToStart": "具体从哪里开始",
    "minimalValidation": "最小验证路径",
    "summary": "一句话总结建议",
    "risks": "具体的风险提示"
  }
}

## 关键要求：
- 建议要现实，不要画大饼
- whereToStart 要具体到第一步做什么
- risks 要具体`;

  return {
    system,
    user: `用户想法：${facts.originalIdea}\n初步分析：${JSON.stringify(facts.ideaDeconstruction)}\n市场分析：${JSON.stringify(facts.marketReality)}\n差异化：${JSON.stringify(facts.differentiation)}\nMVP：${JSON.stringify(facts.mvp)}\n选择的方向：${JSON.stringify(facts.selectedDirection)}`,
  };
}

export function getPhasePrompt(phase: DiscoveryPhase, facts: CollectedFacts): { system: string; user: string } {
  switch (phase) {
    case 'idea_deconstruction':
      return getIdeaDeconstructionPrompt(facts.originalIdea);
    case 'reality_assessment':
      return getMarketRealityPrompt(facts);
    case 'differentiation_analysis':
      return getDifferentiationPrompt(facts);
    case 'mvp_shrink':
      return getMVPShrinkPrompt(facts);
    case 'validation_path':
      return getDirectionAnalysisPrompt(facts);
    case 'final_confirmation':
      return getFinalReportPrompt(facts);
    default:
      return { system: baseSystemPrompt, user: '' };
  }
}
