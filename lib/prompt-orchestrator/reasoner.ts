import type { Complexity } from './analyzer';

export interface ProjectReasoning {
  primaryType: string;
  primaryTypeLabel: string;
  secondaryTypes: string[];
  domainFeatures: string[];
  complexity: Complexity;
  confidence: number;
  constraints: string[];
  hiddenRequirements: string[];
  risks: string[];
  recommendedStack: string[];
  estimatedPhases: number;
  rawAnalysis: string;
  businessGoal: string;
  coreUsers: string[];
  shortestValueLoop: string;
  technicalBoundaries: string[];
  implicitRisks: string[];
  projectDifferentiation: string;
}

const SYSTEM_PROMPT = `你是一位资深的产品技术顾问。你的任务不是分类项目，而是深度推理项目的本质意图。

核心推理维度：

1. **商业目标** — 这个产品为什么存在？解决谁的什么问题？不分析就无法给出好方案。
2. **核心用户** — 谁会高频使用？不是泛泛的"用户"，而是具体的使用场景和频率。
3. **最短价值闭环** — 用户第一次获得价值的路径是什么？从打开到获得价值的最小步骤。
4. **技术约束** — 性能、成本、扩展性的真实约束，不是泛泛的"需要高并发"。
5. **非显性风险** — 冷启动、数据一致性、权限边界、合规风险——用户不会主动提但会踩的坑。

差异化要求：
- 同类型项目必须体现明显差异。"校园二手交易"和"个人知识博客"不能生成相似方案。
- 每个项目的推理结果必须反映其独特性，禁止使用通用模板化描述。

输出格式（严格 JSON）：
{
  "primaryType": "类型标识（snake_case，可自由组合）",
  "primaryTypeLabel": "类型中文名",
  "secondaryTypes": ["次要类型"],
  "domainFeatures": ["领域特征1", "领域特征2"],
  "complexity": "low|medium|high|very-high",
  "confidence": 0-100,
  "constraints": ["技术约束"],
  "hiddenRequirements": ["隐藏需求"],
  "risks": ["风险"],
  "recommendedStack": ["技术栈"],
  "estimatedPhases": 数字,
  "briefAnalysis": "50字以内概要",
  "businessGoal": "这个产品为什么存在，一句话说明商业目标",
  "coreUsers": ["核心用户群及使用场景"],
  "shortestValueLoop": "用户从打开到获得价值的最短路径，用步骤描述",
  "technicalBoundaries": ["技术边界和依赖"],
  "implicitRisks": ["非显性风险：冷启动/数据一致性/权限边界等"],
  "projectDifferentiation": "这个项目区别于同类项目的核心差异点"
}

类型标识参考（不限于此）：
saas, blog_cms, ecommerce, admin_system, ai_tool, social_platform, data_analytics, content_community, marketplace, education, health_tech, fintech, iot_platform, devtool`;

function getLLMConfig() {
  return {
    apiKey: process.env.OPENAI_API_KEY || '',
    baseUrl: process.env.OPENAI_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4',
    model: process.env.OPENAI_MODEL || 'glm-4-flash',
  };
}

async function callLLM(systemPrompt: string, userPrompt: string): Promise<string> {
  const { apiKey, baseUrl, model } = getLLMConfig();

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY 未配置');
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    throw new Error(`LLM API 调用失败: ${response.status}`);
  }

  const result = await response.json();
  return result.choices?.[0]?.message?.content || '';
}

function extractJSON(text: string): Record<string, unknown> | null {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
}

function buildUserPrompt(input: string, seed: string): string {
  return `请深度推理以下产品项目的本质意图（推理种子: ${seed}，确保输出独特性）：

「${input}」

不要做简单的分类匹配。请推理：

1. 商业目标：这个产品为什么存在？解决什么真实问题？
2. 核心用户：谁会高频使用？具体使用场景是什么？
3. 最短价值闭环：用户从打开产品到获得价值的最短路径是什么？列出具体步骤。
4. 技术约束：这个项目的真正技术限制是什么？（不是泛泛的"高并发"）
5. 非显性风险：用户不会主动提但一定会踩的坑是什么？

差异化要求：即使是同类项目，推理结果也必须体现这个项目的独特性。

请严格按 JSON 格式输出。`;
}

export async function reasonProject(input: string): Promise<ProjectReasoning> {
  const apiKey = process.env.OPENAI_API_KEY;
  const seed = `${input.slice(0, 20)}_${Date.now().toString(36)}`;

  if (!apiKey) {
    return reasonProjectLocal(input, seed);
  }

  try {
    const userPrompt = buildUserPrompt(input, seed);
    const raw = await callLLM(SYSTEM_PROMPT, userPrompt);
    const parsed = extractJSON(raw);

    if (!parsed) {
      console.warn('[Reasoner] LLM 输出解析失败，回退到本地推理');
      return reasonProjectLocal(input, seed);
    }

    return {
      primaryType: String(parsed.primaryType || 'general'),
      primaryTypeLabel: String(parsed.primaryTypeLabel || '通用项目'),
      secondaryTypes: Array.isArray(parsed.secondaryTypes) ? parsed.secondaryTypes.map(String) : [],
      domainFeatures: Array.isArray(parsed.domainFeatures) ? parsed.domainFeatures.map(String) : [],
      complexity: (['low', 'medium', 'high', 'very-high'].includes(parsed.complexity as string) ? parsed.complexity : 'medium') as Complexity,
      confidence: typeof parsed.confidence === 'number' ? Math.min(100, Math.max(0, parsed.confidence)) : 70,
      constraints: Array.isArray(parsed.constraints) ? parsed.constraints.map(String) : [],
      hiddenRequirements: Array.isArray(parsed.hiddenRequirements) ? parsed.hiddenRequirements.map(String) : [],
      risks: Array.isArray(parsed.risks) ? parsed.risks.map(String) : [],
      recommendedStack: Array.isArray(parsed.recommendedStack) ? parsed.recommendedStack.map(String) : ['Next.js 14', 'TypeScript', 'PostgreSQL', 'Tailwind CSS'],
      estimatedPhases: typeof parsed.estimatedPhases === 'number' ? parsed.estimatedPhases : 6,
      rawAnalysis: String(parsed.briefAnalysis || ''),
      businessGoal: String(parsed.businessGoal || ''),
      coreUsers: Array.isArray(parsed.coreUsers) ? parsed.coreUsers.map(String) : [],
      shortestValueLoop: String(parsed.shortestValueLoop || ''),
      technicalBoundaries: Array.isArray(parsed.technicalBoundaries) ? parsed.technicalBoundaries.map(String) : [],
      implicitRisks: Array.isArray(parsed.implicitRisks) ? parsed.implicitRisks.map(String) : [],
      projectDifferentiation: String(parsed.projectDifferentiation || ''),
    };
  } catch (error) {
    console.warn('[Reasoner] LLM 调用失败，回退到本地推理:', error);
    return reasonProjectLocal(input, seed);
  }
}

function reasonProjectLocal(input: string, seed: string): ProjectReasoning {
  const lower = input.toLowerCase();
  const concepts = extractConcepts(lower);

  return {
    primaryType: concepts.primaryType,
    primaryTypeLabel: concepts.primaryLabel,
    secondaryTypes: concepts.secondaryTypes,
    domainFeatures: concepts.domainFeatures,
    complexity: estimateComplexity(input),
    confidence: 60,
    constraints: [],
    hiddenRequirements: inferHiddenRequirements(lower),
    risks: inferRisks(lower),
    recommendedStack: ['Next.js 14', 'TypeScript', 'PostgreSQL', 'Prisma', 'Tailwind CSS'],
    estimatedPhases: concepts.isHybrid ? 8 : 6,
    rawAnalysis: `本地推理（seed: ${seed}）：${concepts.summary}`,
    businessGoal: inferBusinessGoal(lower, concepts),
    coreUsers: inferCoreUsers(lower),
    shortestValueLoop: inferShortestValueLoop(lower, concepts),
    technicalBoundaries: inferTechnicalBoundaries(lower),
    implicitRisks: inferImplicitRisks(lower),
    projectDifferentiation: inferDifferentiation(lower, seed),
  };
}

interface ConceptExtraction {
  primaryType: string;
  primaryLabel: string;
  secondaryTypes: string[];
  domainFeatures: string[];
  isHybrid: boolean;
  summary: string;
}

function extractConcepts(lower: string): ConceptExtraction {
  const signals: Array<{ type: string; label: string; keywords: string[]; weight: number }> = [
    { type: 'marketplace', label: '交易平台', keywords: ['交易', '买卖', '卖家', '买家', '市场', '二手'], weight: 0 },
    { type: 'ecommerce', label: '电商平台', keywords: ['电商', '商城', '购物车', '商品', '订单', '支付', '库存', '购买'], weight: 0 },
    { type: 'education', label: '教育平台', keywords: ['教育', '课程', '学习', '考试', '作业', '校园', '学生'], weight: 0 },
    { type: 'social_platform', label: '社交平台', keywords: ['社交', '聊天', '朋友圈', '关注', '粉丝', '动态', '消息', '私信'], weight: 0 },
    { type: 'content_community', label: '内容社区', keywords: ['社区', '论坛', '问答', '评论', '点赞', '收藏', '标签', '兴趣'], weight: 0 },
    { type: 'ai_tool', label: 'AI 工具', keywords: ['ai', 'chatbot', '智能', '对话', '生成', '模型', 'rag', '知识库', 'agent'], weight: 0 },
    { type: 'blog_cms', label: '博客/CMS', keywords: ['博客', 'blog', 'cms', '内容管理', '文章', 'markdown', '编辑器', '写作'], weight: 0 },
    { type: 'saas', label: 'SaaS 平台', keywords: ['saas', '订阅', '会员', '多租户', 'tenant', '计费', '套餐'], weight: 0 },
    { type: 'admin_system', label: '管理系统', keywords: ['管理', 'admin', '后台', 'crm', 'erp', '审批', '权限', 'oa'], weight: 0 },
    { type: 'data_analytics', label: '数据分析', keywords: ['数据', '分析', '报表', '图表', '统计', '可视化', '监控'], weight: 0 },
  ];

  for (const signal of signals) {
    const matches = signal.keywords.filter(kw => lower.includes(kw));
    signal.weight = matches.length;
    if (matches.length > 0) {
      signal.type = signal.type;
    }
  }

  const ranked = signals.filter(s => s.weight > 0).sort((a, b) => b.weight - a.weight);
  const primary = ranked[0];
  const secondary = ranked.slice(1, 3);
  const isHybrid = ranked.length >= 2 && ranked[1].weight >= 2;

  const matchedKeywords = ranked.slice(0, 3).flatMap(s =>
    s.keywords.filter(kw => lower.includes(kw))
  );

  return {
    primaryType: isHybrid && secondary.length > 0
      ? `hybrid_${primary.type}_${secondary[0].type}`
      : primary?.type || 'general',
    primaryLabel: isHybrid && secondary.length > 0
      ? `${primary.label} + ${secondary[0].label}`
      : primary?.label || '通用项目',
    secondaryTypes: secondary.map(s => s.type),
    domainFeatures: Array.from(new Set(matchedKeywords)).slice(0, 6),
    isHybrid,
    summary: `识别为${isHybrid ? '复合型' : '单一型'}项目，匹配 ${ranked.length} 个类型信号`,
  };
}

function estimateComplexity(input: string): Complexity {
  let score = 0;
  const veryHighSignals = ['微服务', '分布式', '集群', '千万', '亿级', '全球'];
  const highSignals = ['高并发', '企业级', '多租户', '实时', '支付', '大规模', '社交', '交易', '视频', '流媒体'];
  const lowSignals = ['简单', '静态', '个人', '单页', '展示', 'demo', '原型', 'mvp'];
  veryHighSignals.forEach(s => { if (input.includes(s)) score += 3; });
  highSignals.forEach(s => { if (input.includes(s)) score += 2; });
  lowSignals.forEach(s => { if (input.includes(s)) score -= 2; });
  if (score >= 4) return 'very-high';
  if (score >= 2) return 'high';
  if (score <= -1) return 'low';
  return 'medium';
}

function inferHiddenRequirements(lower: string): string[] {
  const reqs: string[] = [];
  if (lower.includes('交易') || lower.includes('支付') || lower.includes('买卖')) {
    reqs.push('支付状态机', '退款流程', '订单超时处理');
  }
  if (lower.includes('社交') || lower.includes('聊天') || lower.includes('社区')) {
    reqs.push('消息通知系统', '内容审核', '反垃圾策略');
  }
  if (lower.includes('校园') || lower.includes('学生') || lower.includes('教育')) {
    reqs.push('权限角色体系', '学期/班级组织结构');
  }
  if (lower.includes('二手') || lower.includes('闲置')) {
    reqs.push('物品状态管理', '争议处理机制', '用户信用体系');
  }
  if (lower.includes('博客') || lower.includes('写作') || lower.includes('内容')) {
    reqs.push('SEO 元数据', '草稿自动保存', '内容版本管理');
  }
  if (lower.includes('ai') || lower.includes('智能') || lower.includes('agent')) {
    reqs.push('API 限流与降级', '对话上下文管理', '输出质量监控');
  }
  if (reqs.length === 0) {
    reqs.push('用户认证与授权', '数据备份策略');
  }
  return reqs;
}

function inferRisks(lower: string): string[] {
  const risks: string[] = [];
  if (lower.includes('支付') || lower.includes('交易')) {
    risks.push('支付安全合规', '资金流对账复杂度');
  }
  if (lower.includes('社交') || lower.includes('社区') || lower.includes('聊天')) {
    risks.push('内容安全审核压力', '高并发消息推送');
  }
  if (lower.includes('ai') || lower.includes('智能')) {
    risks.push('AI 输出质量不可控', 'API 调用成本失控');
  }
  if (lower.includes('校园') || lower.includes('学生')) {
    risks.push('冷启动期用户留存', '学生信息隐私保护');
  }
  if (risks.length === 0) {
    risks.push('需求变更导致的架构调整');
  }
  return risks;
}

function inferBusinessGoal(lower: string, concepts: ConceptExtraction): string {
  if (lower.includes('二手') || lower.includes('闲置')) return '撮合校园内闲置物品交易，降低交易摩擦，通过信任机制解决 C2C 交易痛点';
  if (lower.includes('博客') || lower.includes('写作')) return '帮助个人建立内容资产，通过 SEO 获取持续流量，实现内容变现';
  if (lower.includes('saas') || lower.includes('订阅')) return '提供可复用的软件服务，通过订阅制实现稳定营收';
  if (lower.includes('ai') || lower.includes('智能')) return '将 AI 能力产品化，降低使用门槛，通过 API 调用量变现';
  if (lower.includes('教育') || lower.includes('课程')) return '连接知识供给与学习需求，通过课程付费和认证体系变现';
  return `构建${concepts.primaryLabel}，满足目标用户的核心需求`;
}

function inferCoreUsers(lower: string): string[] {
  const users: string[] = [];
  if (lower.includes('校园') || lower.includes('学生') || lower.includes('教育')) {
    users.push('在校学生（高频发布/浏览）', '教职工（管理/监督）');
  }
  if (lower.includes('二手') || lower.includes('交易')) {
    users.push('卖家（发布闲置物品）', '买家（浏览购买）');
  }
  if (lower.includes('博客') || lower.includes('写作')) {
    users.push('内容创作者（写作发布）', '读者（阅读收藏）');
  }
  if (lower.includes('ai') || lower.includes('智能')) {
    users.push('开发者（API 集成）', '终端用户（对话交互）');
  }
  if (users.length === 0) {
    users.push('核心业务用户', '管理员');
  }
  return Array.from(new Set(users));
}

function inferShortestValueLoop(lower: string, concepts: ConceptExtraction): string {
  if (lower.includes('二手') || (lower.includes('交易') && lower.includes('校园'))) {
    return '打开首页 → 浏览附近物品 → 点击感兴趣的商品 → 查看详情 → 联系卖家 → 达成交易';
  }
  if (lower.includes('博客') || lower.includes('写作')) {
    return '进入编辑器 → 写作一篇内容 → 发布 → 生成可分享链接 → 读者通过链接访问';
  }
  if (lower.includes('ai') || lower.includes('智能') || lower.includes('agent')) {
    return '打开对话界面 → 输入问题 → 获得 AI 回答 → 复制使用';
  }
  if (lower.includes('社区') || lower.includes('论坛')) {
    return '注册 → 浏览热门内容 → 参与讨论 → 发布自己的内容 → 获得反馈';
  }
  return `注册登录 → 使用核心功能 → 获得价值反馈`;
}

function inferTechnicalBoundaries(lower: string): string[] {
  const boundaries: string[] = [];
  if (lower.includes('支付') || lower.includes('交易') || lower.includes('买卖')) {
    boundaries.push('支付系统需对接第三方（支付宝/微信），涉及资质审核');
  }
  if (lower.includes('实时') || lower.includes('聊天') || lower.includes('消息')) {
    boundaries.push('实时通信需 WebSocket，需考虑连接管理与消息持久化');
  }
  if (lower.includes('ai') || lower.includes('智能')) {
    boundaries.push('AI 能力依赖外部 API，需处理限流、超时与降级');
  }
  if (lower.includes('地图') || lower.includes('定位') || lower.includes('附近')) {
    boundaries.push('地理位置服务需对接地图 API');
  }
  if (boundaries.length === 0) {
    boundaries.push('标准 Web 应用架构，无特殊技术边界');
  }
  return boundaries;
}

function inferImplicitRisks(lower: string): string[] {
  const risks: string[] = [];
  if (lower.includes('二手') || lower.includes('交易') || lower.includes('买卖')) {
    risks.push('冷启动：初期无买卖双方，供需失衡', '数据一致性：并发购买时库存超卖', '权限边界：用户举报与纠纷仲裁流程');
  }
  if (lower.includes('社交') || lower.includes('社区') || lower.includes('聊天')) {
    risks.push('冷启动：新社区无内容，用户来了就走', '数据一致性：消息已读状态同步', '权限边界：群组管理员权限滥用');
  }
  if (lower.includes('博客') || lower.includes('写作') || lower.includes('内容')) {
    risks.push('冷启动：无内容时 SEO 无效', '数据一致性：草稿与发布版本冲突', '权限边界：多人协作编辑的权限控制');
  }
  if (lower.includes('ai') || lower.includes('智能')) {
    risks.push('冷启动：用户不知道问什么', '数据一致性：对话上下文丢失', '权限边界：API Key 泄露风险');
  }
  if (risks.length === 0) {
    risks.push('冷启动期用户获取成本高', '数据增长后的性能退化');
  }
  return risks;
}

function inferDifferentiation(lower: string, seed: string): string {
  const parts: string[] = [];
  if (lower.includes('校园')) parts.push('聚焦校园场景的信任机制（实名认证+地理位置）');
  if (lower.includes('二手')) parts.push('轻量化交易撮合，非全品类电商');
  if (lower.includes('博客')) parts.push('内容资产化导向，非纯展示型博客');
  if (lower.includes('ai')) parts.push('Agent 协作模式，非单轮对话');
  if (parts.length === 0) parts.push(`基于 seed ${seed} 的差异化推理结果`);
  return parts.join('；');
}
