import { buildAgentContract, formatContractAsMarkdown } from './agentContract';

const API_URL = `${process.env.OPENAI_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4'}/chat/completions`;
const API_KEY = process.env.OPENAI_API_KEY || '';
const MODEL = process.env.OPENAI_MODEL || 'glm-4-flash';

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

export interface ReasoningStep {
  type: ReasoningStepType;
  label: string;
  result: IntentResult | ArchitectureResult | DecomposeResult | string;
  status: 'done' | 'error';
}

async function callLLMWithJSON<T>(
  messages: { role: string; content: string }[],
  maxRetries: number = 2
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
        body: JSON.stringify({
          model: MODEL,
          messages,
          temperature: 0.4 + attempt * 0.1,
          max_tokens: 4000,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        if (attempt === maxRetries) throw new Error(`API error: ${response.status}`);
        continue;
      }

      const result = await response.json();
      const content = result.choices?.[0]?.message?.content || '';

      if (!content) {
        if (attempt === maxRetries) throw new Error('Empty response');
        continue;
      }

      try {
        const parsed = JSON.parse(content);
        if (typeof parsed === 'object' && parsed !== null) {
          return parsed as T;
        }
      } catch {
        if (attempt === maxRetries) throw new Error('Invalid JSON');
      }
    } catch (e) {
      if (attempt === maxRetries) throw e;
    }
  }
  throw new Error('Max retries exceeded');
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
