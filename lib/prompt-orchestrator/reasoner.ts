const API_URL = `${process.env.OPENAI_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4'}/chat/completions`;
const API_KEY = process.env.OPENAI_API_KEY || '';
const MODEL = process.env.OPENAI_MODEL || 'glm-4-flash';

export type Complexity = 'low' | 'medium' | 'high' | 'very-high';

export type ReasoningStepType = 'intent' | 'architecture' | 'compile';

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

export interface ReasoningStep {
  type: ReasoningStepType;
  label: string;
  result: IntentResult | ArchitectureResult | string;
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

export async function compilePrompt(
  intent: IntentResult,
  architecture: ArchitectureResult,
  userInput: string
): Promise<string> {
  const system = `你是一个 Prompt 编译引擎。你的任务是将产品意图和技术架构编译成一个可以直接复制到 Cursor 使用的高质量开发 Prompt。

输出必须是完整的 Markdown 文档，包含以下 8 个固定章节：

# 一、项目定义
（基于意图分析，清晰定义项目目标、用户、范围）

# 二、技术决策与理由
（基于架构分析，列出技术选型和选择理由，以及被拒绝的替代方案）

# 三、目录结构
（完整的项目目录树，符合所选技术栈的最佳实践）

# 四、文件级实现任务
（每个文件的具体实现任务，包含文件路径和要做什么）

# 五、开发顺序
（按依赖关系排列的开发步骤，每步具体可执行）

# 六、验收标准
（具体的、可验证的完成标准）

# 七、禁止修改范围
（明确哪些文件/模块不应该被修改）

# 八、遇错反馈模板
（当遇到问题时，应该反馈什么信息给修复系统）

关键要求：
- 整个 Prompt 必须可以直接复制粘贴到 Cursor
- 技术栈选择必须来自架构决策，不能自行替换
- 目录结构和文件路径必须具体
- 验收标准必须可验证
- 总长度 2000-4000 字`;

  const userMessage = `原始需求：${userInput}

产品意图：
${JSON.stringify(intent, null, 2)}

技术架构：
${JSON.stringify(architecture, null, 2)}

请编译成完整的开发 Prompt。`;

  const messages = [
    { role: 'system', content: system },
    { role: 'user', content: userMessage },
  ];

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: 0.3,
      max_tokens: 6000,
    }),
  });

  if (!response.ok) throw new Error(`Prompt compilation failed: ${response.status}`);

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content || '';

  if (content.length < 200) {
    throw new Error('Generated prompt too short');
  }

  return content;
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

  const prompt = await compilePrompt(intent, architecture, userInput);
  const compileStep: ReasoningStep = { type: 'compile', label: 'Prompt 编译', result: prompt, status: 'done' };
  steps.push(compileStep);
  onStep(compileStep);

  return { prompt, steps };
}