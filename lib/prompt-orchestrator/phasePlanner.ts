import { AnalysisResult, ProductType, Complexity } from './analyzer';
import { PROMPT_TEMPLATES, PromptTemplate, PromptContext } from './templates';

export interface Phase {
  index: number;
  id: string;
  name: string;
  category: string;
  description: string;
  templateId: string;
  prompt: string;
}

interface PhaseDefinition {
  templateId: string;
  name: string;
  category: string;
  description: string;
}

const PHASE_MAP: Record<ProductType, PhaseDefinition[]> = {
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
  data_analytics: [
    { templateId: 'product_init', name: '需求分析', category: '启动', description: '明确数据源、指标和可视化需求' },
    { templateId: 'architecture', name: '系统架构', category: '设计', description: '设计数据采集、处理和展示架构' },
    { templateId: 'database', name: '数据存储设计', category: '设计', description: '设计时序数据存储和聚合策略' },
    { templateId: 'mvp_dev', name: 'MVP 核心功能', category: '开发', description: '实现仪表板和核心图表组件' },
    { templateId: 'audit', name: '质量审计', category: '质量', description: '数据准确性和性能测试' },
    { templateId: 'deploy', name: '部署上线', category: '部署', description: '部署和数据源配置' },
    { templateId: 'review', name: '项目复盘', category: '收尾', description: '总结数据分析平台经验' },
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

export function planPhases(analysis: AnalysisResult, userIdea: string): Phase[] {
  const definitions = PHASE_MAP[analysis.productType] || PHASE_MAP.general;
  const previousPhases: string[] = [];

  return definitions.map((def, index) => {
    const template = PROMPT_TEMPLATES.find(t => t.id === def.templateId);
    if (!template) {
      return {
        index,
        id: def.templateId,
        name: def.name,
        category: def.category,
        description: def.description,
        templateId: def.templateId,
        prompt: `[错误：未找到模板 ${def.templateId}]`,
      };
    }

    const context: PromptContext = {
      userIdea,
      analysis,
      phaseIndex: index,
      totalPhases: definitions.length,
      phaseName: def.name,
      previousPhases: [...previousPhases],
    };

    const prompt = template.buildPrompt(context);
    previousPhases.push(def.name);

    return {
      index,
      id: `${def.templateId}_${index}`,
      name: def.name,
      category: def.category,
      description: def.description,
      templateId: def.templateId,
      prompt,
    };
  });
}
