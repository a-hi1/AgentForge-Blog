import type { ProjectReasoning } from './reasoner';

export interface ClarificationQuestion {
  id: string;
  question: string;
  options: string[];
  category: string;
  impact: 'high' | 'medium' | 'low';
}

export interface ClarificationResult {
  needed: boolean;
  confidence: number;
  questions: ClarificationQuestion[];
  summary: string;
}

const CLARIFICATION_SYSTEM_PROMPT = `你是一位产品经理，在项目启动前需要确认关键需求。

根据项目的推理结果，生成 3-6 个最关键的澄清问题。
每个问题必须：
1. 直接影响技术方案的选择
2. 提供 2-4 个具体选项（不要"其他"这种无意义选项）
3. 按影响程度排序

输出 JSON 格式：
{
  "questions": [
    {
      "id": "q1",
      "question": "问题内容",
      "options": ["选项1", "选项2", "选项3"],
      "category": "业务|技术|安全|体验",
      "impact": "high|medium|low"
    }
  ],
  "summary": "为什么需要这些问题的简要说明"
}`;

function buildClarificationQuestionsLocal(reasoning: ProjectReasoning): ClarificationQuestion[] {
  const questions: ClarificationQuestion[] = [];
  let qId = 0;

  const nextId = () => `q${++qId}`;

  if (reasoning.risks.some(r => r.includes('支付') || r.includes('交易') || r.includes('资金'))) {
    questions.push({
      id: nextId(),
      question: '是否需要集成真实支付系统？',
      options: ['需要（接入微信/支付宝）', '模拟支付即可', '暂不需要支付功能'],
      category: '业务',
      impact: 'high',
    });
  }

  if (reasoning.domainFeatures.some(f => f.includes('社交') || f.includes('关注') || f.includes('消息'))) {
    questions.push({
      id: nextId(),
      question: '是否需要实时通讯能力？',
      options: ['需要实时聊天（WebSocket）', '仅站内信/通知即可', '暂不需要'],
      category: '技术',
      impact: 'high',
    });
  }

  if (reasoning.primaryType.includes('campus') || reasoning.domainFeatures.some(f => f.includes('校园'))) {
    questions.push({
      id: nextId(),
      question: '用户范围是否限定为校园内？',
      options: ['仅本校学生', '开放注册，校园为主', '面向所有用户'],
      category: '业务',
      impact: 'high',
    });
  }

  if (reasoning.hiddenRequirements.some(r => r.includes('信用') || r.includes('争议') || r.includes('审核'))) {
    questions.push({
      id: nextId(),
      question: '内容/交易安全如何保障？',
      options: ['人工审核为主', 'AI 自动审核 + 人工复审', '暂不处理'],
      category: '安全',
      impact: 'high',
    });
  }

  if (reasoning.complexity !== 'low') {
    questions.push({
      id: nextId(),
      question: '目标部署平台是？',
      options: ['Vercel（推荐）', '自建服务器', '小程序 + Web', '仅移动端 App'],
      category: '技术',
      impact: 'medium',
    });
  }

  if (reasoning.secondaryTypes.length > 0) {
    questions.push({
      id: nextId(),
      question: 'MVP 阶段优先实现哪些功能？',
      options: generateMVPOptions(reasoning),
      category: '业务',
      impact: 'high',
    });
  }

  if (questions.length === 0) {
    questions.push({
      id: nextId(),
      question: '是否需要用户认证系统？',
      options: ['邮箱/手机号注册', '第三方登录（微信/GitHub）', '暂不需要'],
      category: '技术',
      impact: 'medium',
    });
  }

  return questions;
}

function generateMVPOptions(reasoning: ProjectReasoning): string[] {
  const options: string[] = [];
  const types = [reasoning.primaryType, ...reasoning.secondaryTypes];

  if (types.some(t => t.includes('marketplace') || t.includes('ecommerce'))) {
    options.push('商品发布与浏览');
  }
  if (types.some(t => t.includes('social') || t.includes('community'))) {
    options.push('用户互动与内容发布');
  }
  if (types.some(t => t.includes('saas') || t.includes('admin'))) {
    options.push('后台管理与数据分析');
  }
  if (options.length < 2) {
    options.push('核心功能 MVP', '用户系统');
  }
  options.push('全部同时推进');

  return options;
}

function getLLMConfig() {
  return {
    apiKey: process.env.OPENAI_API_KEY || '',
    baseUrl: process.env.OPENAI_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4',
    model: process.env.OPENAI_MODEL || 'glm-4-flash',
  };
}

export async function generateClarifications(
  input: string,
  reasoning: ProjectReasoning
): Promise<ClarificationResult> {
  if (reasoning.confidence >= 80) {
    return {
      needed: false,
      confidence: reasoning.confidence,
      questions: [],
      summary: `分析确信度 ${reasoning.confidence}%，无需额外澄清`,
    };
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    const questions = buildClarificationQuestionsLocal(reasoning);
    return {
      needed: true,
      confidence: reasoning.confidence,
      questions,
      summary: `分析确信度仅 ${reasoning.confidence}%，建议确认以上问题以提高输出质量`,
    };
  }

  try {
    const { baseUrl, model } = getLLMConfig();
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: CLARIFICATION_SYSTEM_PROMPT },
          { role: 'user', content: `用户描述：「${input}」\n\n当前推理结果：\n${JSON.stringify(reasoning, null, 2)}\n\n确信度：${reasoning.confidence}%\n\n请生成澄清问题。` },
        ],
        temperature: 0.3,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const questions = buildClarificationQuestionsLocal(reasoning);
      return {
        needed: true,
        confidence: reasoning.confidence,
        questions,
        summary: `分析确信度仅 ${reasoning.confidence}%，建议确认以上问题`,
      };
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const questions: ClarificationQuestion[] = (parsed.questions || []).map((q: Record<string, unknown>, i: number) => ({
        id: q.id || `q${i + 1}`,
        question: String(q.question || ''),
        options: Array.isArray(q.options) ? q.options.map(String) : [],
        category: String(q.category || '业务'),
        impact: (['high', 'medium', 'low'].includes(q.impact as string) ? q.impact : 'medium') as 'high' | 'medium' | 'low',
      }));

      return {
        needed: true,
        confidence: reasoning.confidence,
        questions,
        summary: String(parsed.summary || `确信度 ${reasoning.confidence}%，需要确认以下问题`),
      };
    }

    const questions = buildClarificationQuestionsLocal(reasoning);
    return {
      needed: true,
      confidence: reasoning.confidence,
      questions,
      summary: `确信度 ${reasoning.confidence}%，需要确认以下问题`,
    };
  } catch {
    const questions = buildClarificationQuestionsLocal(reasoning);
    return {
      needed: true,
      confidence: reasoning.confidence,
      questions,
      summary: `确信度 ${reasoning.confidence}%，需要确认以下问题`,
    };
  }
}

export function mergeAnswersWithContext(
  original: string,
  answers: Record<string, string>,
  questions: ClarificationQuestion[]
): string {
  const answerLines = questions
    .filter(q => answers[q.id])
    .map(q => `- ${q.question} ${answers[q.id]}`);

  if (answerLines.length === 0) return original;

  return `${original}\n\n【用户补充确认】\n${answerLines.join('\n')}`;
}
