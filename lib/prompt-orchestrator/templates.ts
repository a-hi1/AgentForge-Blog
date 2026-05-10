import { AnalysisResult } from './analyzer';

export interface PromptTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  buildPrompt: (ctx: PromptContext) => string;
}

export interface PromptContext {
  userIdea: string;
  analysis: AnalysisResult;
  phaseIndex: number;
  totalPhases: number;
  phaseName: string;
  previousPhases: string[];
}

function stackList(stack: string[]): string {
  return stack.map((s, i) => `${i + 1}. ${s}`).join('\n');
}

function constraintsBlock(stack: string[]): string {
  return `【实现约束】
1. 使用 ${stack[0]} + ${stack[1]} 作为核心框架
2. TypeScript 严格模式，禁止 any 类型
3. 组件采用函数式写法 + Hooks
4. 样式使用 Tailwind CSS，遵循响应式设计
5. API 遵循 RESTful 规范
6. 所有用户输入必须做校验和清洗
7. 关键操作需记录日志
8. 代码中使用中文注释说明业务逻辑`;
}

function acceptanceBlock(criteria: string[]): string {
  return `【验收标准】
${criteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}`;
}

function pauseCondition(conditions: string[]): string {
  return `【暂停条件】
遇到以下情况请暂停并询问用户：
${conditions.map(c => `- ${c}`).join('\n')}`;
}

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'product_init',
    name: '产品启动',
    category: '启动阶段',
    description: '需求澄清与项目初始化',
    buildPrompt: (ctx) => `你是一位资深全栈技术顾问。

【当前任务】
对以下产品想法进行专业的需求分析和技术拆解。

【产品描述】
${ctx.userIdea}

【产品类型】${ctx.analysis.productTypeLabel}
【复杂度】${ctx.analysis.complexity}
【推荐技术栈】
${stackList(ctx.analysis.recommendedStack)}

【请完成以下工作】
1. 明确产品的核心价值主张（一句话）
2. 列出 3-5 个核心功能模块
3. 列出每个模块的关键用户故事（User Story）
4. 标注 MVP 必需功能 vs 后续迭代功能
5. 识别潜在的技术难点和风险点
6. 给出初步的数据库实体列表

【输出格式】
请使用结构化的 Markdown 输出，包含标题、列表和表格。

${acceptanceBlock([
  '核心价值主张清晰，不超过一句话',
  '功能模块覆盖完整，MVP 边界明确',
  '每个模块至少有 1 个 User Story',
  '技术风险已识别并有应对方案',
])}

${pauseCondition([
  '产品描述模糊，无法判断核心功能',
  '存在多种技术路线需要用户选择',
  '涉及敏感数据（如支付、隐私）需要确认合规方案',
])}`,
  },
  {
    id: 'architecture',
    name: '系统架构',
    category: '设计阶段',
    description: '整体架构设计与技术选型',
    buildPrompt: (ctx) => `你是一位系统架构师。

【当前任务】
为「${ctx.userIdea}」设计完整的技术架构方案。

【产品类型】${ctx.analysis.productTypeLabel}
【技术栈】${stackList(ctx.analysis.recommendedStack)}

【请完成以下工作】
1. 设计系统整体架构图（用文字描述分层结构）
2. 定义前端架构：页面路由、组件层次、状态管理方案
3. 定义后端架构：API 层、服务层、数据层的职责划分
4. 设计数据库 Schema（使用 Prisma 格式）
5. 列出所有 API 端点（方法、路径、描述、请求/响应格式）
6. 设计认证与权限方案
7. 规划缓存策略和性能优化方案
8. 给出项目目录结构

${constraintsBlock(ctx.analysis.recommendedStack)}

${acceptanceBlock([
  '架构图清晰分层，职责分明',
  '数据库 Schema 包含所有实体及关系',
  'API 端点覆盖所有功能模块',
  '认证方案安全可靠',
  '目录结构遵循 Next.js 最佳实践',
])}

${pauseCondition([
  '需要第三方服务集成（如支付、短信、邮件）',
  '数据库选型有争议',
  '前后端分离还是全栈需要确认',
])}`,
  },
  {
    id: 'database',
    name: '数据库设计',
    category: '设计阶段',
    description: '数据库 Schema 与数据流设计',
    buildPrompt: (ctx) => `你是一位数据库架构师。

【当前任务】
为「${ctx.userIdea}」设计完整的数据库方案。

【产品类型】${ctx.analysis.productTypeLabel}
【技术栈】${stackList(ctx.analysis.recommendedStack)}

【请完成以下工作】
1. 设计完整的 Prisma Schema（所有 model、字段、关系、索引）
2. 画出 ER 关系图（用文字描述）
3. 设计数据迁移策略
4. 列出需要的复合索引和查询优化
5. 设计软删除策略（如需要）
6. 规划数据备份和恢复方案

${constraintsBlock(ctx.analysis.recommendedStack)}

【额外约束】
- 使用 UUID 作为主键
- 所有表包含 created_at 和 updated_at
- 频繁查询的字段添加索引
- 大文本字段使用 TEXT 类型

${acceptanceBlock([
  'Schema 语法正确，可通过 prisma validate',
  '所有实体关系正确定义（1:1, 1:N, N:N）',
  '索引覆盖高频查询场景',
  '包含必要的约束和默认值',
])}

${pauseCondition([
  '数据量预估超过百万级需要分库分表方案',
  '涉及时序数据需要特殊存储方案',
  '需要全文搜索能力',
])}`,
  },
  {
    id: 'mvp_dev',
    name: 'MVP 开发',
    category: '开发阶段',
    description: '核心功能开发与页面实现',
    buildPrompt: (ctx) => `你是一位高级全栈开发工程师。

【当前任务】
实现「${ctx.userIdea}」的 MVP 核心功能。

【产品类型】${ctx.analysis.productTypeLabel}
【技术栈】${stackList(ctx.analysis.recommendedStack)}
【当前阶段】Phase ${ctx.phaseIndex + 1} / ${ctx.totalPhases}

${ctx.previousPhases.length > 0 ? `【前序阶段已完成】
${ctx.previousPhases.map((p, i) => `${i + 1}. ${p}`).join('\n')}` : ''}

【请实现以下模块】
1. 项目初始化（create-next-app + 配置）
2. 全局布局和导航组件
3. 核心业务页面和组件
4. API Routes 实现
5. 数据库操作封装
6. 表单验证和错误处理
7. 加载状态和空状态处理

${constraintsBlock(ctx.analysis.recommendedStack)}

【代码质量要求】
- 每个组件不超过 200 行
- 提取公共逻辑为 Custom Hooks
- API 统一错误处理和响应格式
- 使用 React Server Components 减少客户端 JS

${acceptanceBlock([
  '所有核心页面可正常渲染和交互',
  'API 接口可用 Postman 测试通过',
  '表单提交数据可正确写入数据库',
  '响应式布局在移动端正常显示',
  '无 TypeScript 编译错误',
])}

${pauseCondition([
  '功能需求超过当前阶段范围',
  '需要集成第三方 SDK',
  '涉及复杂的业务规则需要确认',
])}`,
  },
  {
    id: 'feature_dev',
    name: '功能迭代',
    category: '开发阶段',
    description: '扩展功能开发与优化',
    buildPrompt: (ctx) => `你是一位高级全栈开发工程师。

【当前任务】
在 MVP 基础上，为「${ctx.userIdea}」开发扩展功能。

【产品类型】${ctx.analysis.productTypeLabel}
【技术栈】${stackList(ctx.analysis.recommendedStack)}
【当前阶段】Phase ${ctx.phaseIndex + 1} / ${ctx.totalPhases}

${ctx.previousPhases.length > 0 ? `【前序阶段已完成】
${ctx.previousPhases.map((p, i) => `${i + 1}. ${p}`).join('\n')}` : ''}

【请实现以下功能】
1. 用户反馈的优化需求
2. 新增的业务功能模块
3. 性能优化（懒加载、缓存、数据库查询优化）
4. 用户体验改进（动画、过渡、骨架屏）
5. 错误监控和日志系统

${constraintsBlock(ctx.analysis.recommendedStack)}

${acceptanceBlock([
  '新功能与现有功能无冲突',
  '页面加载性能有明显提升',
  '用户体验流畅，无明显卡顿',
  '代码结构清晰，便于后续维护',
])}

${pauseCondition([
  '新功能可能影响现有数据结构',
  '性能优化方案有多种技术路线',
  '需要数据迁移来支持新功能',
])}`,
  },
  {
    id: 'audit',
    name: '审计验收',
    category: '质量阶段',
    description: '代码审查与质量验证',
    buildPrompt: (ctx) => `你是一位技术负责人和质量审计师。

【当前任务】
对「${ctx.userIdea}」的已实现代码进行全面审计。

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

【输出格式】
请输出结构化的审计报告：
- 严重问题（必须修复）
- 中等问题（建议修复）
- 优化建议（锦上添花）
- 整体评分（0-100）

${acceptanceBlock([
  '审计覆盖所有已实现模块',
  '严重问题数量为 0',
  '整体评分 >= 80 分',
  '安全漏洞已全部识别',
])}`,
  },
  {
    id: 'deploy',
    name: '部署上线',
    category: '部署阶段',
    description: '生产环境部署与配置',
    buildPrompt: (ctx) => `你是一位 DevOps 工程师。

【当前任务】
为「${ctx.userIdea}」制定完整的部署方案并执行。

【技术栈】${stackList(ctx.analysis.recommendedStack)}

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

${acceptanceBlock([
  '生产环境可正常访问',
  '数据库迁移执行成功',
  'HTTPS 配置正确',
  '监控告警已接入',
  '回滚方案已验证',
])}

${pauseCondition([
  '需要购买域名和 SSL 证书',
  '数据库需要迁移到云服务',
  '需要配置自定义域名和 DNS',
])}`,
  },
  {
    id: 'review',
    name: '项目复盘',
    category: '收尾阶段',
    description: '项目总结与知识沉淀',
    buildPrompt: (ctx) => `你是一位技术项目经理。

【当前任务】
对「${ctx.userIdea}」项目进行全面复盘。

【请完成以下工作】
1. 项目总结
   - 实现了哪些功能
   - 用了哪些技术方案
   - 遇到了哪些技术难点
   - 如何解决这些难点

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
   - 给后续项目的建议

5. 简历包装建议
   - 如何在简历中描述这个项目
   - STAR 风格的项目描述（3 条）
   - 面试可能被问到的问题及回答

【输出格式】
请使用结构化的 Markdown 输出，适合作为项目文档保存。

${acceptanceBlock([
  '总结覆盖项目全生命周期',
  '技术亮点提炼准确且有价值',
  '改进方向具体可执行',
  '简历描述专业且有吸引力',
])}`,
  },
];

export function getTemplateById(id: string): PromptTemplate | undefined {
  return PROMPT_TEMPLATES.find(t => t.id === id);
}

export function getTemplatesByCategory(): Record<string, PromptTemplate[]> {
  const grouped: Record<string, PromptTemplate[]> = {};
  for (const template of PROMPT_TEMPLATES) {
    if (!grouped[template.category]) grouped[template.category] = [];
    grouped[template.category].push(template);
  }
  return grouped;
}
