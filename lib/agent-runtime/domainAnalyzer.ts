export interface DomainAnalysis {
  domain: string;
  keywords: string[];
  context: string;
}

const DOMAIN_RULES: { domain: string; triggers: string[]; context: string }[] = [
  {
    domain: '打卡/签到系统',
    triggers: ['打卡', '签到', '签退', '考勤', '习惯', '连续签到', '每日打卡'],
    context: `业务领域：打卡/签到系统

重点分析以下方面：
- 连续打卡机制：如何记录和计算连续天数，断签处理逻辑
- 补签机制：补签权限、次数限制、审批流程
- 打卡统计：日/周/月维度的打卡数据分析和可视化
- 激励体系：积分、勋章、排行榜等激励设计
- 提醒机制：定时提醒、智能提醒策略
- 周期分析：用户打卡习惯的周期性分析
- 任务完成率：个人和团队的完成率统计
- 用户习惯培养：如何通过产品设计帮助用户养成习惯`,
  },
  {
    domain: '博客/CMS系统',
    triggers: ['博客', 'blog', '文章', 'cms', '内容管理', '发布文章', '写文章'],
    context: `业务领域：博客/CMS 内容管理系统

重点分析以下方面：
- 文章模型：标题、正文（Markdown/Rich Text）、摘要、封面图
- 标签系统：标签 CRUD、标签关联、标签云
- 分类体系：多级分类、分类导航
- SEO 优化：meta 标签、sitemap、URL 语义化
- 评论系统：嵌套评论、审核机制、反垃圾
- 媒体管理：图片上传、CDN 集成、媒体库
- 版本控制：文章历史版本、草稿自动保存
- 发布流程：草稿→审核→发布工作流`,
  },
  {
    domain: '电商/交易平台',
    triggers: ['电商', '商城', '购物车', '订单', '支付', '商品', '库存', '下单'],
    context: `业务领域：电商/交易平台

重点分析以下方面：
- 商品模型：SPU/SKU 设计、规格属性、价格体系
- 订单系统：订单状态机、订单拆分、超时处理
- 支付集成：支付渠道对接、支付回调、退款流程
- 库存管理：库存扣减策略、预占库存、库存同步
- 购物车：本地/服务端购物车、合并策略、失效处理
- 物流追踪：物流对接、状态同步、异常处理
- 营销系统：优惠券、满减、秒杀等促销机制
- 售后流程：退货退款、投诉处理`,
  },
  {
    domain: '任务管理系统',
    triggers: ['任务', '待办', 'todo', '看板', '项目管理', '甘特图', 'sprint'],
    context: `业务领域：任务/项目管理系统

重点分析以下方面：
- 任务模型：标题、描述、优先级、状态、截止日期、负责人
- 看板视图：拖拽排序、状态流转、批量操作
- 任务关联：父子任务、依赖关系、阻塞检测
- 协作功能：评论、@提及、文件附件、活动日志
- 时间管理：工时记录、时间线视图、甘特图
- 权限控制：项目成员、角色权限、数据隔离
- 自动化：规则引擎、自动状态流转、通知触发`,
  },
  {
    domain: 'AI/智能系统',
    triggers: ['ai', 'agent', '智能', '对话', 'chatbot', 'llm', '模型', '推理'],
    context: `业务领域：AI/智能对话系统

重点分析以下方面：
- 对话管理：会话上下文、多轮对话、上下文窗口
- 模型调用：API 对接、流式响应、超时重试
- 提示工程：System Prompt 设计、Few-shot 示例
- 记忆系统：短期记忆、长期记忆、记忆检索
- 多 Agent 协作：任务分解、Agent 调度、结果聚合
- 安全防护：输入过滤、输出审核、速率限制
- 可观测性：调用链追踪、性能监控、质量评估`,
  },
  {
    domain: '社交/社区平台',
    triggers: ['社交', '社区', '论坛', '帖子', '关注', '粉丝', '动态', 'feed'],
    context: `业务领域：社交/社区平台

重点分析以下方面：
- 用户关系：关注/粉丝模型、好友关系、黑名单
- 内容发布：富文本/图片/视频、话题标签、@提及
- Feed 流：推拉模式、时间线排序、推荐算法
- 互动功能：点赞、评论、转发、收藏
- 内容审核：敏感词过滤、人工审核、举报机制
- 消息系统：私信、系统通知、推送策略
- 社区治理：社区规则、违规处理、信用体系`,
  },
  {
    domain: '数据/分析平台',
    triggers: ['数据', '分析', '报表', 'dashboard', '图表', '指标', '统计', 'bi'],
    context: `业务领域：数据分析/BI 平台

重点分析以下方面：
- 数据接入：多数据源对接、ETL 流程、数据同步
- 数据建模：维度建模、指标定义、数据血缘
- 可视化：图表类型选择、交互设计、大屏展示
- 查询引擎：SQL 构建、查询优化、缓存策略
- 权限管理：数据权限、行列级控制、脱敏规则
- 报表系统：定时报表、报表订阅、导出格式
- 实时计算：流式处理、实时指标、告警规则`,
  },
];

export function analyzeDomain(prompt: string): DomainAnalysis {
  const promptLower = prompt.toLowerCase();

  for (const rule of DOMAIN_RULES) {
    const matchedTriggers = rule.triggers.filter(t => promptLower.includes(t.toLowerCase()));
    if (matchedTriggers.length > 0) {
      return {
        domain: rule.domain,
        keywords: matchedTriggers,
        context: rule.context,
      };
    }
  }

  return {
    domain: '通用工程',
    keywords: [],
    context: '',
  };
}

export function buildDomainContext(analysis: DomainAnalysis): string {
  if (!analysis.context) {
    return '';
  }

  return `\n\n【业务领域分析】\n${analysis.context}\n\n请基于以上领域知识，给出贴合具体业务场景的分析和方案。`;
}
