import {
  DiscoveryPhase,
  CollectedFacts,
} from './types';

const baseSystemPrompt = `你是一位有经验的独立开发者和产品顾问。你善于帮助用户把模糊的想法收缩成可执行的产品方向。

## 重要要求
1. 必须输出有效的JSON
2. 只输出JSON，不要其他文字
3. JSON格式要严格正确
4. 不要用Markdown包装，直接输出
5. 所有分析必须完全围绕用户的原始想法，不要跑偏`;

export function getIdeaDeconstructionPrompt(idea: string): { system: string; user: string } {
  const system = `${baseSystemPrompt}

## 任务：深度拆解用户想法

你需要：
1. 仔细分析用户的具体想法，完全围绕用户输入的内容
2. 不要编造或引入无关内容
3. 给出核心洞察

## 输出格式
{
  "analysis": "对用户想法的深度分析，3-5句话，必须完全围绕用户输入的内容",
  "coreInsights": [
    "具体的洞察1",
    "具体的洞察2",
    "具体的洞察3"
  ]
}

## 关键要求
- 最重要：所有内容必须完全围绕用户的原始想法
- 洞察要具体、有深度
- 不需要问问题，直接分析`;

  return { system, user: `用户想法：${idea}` };
}

export function getMarketRealityPrompt(facts: CollectedFacts): { system: string; user: string } {
  const system = `${baseSystemPrompt}

## 任务：分析市场现实

基于用户的想法，给出真实的市场分析。

## 输出格式
{
  "analysis": "市场分析，3-5句话，要具体、现实，围绕用户想法",
  "marketReality": {
    "whyCrowded": "这个赛道的真实情况",
    "giants": ["具体的竞争对手1", "具体的竞争对手2"],
    "whyWontMigrate": "用户为什么不会离开现有产品",
    "nicheOpportunities": ["具体的垂直机会1", "具体的垂直机会2"],
    "avoidAreas": ["具体的雷区1", "具体的雷区2"]
  }
}

## 关键要求
- 所有分析必须围绕用户的具体想法
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

## 输出格式
{
  "analysis": "差异化分析，3-5句话，围绕用户想法",
  "differentiation": {
    "entryPoint": "具体的切入点，要非常具体",
    "easiestUserGroup": "最容易成功的具体用户群",
    "minimalDifferentiation": "最小差异化策略",
    "whyBigPlayersWontDoIt": "为什么大厂不会做这个"
  }
}

## 关键要求
- 切入点要具体到一个小功能或场景
- 用户群要具体，不要说"年轻人"
- 差异化要小而美
- 所有内容必须围绕用户的原始想法`;

  return {
    system,
    user: `用户想法：${facts.originalIdea}\n初步分析：${JSON.stringify(facts.ideaDeconstruction)}\n市场分析：${JSON.stringify(facts.marketReality)}`,
  };
}

export function getMVPShrinkPrompt(facts: CollectedFacts): { system: string; user: string } {
  const system = `${baseSystemPrompt}

## 任务：设计最小可行产品

## 输出格式
{
  "analysis": "MVP分析，3-5句话，围绕用户想法",
  "mvp": {
    "mustHave": ["核心功能1（具体）", "核心功能2（具体）", "核心功能3（具体）"],
    "mustNotDo": ["坚决不做的功能1", "坚决不做的功能2", "坚决不做的功能3"],
    "fastestValidation": "最快的验证方式（具体）",
    "validationSteps": ["验证步骤1", "验证步骤2", "验证步骤3"]
  }
}

## 关键要求
- mustHave要少而精，3个足够
- mustNotDo要具体，比如"不做社交功能"
- 验证方式要可操作
- 所有内容必须围绕用户的原始想法`;

  return {
    system,
    user: `用户想法：${facts.originalIdea}\n初步分析：${JSON.stringify(facts.ideaDeconstruction)}\n市场分析：${JSON.stringify(facts.marketReality)}\n差异化：${JSON.stringify(facts.differentiation)}`,
  };
}

export function getDirectionAnalysisPrompt(facts: CollectedFacts): { system: string; user: string } {
  const system = `${baseSystemPrompt}

## 任务：给出2个具体的产品方向

## 输出格式
{
  "analysis": "方向分析，3-5句话，围绕用户想法",
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

## 关键要求
- 方向要具体，不要空泛
- 每个方向都要有明显的区别
- 考虑用户的实际能力和时间
- 所有内容必须围绕用户的原始想法`;

  return {
    system,
    user: `用户想法：${facts.originalIdea}\n初步分析：${JSON.stringify(facts.ideaDeconstruction)}\n市场分析：${JSON.stringify(facts.marketReality)}\n差异化：${JSON.stringify(facts.differentiation)}\nMVP：${JSON.stringify(facts.mvp)}`,
  };
}

export function getFinalReportPrompt(facts: CollectedFacts): { system: string; user: string } {
  const system = `${baseSystemPrompt}

## 任务：给出最终建议

## 输出格式
{
  "analysis": "总结性分析，3-5句话，围绕用户想法",
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

## 关键要求
- 建议要现实，不要画大饼
- whereToStart要具体到第一步做什么
- risks要具体
- 所有内容必须围绕用户的原始想法`;

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
