import {
  DiscoveryPhase,
  CollectedFacts,
} from './types';

const baseSystemPrompt = `你是一位有经验的独立开发者和产品顾问。

## 重要要求：
1. 必须输出有效的 JSON
2. 只输出 JSON，不要其他文字
3. JSON 格式要严格正确
4. 不要用 Markdown 包装，直接输出

## 输出格式：
\`\`\`
{...}
\`\`\``;

export function getUserProfilePrompt(idea: string): { system: string; user: string } {
  const system = `${baseSystemPrompt}

## 任务：了解用户背景，提出4个问题

## 输出格式：
{
  "analysis": "简单的分析，不超过2句话",
  "questions": [
    {
      "id": "q1",
      "type": "single_choice",
      "text": "你的技术背景？",
      "options": [
        {"id": "frontend", "label": "前端开发"},
        {"id": "backend", "label": "后端开发"},
        {"id": "fullstack", "label": "全栈开发"},
        {"id": "beginner", "label": "没有编程经验"}
      ]
    },
    {
      "id": "q2",
      "type": "single_choice",
      "text": "每周能投入多少时间？",
      "options": [
        {"id": "weekend", "label": "只有周末（5小时）"},
        {"id": "parttime", "label": "部分时间（10-20小时）"},
        {"id": "fulltime", "label": "几乎全部时间（40小时）"}
      ]
    },
    {
      "id": "q3",
      "type": "single_choice",
      "text": "主要动机是什么？",
      "options": [
        {"id": "learn", "label": "学习新技术"},
        {"id": "side", "label": "做个副业"},
        {"id": "portfolio", "label": "简历项目"},
        {"id": "business", "label": "认真创业"}
      ]
    },
    {
      "id": "q4",
      "type": "single_choice",
      "text": "是独立开发吗？",
      "options": [
        {"id": "yes", "label": "是，自己一个人"},
        {"id": "team", "label": "有小团队"},
        {"id": "partners", "label": "有合伙人"}
      ]
    }
  ]
}`;

  return { system, user: `用户想法：${idea}` };
}

export function getMarketRealityPrompt(facts: CollectedFacts): { system: string; user: string } {
  const system = `${baseSystemPrompt}

## 任务：分析市场现实

## 输出格式：
{
  "analysis": "市场分析，不超过3句话",
  "marketReality": {
    "whyCrowded": "这个赛道为什么拥挤",
    "giants": ["主要竞争对手1", "主要竞争对手2"],
    "whyWontMigrate": "用户为什么不会迁移",
    "nicheOpportunities": ["机会1", "机会2"],
    "avoidAreas": ["别碰1", "别碰2"]
  }
}`;

  return {
    system,
    user: `用户想法：${facts.originalIdea}\n用户画像：${JSON.stringify(facts.userProfile)}`,
  };
}

export function getDifferentiationPrompt(facts: CollectedFacts): { system: string; user: string } {
  const system = `${baseSystemPrompt}

## 任务：分析差异化机会

## 输出格式：
{
  "analysis": "差异化分析，不超过3句话",
  "differentiation": {
    "entryPoint": "具体切入点",
    "easiestUserGroup": "最容易成功的用户群",
    "minimalDifferentiation": "最小差异化策略",
    "whyBigPlayersWontDoIt": "为什么大厂不做"
  },
  "question": {
    "id": "confirm_differentiation",
    "type": "confirmation",
    "text": "你觉得这个切入点站得住脚吗？"
  }
}`;

  return {
    system,
    user: `用户想法：${facts.originalIdea}\n用户画像：${JSON.stringify(facts.userProfile)}\n选择的方向：${JSON.stringify(facts.selectedDirection)}\n市场分析：${JSON.stringify(facts.marketReality)}`,
  };
}

export function getMVPShrinkPrompt(facts: CollectedFacts): { system: string; user: string } {
  const system = `${baseSystemPrompt}

## 任务：收缩到最小可行产品

## 输出格式：
{
  "analysis": "MVP分析，不超过3句话",
  "mvp": {
    "mustHave": ["核心功能1", "核心功能2", "核心功能3"],
    "mustNotDo": ["不做1", "不做2", "不做3"],
    "fastestValidation": "最快验证方式",
    "validationSteps": ["步骤1", "步骤2", "步骤3"]
  },
  "question": {
    "id": "confirm_mvp",
    "type": "confirmation",
    "text": "你觉得这个MVP范围合理吗？"
  }
}`;

  return {
    system,
    user: `用户想法：${facts.originalIdea}\n用户画像：${JSON.stringify(facts.userProfile)}\n选择的方向：${JSON.stringify(facts.selectedDirection)}\n市场分析：${JSON.stringify(facts.marketReality)}\n差异化：${JSON.stringify(facts.differentiation)}`,
  };
}

export function getDirectionAnalysisPrompt(facts: CollectedFacts): { system: string; user: string } {
  const system = `${baseSystemPrompt}

## 任务：给出3个产品方向

## 输出格式：
{
  "analysis": "方向分析，不超过3句话",
  "directions": [
    {
      "id": "d1",
      "name": "方向1名称",
      "whyFits": "为什么适合",
      "techFeasibility": "技术可行性",
      "riskLevel": "低/中/高",
      "competition": "竞争程度",
      "estimateCycle": "开发周期"
    },
    {
      "id": "d2",
      "name": "方向2名称",
      "whyFits": "为什么适合",
      "techFeasibility": "技术可行性",
      "riskLevel": "低/中/高",
      "competition": "竞争程度",
      "estimateCycle": "开发周期"
    },
    {
      "id": "d3",
      "name": "方向3名称",
      "whyFits": "为什么适合",
      "techFeasibility": "技术可行性",
      "riskLevel": "低/中/高",
      "competition": "竞争程度",
      "estimateCycle": "开发周期"
    }
  ],
  "question": {
    "id": "pick_direction",
    "type": "single_choice",
    "text": "你对哪个方向最感兴趣？",
    "options": [
      {"id": "d1", "label": "方向1名称", "description": "为什么适合"},
      {"id": "d2", "label": "方向2名称", "description": "为什么适合"},
      {"id": "d3", "label": "方向3名称", "description": "为什么适合"}
    ]
  }
}`;

  return {
    system,
    user: `用户想法：${facts.originalIdea}\n用户画像：${JSON.stringify(facts.userProfile)}`,
  };
}

export function getFinalReportPrompt(facts: CollectedFacts): { system: string; user: string } {
  const system = `${baseSystemPrompt}

## 任务：给出最终建议

## 输出格式：
{
  "analysis": "总结性分析",
  "report": {
    "title": "方向建议报告",
    "worthDoing": "值得做 / 不值得做 / 值得小规模验证",
    "reason": "为什么",
    "whereToStart": "从哪里开始",
    "minimalValidation": "最小验证路径",
    "summary": "一句话总结",
    "risks": "风险提示"
  }
}`;

  return {
    system,
    user: `用户想法：${facts.originalIdea}\n用户画像：${JSON.stringify(facts.userProfile)}\n选择的方向：${JSON.stringify(facts.selectedDirection)}\n市场分析：${JSON.stringify(facts.marketReality)}\n差异化：${JSON.stringify(facts.differentiation)}\nMVP：${JSON.stringify(facts.mvp)}`,
  };
}

export function getPhasePrompt(phase: DiscoveryPhase, facts: CollectedFacts): { system: string; user: string } {
  switch (phase) {
    case 'idea_deconstruction':
      return getUserProfilePrompt(facts.originalIdea);
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
