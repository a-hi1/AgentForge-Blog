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
  businessModel?: string;
  coreUsers?: string[];
  technicalBoundaries?: string[];
}

const SYSTEM_PROMPT = `你是一位资深的产品技术顾问，擅长从模糊的产品描述中推断出完整的项目定义。

你的核心能力：
1. 识别复合型项目（一个项目可能同时属于多个类型）
2. 推断隐藏需求（用户没说但大概率需要的功能）
3. 评估技术复杂度（考虑并发、数据量、集成难度等）
4. 识别技术风险（第三方面试、数据安全、性能瓶颈等）

你必须以 JSON 格式输出，不要输出任何其他内容。

输出格式：
{
  "primaryType": "主要类型标识（英文snake_case）",
  "primaryTypeLabel": "主要类型中文名",
  "secondaryTypes": ["次要类型1", "次要类型2"],
  "domainFeatures": ["领域特征1", "领域特征2"],
  "complexity": "low|medium|high",
  "confidence": 0-100,
  "constraints": ["技术约束1", "技术约束2"],
  "hiddenRequirements": ["隐藏需求1", "隐藏需求2"],
  "risks": ["技术风险1", "技术风险2"],
  "recommendedStack": ["技术1", "技术2"],
  "estimatedPhases": 5,
  "briefAnalysis": "50字以内的项目概要分析",
  "businessModel": "商业模式描述（如 SaaS 订阅、广告、交易抽成等）",
  "coreUsers": ["核心用户群1", "核心用户群2"],
  "technicalBoundaries": ["技术边界1", "技术边界2"]
}

类型标识参考（不限于此，可以自由组合）：
saas, blog_cms, ecommerce, admin_system, ai_tool, social_platform, data_analytics, content_community, marketplace, education, health_tech, fintech, iot_platform, devtool, hybrid_marketplace

注意：
- 如果项目明显是复合型的，primaryType 应该是如 hybrid_marketplace 这样的组合标识
- secondaryTypes 列出所有相关类型
- confidence 表示你对分析结果的确信度（0-100），越模糊的需求 confidence 越低
- hiddenRequirements 列出用户没提到但大概率需要的功能
- risks 列出可能遇到的技术和业务风险`;

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

function buildUserPrompt(input: string): string {
  return `请深度分析以下产品想法，推断项目类型、隐藏需求、技术风险等：

「${input}」

要求：
1. 识别是否为复合型项目（多个类型组合）
2. 推断用户没有明说但大概率需要的功能
3. 评估技术复杂度（考虑数据量、并发、集成等因素）
4. 识别可能的技术和业务风险
5. 推荐最适合的技术栈

请严格按 JSON 格式输出。`;
}

export async function reasonProject(input: string): Promise<ProjectReasoning> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return reasonProjectLocal(input);
  }

  try {
    const userPrompt = buildUserPrompt(input);
    const raw = await callLLM(SYSTEM_PROMPT, userPrompt);
    const parsed = extractJSON(raw);

    if (!parsed) {
      console.warn('[Reasoner] LLM 输出解析失败，回退到本地推理');
      return reasonProjectLocal(input);
    }

    return {
      primaryType: String(parsed.primaryType || 'general'),
      primaryTypeLabel: String(parsed.primaryTypeLabel || '通用项目'),
      secondaryTypes: Array.isArray(parsed.secondaryTypes) ? parsed.secondaryTypes.map(String) : [],
      domainFeatures: Array.isArray(parsed.domainFeatures) ? parsed.domainFeatures.map(String) : [],
      complexity: (['low', 'medium', 'high'].includes(parsed.complexity as string) ? parsed.complexity : 'medium') as Complexity,
      confidence: typeof parsed.confidence === 'number' ? Math.min(100, Math.max(0, parsed.confidence)) : 70,
      constraints: Array.isArray(parsed.constraints) ? parsed.constraints.map(String) : [],
      hiddenRequirements: Array.isArray(parsed.hiddenRequirements) ? parsed.hiddenRequirements.map(String) : [],
      risks: Array.isArray(parsed.risks) ? parsed.risks.map(String) : [],
      recommendedStack: Array.isArray(parsed.recommendedStack) ? parsed.recommendedStack.map(String) : ['Next.js 14', 'TypeScript', 'PostgreSQL', 'Tailwind CSS'],
      estimatedPhases: typeof parsed.estimatedPhases === 'number' ? parsed.estimatedPhases : 6,
      rawAnalysis: String(parsed.briefAnalysis || ''),
      businessModel: parsed.businessModel ? String(parsed.businessModel) : undefined,
      coreUsers: Array.isArray(parsed.coreUsers) ? parsed.coreUsers.map(String) : undefined,
      technicalBoundaries: Array.isArray(parsed.technicalBoundaries) ? parsed.technicalBoundaries.map(String) : undefined,
    };
  } catch (error) {
    console.warn('[Reasoner] LLM 调用失败，回退到本地推理:', error);
    return reasonProjectLocal(input);
  }
}

function reasonProjectLocal(input: string): ProjectReasoning {
  const lower = input.toLowerCase();

  const typeScores: Record<string, number> = {};
  const keywordMap: Record<string, string[]> = {
    saas: ['saas', '订阅', '会员', '多租户', 'tenant', '计费', '套餐', 'dashboard'],
    blog_cms: ['博客', 'blog', 'cms', '内容管理', '文章', 'markdown', '编辑器', '写作'],
    ecommerce: ['电商', '商城', '购物车', '商品', '订单', '支付', '库存', '购买', '交易'],
    admin_system: ['管理', 'admin', '后台', 'crm', 'erp', '审批', '权限', 'oa'],
    ai_tool: ['ai', 'chatbot', '智能', '对话', '生成', '模型', 'rag', '知识库', 'agent'],
    social_platform: ['社交', '聊天', '朋友圈', '关注', '粉丝', '动态', '消息', '私信'],
    data_analytics: ['数据', '分析', '报表', '图表', 'dashboard', '统计', '可视化', '监控'],
    content_community: ['社区', '论坛', '问答', '评论', '点赞', '收藏', '标签', '二手', '兴趣'],
    marketplace: ['交易', '市场', '买卖', '卖家', '买家', '平台'],
    education: ['教育', '课程', '学习', '考试', '作业', '校园'],
  };

  for (const [type, keywords] of Object.entries(keywordMap)) {
    const matches = keywords.filter(kw => lower.includes(kw));
    if (matches.length > 0) {
      typeScores[type] = matches.length;
    }
  }

  const sortedTypes = Object.entries(typeScores).sort((a, b) => b[1] - a[1]);
  const isHybrid = sortedTypes.length >= 2 && sortedTypes[1][1] >= 1;

  const typeLabels: Record<string, string> = {
    saas: 'SaaS 平台',
    blog_cms: '博客/CMS',
    ecommerce: '电商平台',
    admin_system: '管理系统',
    ai_tool: 'AI 工具',
    social_platform: '社交平台',
    data_analytics: '数据分析平台',
    content_community: '内容社区',
    marketplace: '交易平台',
    education: '教育平台',
  };

  const primaryType = isHybrid
    ? `hybrid_${sortedTypes.slice(0, 2).map(([t]) => t).join('_')}`
    : sortedTypes[0]?.[0] || 'general';

  const primaryLabel = isHybrid
    ? sortedTypes.slice(0, 2).map(([t]) => typeLabels[t] || t).join(' + ')
    : typeLabels[sortedTypes[0]?.[0]] || '通用项目';

  return {
    primaryType,
    primaryTypeLabel: primaryLabel,
    secondaryTypes: sortedTypes.slice(isHybrid ? 0 : 1).map(([t]) => t),
    domainFeatures: sortedTypes.slice(0, 3).flatMap(([t]) => (keywordMap[t] || []).filter(kw => lower.includes(kw))),
    complexity: estimateComplexity(input),
    confidence: isHybrid ? 55 : 65,
    constraints: [],
    hiddenRequirements: inferHiddenRequirements(lower, sortedTypes.map(([t]) => t)),
    risks: inferRisks(lower, sortedTypes.map(([t]) => t)),
    recommendedStack: ['Next.js 14', 'TypeScript', 'PostgreSQL', 'Prisma', 'Tailwind CSS'],
    estimatedPhases: isHybrid ? 8 : 6,
    rawAnalysis: `本地推理：识别为${isHybrid ? '复合型' : '单一型'}项目，${sortedTypes.length} 个匹配类型`,
    businessModel: inferBusinessModel(lower, sortedTypes.map(([t]) => t)),
    coreUsers: inferCoreUsers(lower, sortedTypes.map(([t]) => t)),
    technicalBoundaries: inferTechnicalBoundaries(lower, sortedTypes.map(([t]) => t)),
  };
}

function estimateComplexity(input: string): Complexity {
  let score = 0;
  const highSignals = ['微服务', '分布式', '集群', '高并发', '企业级', '多租户', '实时', '支付', '大规模', '社交', '交易'];
  const lowSignals = ['简单', '静态', '个人', '单页', '展示', 'demo', '原型', 'mvp'];
  highSignals.forEach(s => { if (input.includes(s)) score += 2; });
  lowSignals.forEach(s => { if (input.includes(s)) score -= 2; });
  if (score >= 2) return 'high';
  if (score <= -1) return 'low';
  return 'medium';
}

function inferHiddenRequirements(lower: string, types: string[]): string[] {
  const reqs: string[] = [];
  if (types.includes('ecommerce') || types.includes('marketplace') || lower.includes('交易') || lower.includes('支付')) {
    reqs.push('支付系统集成', '订单状态机', '退款流程');
  }
  if (types.includes('social_platform') || types.includes('content_community') || lower.includes('社交')) {
    reqs.push('消息通知系统', '内容审核机制', '反垃圾策略');
  }
  if (types.includes('education') || lower.includes('校园')) {
    reqs.push('权限角色体系（学生/教师/管理员）', '学期/班级组织结构');
  }
  if (types.includes('saas') || types.includes('admin_system')) {
    reqs.push('RBAC 权限管理', '操作审计日志', '数据导出功能');
  }
  if (lower.includes('二手') || lower.includes('交易') || lower.includes('买卖')) {
    reqs.push('用户信用体系', '争议处理机制', '物品状态管理');
  }
  if (reqs.length === 0) {
    reqs.push('用户认证与授权', '数据备份策略');
  }
  return reqs;
}

function inferRisks(lower: string, types: string[]): string[] {
  const risks: string[] = [];
  if (lower.includes('支付') || lower.includes('交易')) {
    risks.push('支付安全合规风险', '资金流对账复杂度');
  }
  if (types.includes('social_platform') || types.includes('content_community')) {
    risks.push('内容安全审核压力', '高并发下消息推送性能');
  }
  if (lower.includes('ai') || lower.includes('智能')) {
    risks.push('AI 输出质量不可控', 'API 调用成本控制');
  }
  if (types.includes('education') || lower.includes('校园')) {
    risks.push('用户增长后的并发压力', '数据隐私保护（学生信息）');
  }
  if (risks.length === 0) {
    risks.push('需求变更导致的架构调整');
  }
  return risks;
}

function inferBusinessModel(lower: string, types: string[]): string {
  if (types.includes('saas')) return 'SaaS 订阅制（按月/年收费，分层套餐）';
  if (types.includes('ecommerce')) return '电商平台（商品交易抽成 + 广告位）';
  if (types.includes('marketplace')) return '双边市场（交易撮合抽成 + 增值服务）';
  if (types.includes('education')) return '教育平台（课程付费 + 会员订阅）';
  if (types.includes('ai_tool')) return 'AI 工具（按调用量计费 / 免费增值）';
  if (lower.includes('二手') || lower.includes('交易')) return 'C2C 交易（交易抽成 + 置顶推广）';
  if (types.includes('content_community')) return '内容社区（广告 + 会员 + 打赏）';
  if (types.includes('admin_system')) return '内部工具（降本增效，无直接营收）';
  return '待定（需进一步分析用户增长与变现路径）';
}

function inferCoreUsers(lower: string, types: string[]): string[] {
  const users: string[] = [];
  if (types.includes('education') || lower.includes('校园') || lower.includes('学生')) {
    users.push('学生', '教师/导师', '教务管理员');
  }
  if (types.includes('ecommerce') || types.includes('marketplace')) {
    users.push('买家/消费者', '卖家/商家', '平台运营');
  }
  if (types.includes('saas') || types.includes('admin_system')) {
    users.push('企业管理员', '普通员工', '决策层');
  }
  if (types.includes('social_platform') || types.includes('content_community')) {
    users.push('内容创作者', '普通用户', '社区管理员');
  }
  if (types.includes('ai_tool')) {
    users.push('开发者', '产品经理', '终端用户');
  }
  if (lower.includes('二手')) {
    users.push('卖家（发布闲置）', '买家（浏览购买）', '平台管理员');
  }
  if (users.length === 0) {
    users.push('终端用户', '管理员');
  }
  return Array.from(new Set(users));
}

function inferTechnicalBoundaries(lower: string, types: string[]): string[] {
  const boundaries: string[] = [];
  if (lower.includes('支付') || types.includes('ecommerce') || types.includes('marketplace')) {
    boundaries.push('支付系统需对接第三方（支付宝/微信支付），涉及资质审核');
  }
  if (lower.includes('实时') || lower.includes('聊天') || types.includes('social_platform')) {
    boundaries.push('实时通信需 WebSocket 支持，需考虑连接管理与消息持久化');
  }
  if (lower.includes('ai') || types.includes('ai_tool')) {
    boundaries.push('AI 能力依赖外部 API，需处理限流、超时与降级策略');
  }
  if (lower.includes('地图') || lower.includes('定位')) {
    boundaries.push('地理位置服务需对接第三方地图 API');
  }
  if (types.includes('education') || lower.includes('视频')) {
    boundaries.push('视频/大文件存储需对象存储服务（如 S3/OSS）');
  }
  if (boundaries.length === 0) {
    boundaries.push('标准 Web 应用架构，无特殊技术边界');
  }
  return boundaries;
}
