import { buildAgentContract, formatContractAsMarkdown } from './agentContract';
import { callLLMWithJSON } from './llm';

export type Complexity = 'low' | 'medium' | 'high' | 'very-high';

export type ReasoningStepType = 'intent' | 'architecture' | 'decompose' | 'compile';

export interface IntentResult {
  businessGoal: string;
  userType: string;
  productShape: string;
  lifecycle: string;
  ambiguity: string;
  decisionPoints: string[];
}

export interface ArchitectureResult {
  frontend: string;
  backend: string;
  db: string;
  infra: string[];
  reasoning: string;
  rejectedAlternatives: string[];
}

export interface ArchitectOpinion {
  recommendation: string;
  avoid: string;
  rationale: string;
  riskNotes: string;
}

export interface AtomicTask {
  phase: number;
  phaseLabel: string;
  file: string;
  responsibility: string;
  input: string;
  output: string;
  dependencies: string[];
  implementationRequirements: string[];
  forbiddenItems: string[];
}

export interface DecomposeResult {
  tasks: AtomicTask[];
  phases: { phase: number; label: string; files: string[] }[];
}

export interface ProjectReality {
  teamSize: 'solo' | 'small' | 'medium' | 'large';
  urgency: 'low' | 'medium' | 'high' | 'critical';
  validationStage: 'idea' | 'prototype' | 'mvp' | 'growth' | 'scale';
  likelyGoal: string;
  engineeringMaturity: 'starter' | 'intermediate' | 'advanced';
  complexityBudget: 'minimal' | 'moderate' | 'full';
  testingStrategy: 'none' | 'smoke' | 'integration' | 'full';
}

export interface ReasoningStep {
  type: ReasoningStepType;
  label: string;
  result: IntentResult | ArchitectureResult | DecomposeResult | string;
  status: 'done' | 'error';
}

export async function inferIntent(userInput: string): Promise<IntentResult> {
  const system = `你是一位有 10 年经验的产品技术顾问。用户会给你一个模糊的产品想法，你需要像和创始人聊天一样，快速抓住核心。

你的任务不是翻译用户的话，而是"读懂言外之意"。

关键原则：
- "做一个 app" ≠ 移动端。如果用户没明确说 iOS/Android，先问：他在验证想法还是已决定做？
- "做个工具" ≠ 企业级 SaaS。很可能是个人效率工具。
- 不要用自己的偏好替用户决定。你的判断必须来自输入文本的具体线索。
- 如果输入模糊，ambiguity 字段必须明确指出"哪些关键信息缺失"。

分析维度：
1. businessGoal — 用户真正想解决的问题（不是表面说的功能）
2. userType — 谁会用？自己用、小团队、还是面向公众？这决定架构复杂度
3. productShape — Web / Mobile / API / CLI / 混合？必须根据场景判断，不能默认
4. lifecycle — 想法验证期、MVP、增长期？这决定技术选型的激进程度
5. ambiguity — 哪些信息缺失？哪些假设需要验证？
6. decisionPoints — 支撑你判断的具体线索（从用户原话中提取，不要编造）

输出严格 JSON：
{
  "businessGoal": "string",
  "userType": "string",
  "productShape": "string",
  "lifecycle": "string",
  "ambiguity": "string",
  "decisionPoints": ["string", "string", ...]
}`;

  return await callLLMWithJSON<IntentResult>([
    { role: 'system', content: system },
    { role: 'user', content: userInput },
  ]);
}

export async function decideArchitecture(intent: IntentResult): Promise<ArchitectureResult> {
  const system = `你是一位独立的技术架构师。你不是框架的推销员。你的工作是根据项目实际情况，做出最合适的技术选型。

你必须像真正的工程师一样思考：
- 不是所有项目都需要 React。一个内部工具用 Vue 甚至纯 HTML 可能更好。
- 不是所有项目都需要后端。如果数据不敏感，BaaS 可能就够了。
- 不是所有项目都需要数据库。本地存储、文件系统、甚至 localStorage 可能是正确答案。
- "最合适" ≠ "最先进"。验证期项目用重型框架是浪费时间。

每个决策必须回答三个问题：
1. 为什么选这个？（正面理由）
2. 为什么不选那个？（对比分析）
3. 这个选择的风险是什么？（诚实的 tradeoff）

输出严格 JSON：
{
  "frontend": "选择的前端方案（附简短理由）",
  "backend": "选择的后端方案（附简短理由）",
  "db": "选择的数据库方案（附简短理由）",
  "infra": ["基础设施1", "基础设施2"],
  "reasoning": "2-3 句话的整体架构逻辑，重点说 tradeoff",
  "rejectedAlternatives": ["方案A — 为什么不选", "方案B — 为什么不选"]
}`;

  const userMessage = `产品意图：
- 业务目标：${intent.businessGoal}
- 目标用户：${intent.userType}
- 产品形态：${intent.productShape}
- 项目阶段：${intent.lifecycle}
- 模糊点：${intent.ambiguity}
- 关键线索：${intent.decisionPoints.join('、')}`;

  return await callLLMWithJSON<ArchitectureResult>([
    { role: 'system', content: system },
    { role: 'user', content: userMessage },
  ]);
}

export async function generateArchitectOpinion(
  intent: IntentResult,
  architecture: ArchitectureResult
): Promise<ArchitectOpinion> {
  const system = `你是一位资深工程顾问，正在给团队写一份简短的技术备忘。

风格要求：
- 像和高级工程师聊天，不是写文档
- 直接说判断，不要绕弯子
- 用中文，自然表达，不要机械编号
- 每个字段 1-2 句话，不要长篇大论

输出严格 JSON：
{
  "recommendation": "一句话判断 — 对于当前阶段，最应该做什么（必须具体，不能泛泛）",
  "avoid": "一句话 — 当前阶段最不应该做什么",
  "rationale": "2-3 句话 — 为什么做出这个判断，结合项目阶段和目标用户分析",
  "riskNotes": "1-2 句话 — 这个方案最大的风险或需要关注的点"
}`;

  const userMessage = `产品意图：${intent.businessGoal}
目标用户：${intent.userType}
产品形态：${intent.productShape}
项目阶段：${intent.lifecycle}

技术选型：
前端：${architecture.frontend}
后端：${architecture.backend}
数据库：${architecture.db}
推理：${architecture.reasoning}`;

  return await callLLMWithJSON<ArchitectOpinion>([
    { role: 'system', content: system },
    { role: 'user', content: userMessage },
  ]);
}

export async function decomposeToAtomicTasks(
  intent: IntentResult,
  architecture: ArchitectureResult,
  userInput: string
): Promise<DecomposeResult> {
  const system = `你是一位高级全栈工程师，正在把产品需求拆解为开发任务。

你的拆解必须遵循真实工程实践：
- 从基础设施层开始，往上到业务层，最后是 UI 层
- 每个文件只做一件事（单一职责原则）
- 依赖关系必须有向无环（A 依赖 B，B 不能依赖 A）
- 实现要求必须是具体的函数签名，不是"实现相关功能"这种废话
- 禁止事项必须有针对性（比如"禁止 class 组件"、"禁止直接修改 state"）

阶段划分原则：
- Phase 1 通常是：类型定义 + 配置 + 基础设施
- Phase 2 通常是：核心业务逻辑 + 数据层
- Phase 3 通常是：UI + 页面 + 集成
- 每个 Phase 完成后应该可以独立运行验证

至少产出 8 个具体文件任务。
Phase 数量 3-6 个。

输出严格 JSON：
{
  "tasks": [
    {
      "phase": 1,
      "phaseLabel": "阶段名称",
      "file": "src/xxx/xxx.ts",
      "responsibility": "该文件的核心职责（一句话）",
      "input": "输入类型描述",
      "output": "输出类型描述",
      "dependencies": ["依赖的文件路径"],
      "implementationRequirements": [
        "functionName(params) → returnType // 功能描述",
        "至少 3 条"
      ],
      "forbiddenItems": [
        "禁止项1",
        "禁止项2"
      ]
    }
  ],
  "phases": [
    {
      "phase": 1,
      "label": "阶段名称",
      "files": ["该阶段涉及的文件列表"]
    }
  ]
}`;

  const userMessage = `原始需求：${userInput}

产品意图：
${JSON.stringify(intent, null, 2)}

技术架构：
前端：${architecture.frontend}
后端：${architecture.backend}
数据库：${architecture.db}
基础设施：${architecture.infra.join(', ')}

请拆解为原子级开发任务。`;

  return await callLLMWithJSON<DecomposeResult>([
    { role: 'system', content: system },
    { role: 'user', content: userMessage },
  ]);
}

export function extractRejectionReasons(architecture: ArchitectureResult): string[] {
  return architecture.rejectedAlternatives.filter(r => r.length > 0);
}

export function detectProjectReality(
  intent: IntentResult,
  userInput: string
): ProjectReality {
  const input = userInput.toLowerCase();
  const lifecycle = intent.lifecycle.toLowerCase();

  // 检测团队规模
  let teamSize: ProjectReality['teamSize'] = 'solo';
  if (input.includes('团队') || input.includes('公司') || input.includes('组队') ||
      input.includes('多人') || input.includes('协作')) {
    teamSize = 'small';
  }
  if (input.includes('企业') || input.includes('公司级') || input.includes('部门') ||
      input.includes('多人协作')) {
    teamSize = 'medium';
  }
  if (input.includes('大型') || input.includes('集团') || input.includes('上市公司')) {
    teamSize = 'large';
  }

  // 检测紧急程度
  let urgency: ProjectReality['urgency'] = 'medium';
  if (input.includes('紧急') || input.includes('马上') || input.includes('立即') ||
      input.includes('尽快') || input.includes('asap')) {
    urgency = 'high';
  }
  if (input.includes('赶工') || input.includes('加班') || input.includes('截止日期')) {
    urgency = 'critical';
  }
  if (input.includes('慢慢来') || input.includes('不急') || input.includes('有时间')) {
    urgency = 'low';
  }

  // 检测验证阶段
  let validationStage: ProjectReality['validationStage'] = 'mvp';
  if (lifecycle.includes('想法') || lifecycle.includes('概念') || lifecycle.includes('验证')) {
    validationStage = 'idea';
  }
  if (lifecycle.includes('原型') || lifecycle.includes('demo') || lifecycle.includes('试验')) {
    validationStage = 'prototype';
  }
  if (lifecycle.includes('增长') || lifecycle.includes('扩展') || lifecycle.includes('规模化')) {
    validationStage = 'growth';
  }
  if (lifecycle.includes('成熟') || lifecycle.includes('稳定') || lifecycle.includes('企业级')) {
    validationStage = 'scale';
  }

  // 推断真实目标
  let likelyGoal = '快速验证核心价值';
  if (validationStage === 'idea') {
    likelyGoal = '验证想法是否可行';
  } else if (validationStage === 'prototype') {
    likelyGoal = '制作可演示的原型';
  } else if (validationStage === 'mvp') {
    likelyGoal = '发布最小可行产品';
  } else if (validationStage === 'growth') {
    likelyGoal = '支撑用户增长';
  } else if (validationStage === 'scale') {
    likelyGoal = '系统稳定性和可维护性';
  }

  // 检测工程成熟度
  let engineeringMaturity: ProjectReality['engineeringMaturity'] = 'intermediate';
  if (input.includes('学习') || input.includes('练手') || input.includes('入门') ||
      input.includes('第一个项目')) {
    engineeringMaturity = 'starter';
  }
  if (input.includes('企业级') || input.includes('生产环境') || input.includes('高并发') ||
      input.includes('分布式')) {
    engineeringMaturity = 'advanced';
  }

  // 复杂度预算
  let complexityBudget: ProjectReality['complexityBudget'] = 'moderate';
  if (teamSize === 'solo' && (validationStage === 'idea' || validationStage === 'prototype')) {
    complexityBudget = 'minimal';
  }
  if (teamSize === 'large' || validationStage === 'scale') {
    complexityBudget = 'full';
  }

  // 测试策略
  let testingStrategy: ProjectReality['testingStrategy'] = 'smoke';
  if (validationStage === 'idea' || validationStage === 'prototype') {
    testingStrategy = 'none';
  }
  if (validationStage === 'growth' || validationStage === 'scale') {
    testingStrategy = 'integration';
  }
  if (engineeringMaturity === 'advanced' && (validationStage === 'growth' || validationStage === 'scale')) {
    testingStrategy = 'full';
  }

  return {
    teamSize,
    urgency,
    validationStage,
    likelyGoal,
    engineeringMaturity,
    complexityBudget,
    testingStrategy,
  };
}

export interface EngineeringReminder {
  pitfall: string;
  why: string;
  howToAvoid: string;
  relatedTech: string;
}

export function generateEngineeringReminders(
  architecture: ArchitectureResult,
  decompose: DecomposeResult,
  reality: ProjectReality
): EngineeringReminder[] {
  const reminders: EngineeringReminder[] = [];
  const frontend = architecture.frontend.toLowerCase();
  const backend = architecture.backend.toLowerCase();
  const db = architecture.db.toLowerCase();

  // React/Next.js 相关提醒
  if (frontend.includes('react') || frontend.includes('next')) {
    if (reality.validationStage === 'idea' || reality.validationStage === 'prototype') {
      reminders.push({
        pitfall: '过早引入状态管理库',
        why: '原型阶段用 useState + useContext 就够了，Redux/Zustand 会增加不必要的样板代码',
        howToAvoid: '先用 React 内置方案，等状态确实难以管理时再引入',
        relatedTech: 'React',
      });
    }
    if (reality.teamSize === 'solo') {
      reminders.push({
        pitfall: '过度组件化',
        why: '一个人开发时，过细的组件拆分会增加文件跳转成本，降低开发效率',
        howToAvoid: '单个组件 200 行以内即可，不要为了复用而复用',
        relatedTech: 'React',
      });
    }
  }

  // 数据库相关提醒
  if (db.includes('postgres') || db.includes('mysql') || db.includes('supabase')) {
    if (reality.validationStage === 'idea') {
      reminders.push({
        pitfall: '过早设计复杂表结构',
        why: '想法阶段需求变动频繁，复杂的关系设计会成为负担',
        howToAvoid: '先用最少的表验证核心流程，稳定后再优化 schema',
        relatedTech: 'Database',
      });
    }
    reminders.push({
      pitfall: 'N+1 查询问题',
      why: '列表页展示关联数据时容易触发，数据量上来后会明显变慢',
      howToAvoid: '使用 include/join 预加载关联数据，或者用 dataloader 批量查询',
      relatedTech: 'Database',
    });
  }

  // 认证相关提醒
  if (backend.includes('auth') || backend.includes('jwt') || backend.includes('session')) {
    reminders.push({
      pitfall: '自己实现密码加密和 session 管理',
      why: '容易出安全漏洞，且维护成本高',
      howToAvoid: '用 NextAuth/Clerk/Supabase Auth 等成熟方案，除非有特殊需求',
      relatedTech: 'Auth',
    });
  }

  // 部署相关提醒
  if (reality.teamSize === 'solo' && reality.complexityBudget === 'minimal') {
    reminders.push({
      pitfall: '过早考虑容器化和 CI/CD',
      why: '个人项目用 Vercel/Netlify 一键部署即可，Docker + GitHub Actions 会消耗大量配置时间',
      howToAvoid: '先手动部署，等确实需要自动化时再配置',
      relatedTech: 'DevOps',
    });
  }

  // 通用工程提醒
  if (reality.testingStrategy === 'none' || reality.testingStrategy === 'smoke') {
    reminders.push({
      pitfall: '没有基本的错误处理',
      why: '用户遇到白屏或无响应时会直接离开，没有反馈你也不知道出了问题',
      howToAvoid: '至少在 API 调用和关键操作加 try-catch，给用户友好的错误提示',
      relatedTech: 'General',
    });
  }

  // 根据任务拆解检测潜在问题
  const taskCount = decompose.tasks.length;
  if (taskCount > 10 && reality.teamSize === 'solo') {
    reminders.push({
      pitfall: '任务拆分过细导致失去全局视角',
      why: `${taskCount} 个文件任务对于个人开发来说太多了，容易陷入细节而忽略整体进度`,
      howToAvoid: '优先完成核心流程的 3-5 个文件，确保能跑通后再扩展',
      relatedTech: 'Project Management',
    });
  }

  return reminders;
}

export async function generateChain(
  userInput: string,
  onStep: (step: ReasoningStep) => void
): Promise<{ prompt: string; steps: ReasoningStep[] }> {
  const steps: ReasoningStep[] = [];

  const intent = await inferIntent(userInput);
  const intentStep: ReasoningStep = { type: 'intent', label: '意图识别', result: intent, status: 'done' };
  steps.push(intentStep);
  onStep(intentStep);

  const architecture = await decideArchitecture(intent);
  const archStep: ReasoningStep = { type: 'architecture', label: '架构决策', result: architecture, status: 'done' };
  steps.push(archStep);
  onStep(archStep);

  const decompose = await decomposeToAtomicTasks(intent, architecture, userInput);
  const decomposeStep: ReasoningStep = { type: 'decompose', label: '任务拆解', result: decompose, status: 'done' };
  steps.push(decomposeStep);
  onStep(decomposeStep);

  const compileStep: ReasoningStep = { type: 'compile', label: 'Prompt 编译', result: '(programmatic)', status: 'done' };
  steps.push(compileStep);
  onStep(compileStep);

  return { prompt: '(generated by route)', steps };
}
