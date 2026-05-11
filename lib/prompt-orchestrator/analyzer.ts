export type ProductType =
  | 'saas'
  | 'blog_cms'
  | 'ecommerce'
  | 'admin_system'
  | 'ai_tool'
  | 'social_platform'
  | 'data_analytics'
  | 'content_community'
  | 'general';

export type Complexity = 'low' | 'medium' | 'high' | 'very-high';

export interface AnalysisResult {
  productType: ProductType;
  productTypeLabel: string;
  complexity: Complexity;
  recommendedStack: string[];
  estimatedPhases: number;
  keywords: string[];
  description: string;
}

interface ProductPattern {
  type: ProductType;
  label: string;
  keywords: string[];
  defaultStack: string[];
  basePhases: number;
  description: string;
}

const PRODUCT_PATTERNS: ProductPattern[] = [
  {
    type: 'saas',
    label: 'SaaS 平台',
    keywords: ['saas', '订阅', '会员', '多租户', 'tenant', '计费', 'billing', '套餐', '后台管理面板', 'dashboard'],
    defaultStack: ['Next.js 14', 'TypeScript', 'PostgreSQL', 'Prisma', 'Stripe', 'NextAuth.js', 'Tailwind CSS'],
    basePhases: 7,
    description: '多租户 SaaS 应用，含用户认证、订阅计费、仪表板等',
  },
  {
    type: 'blog_cms',
    label: '博客 / CMS',
    keywords: ['博客', 'blog', 'cms', '内容管理', '文章', 'markdown', '编辑器', '发布', 'wordpress', '写作'],
    defaultStack: ['Next.js 14', 'TypeScript', 'MDX', 'PostgreSQL', 'Tailwind CSS'],
    basePhases: 5,
    description: '内容管理系统或博客平台，支持富文本编辑和内容发布',
  },
  {
    type: 'ecommerce',
    label: '电商平台',
    keywords: ['电商', '商城', '购物车', '商品', '订单', '支付', '库存', '购买', '交易', '店铺'],
    defaultStack: ['Next.js 14', 'TypeScript', 'PostgreSQL', 'Prisma', 'Stripe', 'Redis', 'Tailwind CSS'],
    basePhases: 7,
    description: '电商系统，含商品管理、购物车、订单、支付全流程',
  },
  {
    type: 'admin_system',
    label: '管理系统',
    keywords: ['管理', 'admin', '后台', 'crm', 'erp', '审批', '权限', '角色', '员工', 'oa', '办公'],
    defaultStack: ['Next.js 14', 'TypeScript', 'PostgreSQL', 'Prisma', 'RBAC', 'Tailwind CSS'],
    basePhases: 6,
    description: '企业管理系统，含 RBAC 权限、工作流、数据报表',
  },
  {
    type: 'ai_tool',
    label: 'AI 工具',
    keywords: ['ai', 'chatbot', '智能', '对话', '生成', '模型', 'prompt', 'rag', '知识库', 'agent'],
    defaultStack: ['Next.js 14', 'TypeScript', 'OpenAI API', 'LangChain', 'Pinecone', 'PostgreSQL', 'Tailwind CSS'],
    basePhases: 6,
    description: 'AI 驱动的工具或应用，含 LLM 集成、向量检索等',
  },
  {
    type: 'social_platform',
    label: '社交平台',
    keywords: ['社交', '聊天', '朋友圈', '关注', '粉丝', '动态', '消息', '私信', '社区', '即时通讯'],
    defaultStack: ['Next.js 14', 'TypeScript', 'PostgreSQL', 'WebSocket', 'Redis', 'Tailwind CSS'],
    basePhases: 7,
    description: '社交或即时通讯平台，含实时消息、用户关系等',
  },
  {
    type: 'data_analytics',
    label: '数据分析平台',
    keywords: ['数据', '分析', '报表', '图表', 'dashboard', '统计', '可视化', '监控', 'bi', 'etl'],
    defaultStack: ['Next.js 14', 'TypeScript', 'PostgreSQL', 'D3.js / Recharts', 'InfluxDB', 'Tailwind CSS'],
    basePhases: 6,
    description: '数据分析与可视化平台，含实时仪表板、报表导出',
  },
  {
    type: 'content_community',
    label: '内容社区',
    keywords: ['社区', '论坛', '问答', '评论', '点赞', '收藏', '标签', '分类', '排行榜', 'discuz', '贴吧', '二手', '交易'],
    defaultStack: ['Next.js 14', 'TypeScript', 'PostgreSQL', 'Prisma', 'Redis', 'Tailwind CSS'],
    basePhases: 6,
    description: '内容社区平台，含帖子、评论、互动、标签系统',
  },
];

function matchProductType(input: string): { pattern: ProductPattern; score: number }[] {
  const lower = input.toLowerCase();
  return PRODUCT_PATTERNS.map(pattern => {
    const matched = pattern.keywords.filter(kw => lower.includes(kw));
    return { pattern, score: matched.length };
  }).filter(r => r.score > 0).sort((a, b) => b.score - a.score);
}

function estimateComplexity(input: string, productType: ProductType): Complexity {
  const lower = input.toLowerCase();
  let score = 0;
  const highSignals = ['微服务', '分布式', '集群', '高并发', '企业级', '多租户', '实时', '支付', '大规模', '全栈'];
  const lowSignals = ['简单', '静态', '个人', '单页', '展示', 'demo', '原型', 'mvp'];
  highSignals.forEach(s => { if (lower.includes(s)) score += 2; });
  lowSignals.forEach(s => { if (lower.includes(s)) score -= 2; });
  if (productType === 'saas' || productType === 'ecommerce' || productType === 'social_platform') score += 1;
  if (productType === 'blog_cms' || productType === 'content_community') score -= 1;
  if (score >= 2) return 'high';
  if (score <= -1) return 'low';
  return 'medium';
}

export function analyzeProduct(input: string): AnalysisResult {
  if (!input.trim()) {
    return {
      productType: 'general',
      productTypeLabel: '通用项目',
      complexity: 'medium',
      recommendedStack: ['Next.js 14', 'TypeScript', 'PostgreSQL', 'Tailwind CSS'],
      estimatedPhases: 5,
      keywords: [],
      description: '自定义软件项目',
    };
  }

  const matches = matchProductType(input);
  const best = matches.length > 0 ? matches[0] : null;

  if (best && best.score >= 1) {
    const pattern = best.pattern;
    const complexity = estimateComplexity(input, pattern.type);
    const phaseBoost = complexity === 'high' ? 2 : complexity === 'low' ? -1 : 0;

    return {
      productType: pattern.type,
      productTypeLabel: pattern.label,
      complexity,
      recommendedStack: pattern.defaultStack,
      estimatedPhases: Math.max(3, pattern.basePhases + phaseBoost),
      keywords: pattern.keywords.filter(kw => input.toLowerCase().includes(kw)),
      description: pattern.description,
    };
  }

  const complexity = estimateComplexity(input, 'general');
  return {
    productType: 'general',
    productTypeLabel: '通用项目',
    complexity,
    recommendedStack: ['Next.js 14', 'TypeScript', 'PostgreSQL', 'Tailwind CSS'],
    estimatedPhases: complexity === 'high' ? 7 : complexity === 'low' ? 4 : 5,
    keywords: [],
    description: '自定义软件项目',
  };
}
