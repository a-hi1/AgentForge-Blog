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

async function callLLMText(
  messages: { role: string; content: string }[],
  maxTokens: number = 6000,
  maxRetries: number = 2
): Promise<string> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
        body: JSON.stringify({
          model: MODEL,
          messages,
          temperature: 0.3,
          max_tokens: maxTokens,
        }),
      });

      if (!response.ok) {
        if (attempt === maxRetries) throw new Error(`API error: ${response.status}`);
        continue;
      }

      const result = await response.json();
      const content = result.choices?.[0]?.message?.content || '';

      if (content.length < 200) {
        if (attempt === maxRetries) throw new Error('Generated content too short');
        continue;
      }

      return content;
    } catch (e) {
      if (attempt === maxRetries) throw e;
    }
  }
  throw new Error('Max retries exceeded');
}

export async function inferIntent(userInput: string): Promise<IntentResult> {
  const system = `你是一个高级产品分析引擎。你的唯一任务是深度理解用户输入，推断其真实意图。

严格要求：
- 不要做任何技术栈推荐
- 不要做任何架构决策
- 只专注于理解"用户到底想做什么"
- 必须基于用户输入的具体内容推理，不要使用模板化回答

分析维度：
1. businessGoal: 用户的业务目标是什么？要解决什么问题？
2. userType: 目标用户是谁？个人、团队、还是面向公众？
3. productShape: 产品形态是什么？Web应用、移动应用、API服务、还是其他？
4. lifecycle: 项目处于什么阶段？想法验证、MVP、还是成熟产品？
5. ambiguity: 输入中有哪些模糊或未明确的地方？
6. decisionPoints: 做出以上判断的关键依据（从用户输入中提取的具体线索）

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
  const system = `你是一个高级架构决策引擎。基于产品意图，选择最合适的技术方案。

严格要求：
- 不允许无理由默认选择任何技术栈
- 每个决策必须有明确的推理依据
- 必须考虑并拒绝不适合的替代方案
- 不同任务必须产生不同的技术方案

选择框架时考虑：
- React/Vue/Angular/Svelte 各有适用场景
- SSR/CSR/SSG 取决于产品需求
- 轻量项目不需要重型框架

选择后端时考虑：
- 并非所有项目都需要后端
- Serverless 函数可能比完整后端更合适
- BaaS (Supabase/Firebase) 适合快速原型

选择数据库时考虑：
- 关系型 vs 文档型 vs 图数据库
- 是否需要实时同步
- 数据规模和查询模式

输出严格 JSON：
{
  "frontend": "选择的前端方案",
  "backend": "选择的后端方案",
  "db": "选择的数据库方案",
  "infra": ["基础设施1", "基础设施2"],
  "reasoning": "详细的决策推理过程，解释为什么选择这些技术",
  "rejectedAlternatives": ["被拒绝的方案1及原因", "被拒绝的方案2及原因"]
}`;

  const userMessage = `产品意图分析：
- 业务目标：${intent.businessGoal}
- 目标用户：${intent.userType}
- 产品形态：${intent.productShape}
- 项目阶段：${intent.lifecycle}
- 模糊点：${intent.ambiguity}
- 关键线索：${intent.decisionPoints.join('、')}

请基于以上分析，做出架构决策。`;

  return await callLLMWithJSON<ArchitectureResult>([
    { role: 'system', content: system },
    { role: 'user', content: userMessage },
  ]);
}

export async function decomposeToAtomicTasks(
  intent: IntentResult,
  architecture: ArchitectureResult,
  userInput: string
): Promise<DecomposeResult> {
  const system = `你是一个任务拆解引擎。将产品意图和技术架构拆解为原子级开发任务。

每个任务必须：
- 精确到单个文件（禁止"src/utils"这种泛目录）
- 明确输入类型和输出类型
- 明确依赖的其他文件
- 明确实现要求（至少 3 条具体函数/方法签名）
- 明确禁止事项（如禁止 class、禁止特定库等）

任务必须分阶段（phase）组织，每个阶段有清晰标签。
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

export async function compilePrompt(
  intent: IntentResult,
  architecture: ArchitectureResult,
  atomicTasks: DecomposeResult,
  userInput: string
): Promise<string> {
  const contract = buildAgentContract();
  const contractMarkdown = formatContractAsMarkdown(contract);

  const system = `你是一个精确的 Prompt 编译引擎。将产品意图、技术架构和原子任务列表编译为一个可直接复制到 Cursor / Claude Code 执行的开发指令。

输出必须是严格的 Markdown 文档，包含以下 10 个章节，不可省略、不可合并：

## Section 1: ROLE
定义 Agent 角色。示例格式：
你是资深全栈工程师。
目标：严格按要求实现，不做额外架构扩展。
禁止擅自：替换技术栈 / 增加依赖 / 改变目录结构 / 提前实现后续模块。

## Section 2: PROJECT CONTEXT
业务目标 / 核心用户 / MVP 范围。必须从意图分析中提取，不能泛泛而谈。

## Section 3: TECHNICAL DECISION
选型 + why + not（被拒绝方案及原因）。必须引用架构决策结果。

## Section 4: TARGET FILE TREE
精确到文件的目录树。禁止泛目录（如"src/utils/"）。必须包含所有任务涉及的文件。

## Section 5: FILE TASKS（重点章节）
每个文件一个任务卡，格式严格：
文件：xxx.ts
职责：一句话
输入：类型描述
输出：类型描述
依赖：依赖的文件
实现要求：至少 3 条具体函数签名
禁止：具体禁止事项

## Section 6: EXECUTION ORDER
分 Phase 执行，每个 Phase 列出要完成的文件。
Phase 完成后输出：DONE_PHASE_N
等待用户确认后再继续下一个 Phase。

## Section 7: OUTPUT CONTRACT
强制 Agent 每次输出的格式：
### Modified Files
### Code
### Verification
### Risks
禁止输出解释性长文。

## Section 8: VALIDATION CHECKLIST
可勾选的验证清单。如：
[ ] npm run dev 无报错
[ ] TS 0 errors
[ ] 涉及的文件均已创建

## Section 9: BOUNDARY
明确禁止范围：修改未指定文件 / 增加 mock / 自动引入测试框架 / 自动改 package manager。

## Section 10: ERROR FEEDBACK TEMPLATE
固定格式：
错误：
当前文件：
期望：
实际：
日志：

${contractMarkdown}

关键要求：
- 整个 Prompt 可直接复制粘贴到 Cursor
- Section 5 必须覆盖所有文件，每文件至少 3 条实现要求
- Section 6 必须分至少 3 个 Phase
- 所有内容必须具体到可执行，禁止泛泛描述
- 总长度 3000-6000 字`;

  const taskSummary = atomicTasks.tasks.map(t =>
    `[Phase ${t.phase}] ${t.file} — ${t.responsibility}`
  ).join('\n');

  const userMessage = `原始需求：${userInput}

产品意图：
- 业务目标：${intent.businessGoal}
- 目标用户：${intent.userType}
- 产品形态：${intent.productShape}
- 项目阶段：${intent.lifecycle}

技术架构：
- 前端：${architecture.frontend}
- 后端：${architecture.backend}
- 数据库：${architecture.db}
- 基础设施：${architecture.infra.join(', ')}
- 决策推理：${architecture.reasoning}
- 被拒绝方案：${architecture.rejectedAlternatives.join(' | ')}

原子任务列表：
${taskSummary}

详细任务数据：
${JSON.stringify(atomicTasks.tasks, null, 2)}

请编译为完整的 10 段式开发 Prompt。`;

  return await callLLMText([
    { role: 'system', content: system },
    { role: 'user', content: userMessage },
  ], 6000);
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

  const prompt = await compilePrompt(intent, architecture, decompose, userInput);
  const compileStep: ReasoningStep = { type: 'compile', label: 'Prompt 编译', result: prompt, status: 'done' };
  steps.push(compileStep);
  onStep(compileStep);

  return { prompt, steps };
}
