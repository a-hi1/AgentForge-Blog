import type { ProjectReasoning } from './reasoner';

export type PromptDepth = 'quick' | 'standard' | 'expert' | 'architect';

export interface DynamicPromptContext {
  userIdea: string;
  reasoning: ProjectReasoning;
  phaseIndex: number;
  totalPhases: number;
  phaseName: string;
  previousPhases: string[];
  depth: PromptDepth;
  clarificationContext?: string;
}

interface PhaseDefinition {
  templateId: string;
  name: string;
  category: string;
  description: string;
}

export interface CompiledPhase {
  index: number;
  id: string;
  name: string;
  category: string;
  description: string;
  prompt: string;
  score?: number;
}

const DEPTH_MODIFIERS: Record<PromptDepth, { rolePrefix: string; detailLevel: string; wordTarget: string }> = {
  quick: {
    rolePrefix: '你是一位经验丰富的开发者。',
    detailLevel: '只输出最关键的内容，跳过解释性文字。',
    wordTarget: '400-600 字',
  },
  standard: {
    rolePrefix: '你是一位高级全栈工程师。',
    detailLevel: '输出完整的实现方案，包含必要的代码示例。',
    wordTarget: '800-1200 字',
  },
  expert: {
    rolePrefix: '你是一位资深技术架构师，拥有 10 年以上大型项目经验。',
    detailLevel: '输出详细的技术方案，包含架构决策理由、性能考量、扩展性分析。',
    wordTarget: '1500-2500 字',
  },
  architect: {
    rolePrefix: '你是一位首席技术架构师，负责设计企业级系统。你的每一行输出都将直接指导开发团队执行。',
    detailLevel: '输出超细粒度的技术方案，包含：背景分析、技术决策论证、实现路径、代码骨架、验收清单、回退方案。',
    wordTarget: '2500-4000 字',
  },
};

function buildRoleBlock(ctx: DynamicPromptContext): string {
  const mod = DEPTH_MODIFIERS[ctx.depth];
  return `${mod.rolePrefix}

你正在为「${ctx.userIdea}」项目提供技术方案。
当前阶段：${ctx.phaseName}（Phase ${ctx.phaseIndex + 1} / ${ctx.totalPhases}）
输出粒度要求：${mod.detailLevel}
目标长度：${mod.wordTarget}`;
}

function buildContextBlock(ctx: DynamicPromptContext): string {
  const r = ctx.reasoning;
  const lines: string[] = [];

  lines.push(`【项目上下文】`);
  lines.push(`- 项目类型：${r.primaryTypeLabel}${r.secondaryTypes.length > 0 ? `（复合型：${r.secondaryTypes.join(' + ')}）` : ''}`);
  lines.push(`- 技术复杂度：${r.complexity}`);
  lines.push(`- 推荐技术栈：${r.recommendedStack.join(' → ')}`);

  if (r.domainFeatures.length > 0) {
    lines.push(`- 领域特征：${r.domainFeatures.slice(0, 5).join('、')}`);
  }

  if (r.rawAnalysis) {
    lines.push(`- 分析概要：${r.rawAnalysis}`);
  }

  if (ctx.clarificationContext) {
    lines.push('');
    lines.push(ctx.clarificationContext);
  }

  if (ctx.previousPhases.length > 0) {
    lines.push('');
    lines.push(`【已完成阶段】`);
    ctx.previousPhases.forEach((p, i) => {
      lines.push(`${i + 1}. ${p}`);
    });
  }

  return lines.join('\n');
}

function buildDomainBlock(ctx: DynamicPromptContext): string {
  const r = ctx.reasoning;
  const features = r.domainFeatures;
  if (features.length === 0) return '';

  return `【领域特定要求】
基于项目识别的领域特征，需要特别关注：
${features.map(f => `- ${f}`).join('\n')}`;
}

function buildConstraintBlock(ctx: DynamicPromptContext): string {
  const r = ctx.reasoning;
  const constraints: string[] = [
    'TypeScript 严格模式，禁止 any 类型',
    '组件采用函数式写法 + Hooks',
    '样式使用 Tailwind CSS，遵循响应式设计',
    'API 遵循 RESTful 规范',
    '所有用户输入必须做校验和清洗',
    '关键操作需记录日志',
  ];

  if (r.constraints.length > 0) {
    constraints.push(...r.constraints);
  }

  if (r.recommendedStack.length >= 2) {
    constraints.unshift(`使用 ${r.recommendedStack[0]} + ${r.recommendedStack[1]} 作为核心框架`);
  }

  if (ctx.depth === 'expert' || ctx.depth === 'architect') {
    constraints.push('每个模块必须有独立的错误处理');
    constraints.push('关键路径必须有降级方案');
    constraints.push('代码中使用中文注释说明业务逻辑');
  }

  return `【实现约束】
${constraints.map((c, i) => `${i + 1}. ${c}`).join('\n')}`;
}

function buildRiskBlock(ctx: DynamicPromptContext): string {
  const r = ctx.reasoning;
  if (r.risks.length === 0) return '';

  return `【风险提示】
以下风险已被识别，请在方案中给出应对策略：
${r.risks.map(risk => `- ⚠️ ${risk}`).join('\n')}`;
}

function buildHiddenRequirementsBlock(ctx: DynamicPromptContext): string {
  const r = ctx.reasoning;
  if (r.hiddenRequirements.length === 0) return '';

  return `【隐含需求】
以下功能虽未明确要求，但根据项目类型大概率需要：
${r.hiddenRequirements.map(req => `- 📋 ${req}`).join('\n')}`;
}

function buildAcceptanceBlock(criteria: string[], ctx: DynamicPromptContext): string {
  const base = criteria;
  if (ctx.depth === 'expert' || ctx.depth === 'architect') {
    base.push('方案包含性能评估和扩展性分析');
    base.push('已考虑并发场景和边界情况');
  }
  if (ctx.depth === 'architect') {
    base.push('包含回退方案（如果主方案失败）');
    base.push('包含监控和告警设计');
  }

  return `【验收标准】
${base.map((c, i) => `${i + 1}. ${c}`).join('\n')}`;
}

function buildPauseBlock(conditions: string[]): string {
  return `【暂停条件】
遇到以下情况请暂停并询问用户：
${conditions.map(c => `- ${c}`).join('\n')}`;
}

function buildArchitectExtras(ctx: DynamicPromptContext): string {
  if (ctx.depth !== 'architect') return '';

  return `【架构师模式额外要求】
请额外输出以下内容：

1. **技术决策论证**
   - 为什么选择这个方案而不是替代方案
   - 每个关键决策的 trade-off 分析

2. **实现路径**
   - 按依赖关系排序的实现步骤
   - 每步的预计工作量（人天）
   - 步骤间的依赖关系

3. **代码骨架**
   - 关键文件的代码结构（不需要完整实现，但要有骨架）
   - 核心函数的签名和注释

4. **回退方案**
   - 如果主方案遇到阻塞，备选的技术路线
   - 最小可行降级方案

5. **监控设计**
   - 需要监控的关键指标
   - 告警阈值建议`;
}

const PHASE_BUILDERS: Record<string, (ctx: DynamicPromptContext) => string> = {
  product_init: (ctx) => {
    const r = ctx.reasoning;
    return `${buildRoleBlock(ctx)}

【当前任务】
对以下产品想法进行深度需求分析和技术拆解。

【产品描述】
${ctx.userIdea}

${buildContextBlock(ctx)}

${buildDomainBlock(ctx)}

${buildHiddenRequirementsBlock(ctx)}

【请完成以下工作】
1. 明确产品的核心价值主张（一句话，必须具体而非泛化）
2. 列出 3-5 个核心功能模块，每个模块说明：
   - 解决什么用户问题
   - 技术实现难点
   - 与其他模块的依赖关系
3. 为每个模块编写 1-2 个 User Story（格式：作为[角色]，我需要[功能]，以便[价值]）
4. 明确 MVP 边界：哪些是必须的，哪些可以延后
5. 给出初步的数据实体列表（实体名 + 核心字段）

${buildRiskBlock(ctx)}

${buildAcceptanceBlock([
  '核心价值主张具体且有区分度',
  '功能模块覆盖完整，MVP 边界明确',
  '每个模块至少有 1 个 User Story',
  '技术风险已识别并有应对方案',
], ctx)}

${buildPauseBlock([
  '产品描述模糊，无法判断核心功能',
  '存在多种技术路线需要用户选择',
  r.risks.some(risk => risk.includes('支付')) ? '涉及支付功能，需要确认合规方案' : '涉及敏感数据需要确认合规方案',
])}

${buildArchitectExtras(ctx)}`;
  },

  architecture: (ctx) => {
    const r = ctx.reasoning;
    return `${buildRoleBlock(ctx)}

【当前任务】
为「${ctx.userIdea}」设计完整的技术架构方案。

${buildContextBlock(ctx)}

${buildDomainBlock(ctx)}

【请完成以下工作】
1. 系统整体架构（分层结构，用文字描述，标注数据流向）
2. 前端架构：
   - 页面路由设计（列出所有页面和嵌套关系）
   - 组件层次（Server Component vs Client Component 的划分原则）
   - 状态管理方案（本地状态 vs 全局状态 vs 服务端状态）
3. 后端架构：
   - API 层设计（RESTful 端点列表，包含 Method/Path/描述/请求响应格式）
   - 服务层（业务逻辑封装）
   - 数据层（数据库访问抽象）
4. 数据库 Schema（Prisma 格式，包含所有 model、字段类型、关系、索引）
5. 认证与权限方案
6. 缓存策略和性能优化方案
7. 项目目录结构（完整的文件树）

${buildConstraintBlock(ctx)}

${buildRiskBlock(ctx)}

${buildAcceptanceBlock([
  '架构图清晰分层，职责分明',
  '数据库 Schema 包含所有实体及关系',
  'API 端点覆盖所有功能模块',
  '认证方案安全可靠',
  '目录结构遵循 Next.js 最佳实践',
], ctx)}

${buildPauseBlock([
  '需要第三方服务集成（如支付、短信、邮件）',
  '数据库选型有争议',
])}

${buildArchitectExtras(ctx)}`;
  },

  database: (ctx) => `${buildRoleBlock(ctx)}

【当前任务】
为「${ctx.userIdea}」设计完整的数据库方案。

${buildContextBlock(ctx)}

${buildDomainBlock(ctx)}

【请完成以下工作】
1. 完整的 Prisma Schema（所有 model、字段、关系、索引、约束）
2. ER 关系图（用文字描述实体间的关系）
3. 数据迁移策略（从开发到生产的迁移流程）
4. 复合索引和查询优化（针对高频查询场景）
5. 软删除策略（如需要）
6. 数据备份和恢复方案

${buildConstraintBlock(ctx)}

【额外约束】
- 使用 UUID 作为主键
- 所有表包含 created_at 和 updated_at
- 频繁查询的字段添加索引
- 大文本字段使用 TEXT 类型

${buildAcceptanceBlock([
  'Schema 语法正确，可通过 prisma validate',
  '所有实体关系正确定义（1:1, 1:N, N:N）',
  '索引覆盖高频查询场景',
  '包含必要的约束和默认值',
], ctx)}

${buildPauseBlock([
  '数据量预估超过百万级需要分库分表方案',
  '涉及时序数据需要特殊存储方案',
])}

${buildArchitectExtras(ctx)}`,

  mvp_dev: (ctx) => `${buildRoleBlock(ctx)}

【当前任务】
实现「${ctx.userIdea}」的 MVP 核心功能。

${buildContextBlock(ctx)}

${buildDomainBlock(ctx)}

${buildHiddenRequirementsBlock(ctx)}

【请实现以下模块】
1. 项目初始化（create-next-app + 必要配置）
2. 全局布局和导航组件
3. 核心业务页面和组件
4. API Routes 实现
5. 数据库操作封装
6. 表单验证和错误处理
7. 加载状态和空状态处理

${buildConstraintBlock(ctx)}

【代码质量要求】
- 每个组件不超过 200 行
- 提取公共逻辑为 Custom Hooks
- API 统一错误处理和响应格式
- 使用 React Server Components 减少客户端 JS

${buildAcceptanceBlock([
  '所有核心页面可正常渲染和交互',
  'API 接口可用 Postman 测试通过',
  '表单提交数据可正确写入数据库',
  '响应式布局在移动端正常显示',
  '无 TypeScript 编译错误',
], ctx)}

${buildPauseBlock([
  '功能需求超过当前阶段范围',
  '需要集成第三方 SDK',
])}

${buildArchitectExtras(ctx)}`,

  feature_dev: (ctx) => `${buildRoleBlock(ctx)}

【当前任务】
在 MVP 基础上，为「${ctx.userIdea}」开发扩展功能。

${buildContextBlock(ctx)}

${buildDomainBlock(ctx)}

【请实现以下功能】
1. 基于用户反馈的优化需求
2. 新增的业务功能模块
3. 性能优化（懒加载、缓存、数据库查询优化）
4. 用户体验改进（动画、过渡、骨架屏）
5. 错误监控和日志系统

${buildConstraintBlock(ctx)}

${buildRiskBlock(ctx)}

${buildAcceptanceBlock([
  '新功能与现有功能无冲突',
  '页面加载性能有明显提升',
  '用户体验流畅，无明显卡顿',
  '代码结构清晰，便于后续维护',
], ctx)}

${buildPauseBlock([
  '新功能可能影响现有数据结构',
  '性能优化方案有多种技术路线',
])}

${buildArchitectExtras(ctx)}`,

  audit: (ctx) => `${buildRoleBlock(ctx)}

【当前任务】
对「${ctx.userIdea}」的已实现代码进行全面审计。

${buildContextBlock(ctx)}

【审计范围】
1. 代码质量审计
   - TypeScript 类型安全性
   - 组件设计合理性
   - API 设计一致性
   - 错误处理完整性

2. 安全审计
   - XSS / CSRF 防护
   - SQL 注入防护
   - 认证和授权检查
   - 敏感数据处理

3. 性能审计
   - 首屏加载时间
   - API 响应时间
   - 数据库查询效率
   - 打包体积分析

4. 用户体验审计
   - 移动端适配
   - 无障碍访问
   - 错误提示友好度
   - 加载状态处理

${buildRiskBlock(ctx)}

【输出格式】
请输出结构化的审计报告：
- 严重问题（必须修复）—— 列出具体文件和代码行
- 中等问题（建议修复）—— 说明影响范围
- 优化建议（锦上添花）—— 给出具体方案
- 整体评分（0-100）—— 分维度打分

${buildAcceptanceBlock([
  '审计覆盖所有已实现模块',
  '严重问题数量为 0',
  '整体评分 >= 80 分',
  '安全漏洞已全部识别',
], ctx)}`,

  deploy: (ctx) => `${buildRoleBlock(ctx)}

【当前任务】
为「${ctx.userIdea}」制定完整的部署方案并执行。

${buildContextBlock(ctx)}

【请完成以下工作】
1. 生产环境配置
   - 环境变量管理（.env.production）
   - 数据库连接池配置
   - CDN 和静态资源配置
   - HTTPS 和域名配置

2. 部署流程
   - Vercel 部署配置（vercel.json）
   - 数据库迁移脚本
   - CI/CD 流水线配置（GitHub Actions）
   - 部署前检查清单

3. 监控告警
   - 错误监控接入（Sentry）
   - 性能监控配置
   - 数据库监控
   - 日志收集方案

4. 运维文档
   - 部署操作手册
   - 回滚方案
   - 故障排查指南
   - 扩容方案

${buildAcceptanceBlock([
  '生产环境可正常访问',
  '数据库迁移执行成功',
  'HTTPS 配置正确',
  '监控告警已接入',
  '回滚方案已验证',
], ctx)}

${buildPauseBlock([
  '需要购买域名和 SSL 证书',
  '数据库需要迁移到云服务',
])}`,

  review: (ctx) => `${buildRoleBlock(ctx)}

【当前任务】
对「${ctx.userIdea}」项目进行全面复盘。

${buildContextBlock(ctx)}

【请完成以下工作】
1. 项目总结
   - 实现了哪些功能
   - 用了哪些技术方案
   - 遇到了哪些技术难点以及如何解决

2. 技术亮点提炼
   - 最值得复用的技术方案
   - 最有挑战的技术决策
   - 最有效的性能优化手段
   - 最有价值的设计模式

3. 改进空间
   - 当前方案的不足
   - 未来可优化的方向
   - 技术债务清单
   - 重构建议

4. 知识沉淀
   - 可复用的代码片段
   - 最佳实践总结
   - 踩坑记录

5. 简历包装建议
   - STAR 风格的项目描述（3 条）
   - 面试可能被问到的问题及回答

${buildAcceptanceBlock([
  '总结覆盖项目全生命周期',
  '技术亮点提炼准确且有价值',
  '改进方向具体可执行',
  '简历描述专业且有吸引力',
], ctx)}`,
};

const PHASE_MAP: Record<string, PhaseDefinition[]> = {
  hybrid_marketplace: [
    { templateId: 'product_init', name: '需求澄清与项目规划', category: '启动', description: '明确复合型平台的核心功能和模块边界' },
    { templateId: 'architecture', name: '系统架构设计', category: '设计', description: '设计支持多业务线的可扩展架构' },
    { templateId: 'database', name: '数据库设计', category: '设计', description: '设计支持多业务域的统一数据模型' },
    { templateId: 'mvp_dev', name: 'MVP 核心功能', category: '开发', description: '实现核心业务流程和基础交互' },
    { templateId: 'feature_dev', name: '功能迭代', category: '开发', description: '扩展功能、优化体验、完善细节' },
    { templateId: 'audit', name: '代码审计', category: '质量', description: '代码质量、安全性、性能全面审查' },
    { templateId: 'deploy', name: '部署上线', category: '部署', description: '生产环境部署与监控配置' },
    { templateId: 'review', name: '项目复盘', category: '收尾', description: '总结技术方案和项目经验' },
  ],
  saas: [
    { templateId: 'product_init', name: '需求澄清与项目规划', category: '启动', description: '明确 SaaS 平台的核心功能、用户角色和商业模式' },
    { templateId: 'architecture', name: '系统架构设计', category: '设计', description: '设计多租户架构、API 层和认证体系' },
    { templateId: 'database', name: '数据库设计', category: '设计', description: '设计用户、订阅、计费等核心数据模型' },
    { templateId: 'mvp_dev', name: '用户系统与认证', category: '开发', description: '实现注册、登录、多租户切换' },
    { templateId: 'feature_dev', name: '核心业务与 Dashboard', category: '开发', description: '实现 SaaS 核心功能和管理仪表板' },
    { templateId: 'audit', name: '代码审计与质量验证', category: '质量', description: '安全审计、性能测试、代码质量检查' },
    { templateId: 'deploy', name: '部署上线', category: '部署', description: '生产环境配置、域名绑定、监控告警' },
    { templateId: 'review', name: '项目复盘', category: '收尾', description: '总结技术亮点，输出项目文档' },
  ],
  blog_cms: [
    { templateId: 'product_init', name: '需求分析', category: '启动', description: '明确内容管理需求和编辑体验目标' },
    { templateId: 'architecture', name: '架构设计', category: '设计', description: '设计内容模型、路由和渲染方案' },
    { templateId: 'database', name: '数据库设计', category: '设计', description: '设计文章、分类、标签等数据结构' },
    { templateId: 'mvp_dev', name: 'MVP 核心功能', category: '开发', description: '实现文章编辑器、分类管理和内容展示' },
    { templateId: 'audit', name: '质量审计', category: '质量', description: 'SEO 检查、性能优化、代码审查' },
    { templateId: 'deploy', name: '部署上线', category: '部署', description: '部署到 Vercel，配置域名和 CDN' },
    { templateId: 'review', name: '项目复盘', category: '收尾', description: '总结技术方案和优化经验' },
  ],
  ecommerce: [
    { templateId: 'product_init', name: '需求分析', category: '启动', description: '明确商品类型、交易流程和支付方式' },
    { templateId: 'architecture', name: '系统架构', category: '设计', description: '设计商品、订单、支付的系统架构' },
    { templateId: 'database', name: '数据库设计', category: '设计', description: '设计商品、订单、库存等数据模型' },
    { templateId: 'mvp_dev', name: '商品与购物车', category: '开发', description: '实现商品展示、搜索和购物车功能' },
    { templateId: 'feature_dev', name: '订单与支付', category: '开发', description: '实现订单流程和支付集成' },
    { templateId: 'audit', name: '安全审计', category: '质量', description: '支付安全、数据安全和性能测试' },
    { templateId: 'deploy', name: '部署上线', category: '部署', description: '生产环境部署和监控配置' },
    { templateId: 'review', name: '项目复盘', category: '收尾', description: '总结电商架构经验' },
  ],
  social_platform: [
    { templateId: 'product_init', name: '需求分析', category: '启动', description: '明确社交关系和内容互动模型' },
    { templateId: 'architecture', name: '系统架构', category: '设计', description: '设计实时通信和 Feed 流架构' },
    { templateId: 'database', name: '数据库设计', category: '设计', description: '设计用户关系、消息、动态等数据模型' },
    { templateId: 'mvp_dev', name: 'MVP 核心功能', category: '开发', description: '实现用户主页、发布和关注功能' },
    { templateId: 'feature_dev', name: '实时与互动', category: '开发', description: '实现消息、通知和内容推荐' },
    { templateId: 'audit', name: '质量审计', category: '质量', description: '并发安全和内容审核检查' },
    { templateId: 'deploy', name: '部署上线', category: '部署', description: '部署和 WebSocket 配置' },
    { templateId: 'review', name: '项目复盘', category: '收尾', description: '总结社交平台架构经验' },
  ],
  admin_system: [
    { templateId: 'product_init', name: '需求分析', category: '启动', description: '明确业务流程、权限模型和报表需求' },
    { templateId: 'architecture', name: '系统架构', category: '设计', description: '设计 RBAC 权限和模块化架构' },
    { templateId: 'database', name: '数据库设计', category: '设计', description: '设计用户、角色、权限等数据模型' },
    { templateId: 'mvp_dev', name: 'MVP 核心模块', category: '开发', description: '实现权限管理、基础 CRUD 和报表' },
    { templateId: 'audit', name: '质量审计', category: '质量', description: '权限安全检查和功能验证' },
    { templateId: 'deploy', name: '部署上线', category: '部署', description: '内部部署和访问控制配置' },
    { templateId: 'review', name: '项目复盘', category: '收尾', description: '总结管理系统架构经验' },
  ],
  ai_tool: [
    { templateId: 'product_init', name: '需求分析', category: '启动', description: '明确 AI 能力边界和用户体验目标' },
    { templateId: 'architecture', name: '系统架构', category: '设计', description: '设计 LLM 集成和向量检索架构' },
    { templateId: 'database', name: '数据与知识库', category: '设计', description: '设计对话、知识库和嵌入向量存储' },
    { templateId: 'mvp_dev', name: 'MVP 核心功能', category: '开发', description: '实现对话界面和 LLM 调用' },
    { templateId: 'feature_dev', name: '高级功能', category: '开发', description: '实现 RAG、记忆和多轮对话' },
    { templateId: 'audit', name: '质量审计', category: '质量', description: 'AI 输出质量和安全性审查' },
    { templateId: 'deploy', name: '部署上线', category: '部署', description: '部署和 API 限流配置' },
    { templateId: 'review', name: '项目复盘', category: '收尾', description: '总结 AI 工程化经验' },
  ],
  content_community: [
    { templateId: 'product_init', name: '需求分析', category: '启动', description: '明确社区定位、内容类型和互动机制' },
    { templateId: 'architecture', name: '系统架构', category: '设计', description: '设计内容模型、搜索和推荐架构' },
    { templateId: 'database', name: '数据库设计', category: '设计', description: '设计帖子、评论、互动等数据模型' },
    { templateId: 'mvp_dev', name: 'MVP 核心功能', category: '开发', description: '实现帖子发布、浏览和评论功能' },
    { templateId: 'feature_dev', name: '社交与推荐', category: '开发', description: '实现点赞、收藏、标签和内容推荐' },
    { templateId: 'audit', name: '质量审计', category: '质量', description: '内容审核和性能测试' },
    { templateId: 'deploy', name: '部署上线', category: '部署', description: '部署和搜索服务配置' },
    { templateId: 'review', name: '项目复盘', category: '收尾', description: '总结社区平台架构经验' },
  ],
  data_analytics: [
    { templateId: 'product_init', name: '需求分析', category: '启动', description: '明确数据源、指标和可视化需求' },
    { templateId: 'architecture', name: '系统架构', category: '设计', description: '设计数据采集、处理和展示架构' },
    { templateId: 'database', name: '数据存储设计', category: '设计', description: '设计时序数据存储和聚合策略' },
    { templateId: 'mvp_dev', name: 'MVP 核心功能', category: '开发', description: '实现仪表板和核心图表组件' },
    { templateId: 'audit', name: '质量审计', category: '质量', description: '数据准确性和性能测试' },
    { templateId: 'deploy', name: '部署上线', category: '部署', description: '部署和数据源配置' },
    { templateId: 'review', name: '项目复盘', category: '收尾', description: '总结数据分析平台经验' },
  ],
  education: [
    { templateId: 'product_init', name: '需求分析', category: '启动', description: '明确教学场景、用户角色和学习流程' },
    { templateId: 'architecture', name: '系统架构', category: '设计', description: '设计课程体系和学习路径架构' },
    { templateId: 'database', name: '数据库设计', category: '设计', description: '设计课程、作业、成绩等数据模型' },
    { templateId: 'mvp_dev', name: 'MVP 核心功能', category: '开发', description: '实现课程展示和基础学习功能' },
    { templateId: 'feature_dev', name: '互动与评估', category: '开发', description: '实现作业、考试和学习分析' },
    { templateId: 'audit', name: '质量审计', category: '质量', description: '功能完整性和性能测试' },
    { templateId: 'deploy', name: '部署上线', category: '部署', description: '部署和视频 CDN 配置' },
    { templateId: 'review', name: '项目复盘', category: '收尾', description: '总结教育平台架构经验' },
  ],
  general: [
    { templateId: 'product_init', name: '需求分析', category: '启动', description: '明确项目目标和功能范围' },
    { templateId: 'architecture', name: '系统架构', category: '设计', description: '设计整体技术架构' },
    { templateId: 'database', name: '数据库设计', category: '设计', description: '设计核心数据模型' },
    { templateId: 'mvp_dev', name: 'MVP 开发', category: '开发', description: '实现核心功能模块' },
    { templateId: 'audit', name: '质量审计', category: '质量', description: '代码质量和功能验证' },
    { templateId: 'deploy', name: '部署上线', category: '部署', description: '生产环境部署' },
    { templateId: 'review', name: '项目复盘', category: '收尾', description: '总结和知识沉淀' },
  ],
};

function findPhaseDefinitions(primaryType: string): PhaseDefinition[] {
  if (PHASE_MAP[primaryType]) return PHASE_MAP[primaryType];

  if (primaryType.startsWith('hybrid_')) {
    return PHASE_MAP.hybrid_marketplace;
  }

  for (const key of Object.keys(PHASE_MAP)) {
    if (primaryType.includes(key)) return PHASE_MAP[key];
  }

  return PHASE_MAP.general;
}

export function buildDynamicPhases(
  userIdea: string,
  reasoning: ProjectReasoning,
  depth: PromptDepth = 'standard',
  clarificationContext?: string
): CompiledPhase[] {
  const definitions = findPhaseDefinitions(reasoning.primaryType);
  const previousPhases: string[] = [];

  return definitions.map((def, index) => {
    const ctx: DynamicPromptContext = {
      userIdea,
      reasoning,
      phaseIndex: index,
      totalPhases: definitions.length,
      phaseName: def.name,
      previousPhases: [...previousPhases],
      depth,
      clarificationContext,
    };

    const builder = PHASE_BUILDERS_WRAPPED[def.templateId];
    const prompt = builder ? builder(ctx) : `[未找到模板: ${def.templateId}]`;

    previousPhases.push(def.name);

    return {
      index,
      id: `${def.templateId}_${index}`,
      name: def.name,
      category: def.category,
      description: def.description,
      prompt,
    };
  });
}

interface ContextAccessor extends DynamicPromptContext {
  hiddenRequirementsBlock: () => string;
}

function addHiddenRequirementsAccessor(ctx: DynamicPromptContext): ContextAccessor {
  return {
    ...ctx,
    hiddenRequirementsBlock: () => buildHiddenRequirementsBlock(ctx),
  };
}

const PHASE_BUILDERS_WRAPPED: Record<string, (ctx: DynamicPromptContext) => string> = {};
for (const [key, builder] of Object.entries(PHASE_BUILDERS)) {
  PHASE_BUILDERS_WRAPPED[key] = (ctx) => builder(addHiddenRequirementsAccessor(ctx));
}

export function getPhaseCountForType(primaryType: string): number {
  return findPhaseDefinitions(primaryType).length;
}
