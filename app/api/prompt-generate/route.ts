import { NextRequest } from 'next/server';
import {
  inferIntent,
  decomposeToAtomicTasks,
  IntentResult,
  DecomposeResult,
} from '@/lib/prompt-orchestrator/reasoner';
import { callLLMWithJSON } from '@/lib/prompt-orchestrator/llm';

export const maxDuration = 300;
export const runtime = 'nodejs';

const PER_CALL_TIMEOUT = 300_000; // 5分钟超时
const HEARTBEAT_MS = 10_000;

interface UnifiedIntent extends IntentResult {
  techStack: {
    frontend: string;
    backend: string;
    db: string;
    infra: string[];
  };
  coreFeatures: string[];
  dataModels: { name: string; fields: string[] }[];
  apiEndpoints: { method: string; path: string; description: string }[];
  securityNotes: string[];
}

// 降级默认技术栈
function getDefaultTechStack(): UnifiedIntent['techStack'] {
  return {
    frontend: "Next.js + React",
    backend: "Next.js API Routes",
    db: "LocalStorage / SQLite",
    infra: ["Vercel"]
  };
}

// 降级默认意图
function getDefaultIntent(userInput: string): UnifiedIntent {
  return {
    businessGoal: userInput,
    userType: "个人项目",
    productShape: "Web",
    lifecycle: "验证期",
    ambiguity: "继续推进开发",
    decisionPoints: [userInput],
    techStack: getDefaultTechStack(),
    coreFeatures: ["核心功能1", "核心功能2", "核心功能3"],
    dataModels: [],
    apiEndpoints: [],
    securityNotes: []
  };
}

async function inferUnifiedIntent(userInput: string): Promise<UnifiedIntent> {
  const system = `你是产品技术顾问+全栈架构师。分析用户需求，输出具体的开发方案。

## 重要规则
1. 技术栈必须做出明确选择，不要给"或"的选项
2. 核心功能要具体到可开发的程度，不要泛泛而谈
3. 数据模型要列出实体和关键字段
4. API要列出具体的端点
5. 如果用户提到了安全/隐私要求，要给出具体方案

## 输出格式（严格JSON）
{
  "businessGoal": "一句话核心目标",
  "userType": "个人/小团队/公众产品",
  "productShape": "Web/Mobile/API/CLI",
  "lifecycle": "验证期/MVP/增长期",
  "ambiguity": "缺失的关键信息",
  "decisionPoints": ["关键决策点1", "关键决策点2"],
  "techStack": {
    "frontend": "具体技术（只选一个）",
    "backend": "具体技术（只选一个）",
    "db": "具体数据库（只选一个）",
    "infra": ["具体部署方案"]
  },
  "coreFeatures": [
    "功能1：具体描述",
    "功能2：具体描述",
    "功能3：具体描述"
  ],
  "dataModels": [
    {
      "name": "实体名",
      "fields": ["字段1: 类型", "字段2: 类型", "字段3: 类型"]
    }
  ],
  "apiEndpoints": [
    {
      "method": "GET/POST/PUT/DELETE",
      "path": "/api/具体路径",
      "description": "接口功能描述"
    }
  ],
  "securityNotes": [
    "安全/隐私措施1",
    "安全/隐私措施2"
  ]
}`;

  try {
    return await callLLMWithJSON<UnifiedIntent>([
      { role: 'system', content: system },
      { role: 'user', content: userInput },
    ], 2, 0.25);
  } catch (error) {
    console.error('inferUnifiedIntent failed, using fallback:', error);
    return getDefaultIntent(userInput);
  }
}

function buildContextExport(
  intent: UnifiedIntent,
  decompose: DecomposeResult,
  userInput: string
): string {
  const tasks = decompose.tasks.map(t =>
    `- **${t.file}** — ${t.responsibility}${t.dependencies.length ? `（依赖：${t.dependencies.join(', ')}）` : ''}`
  ).join('\n');

  const phases = decompose.phases.map(p => {
    const files = decompose.tasks.filter(t => t.phase === p.phase).map(t => t.file);
    return `### Phase ${p.phase}: ${p.label}\n${files.map(f => `- ${f}`).join('\n')}`;
  }).join('\n\n');

  const ts = intent.techStack;

  // 核心功能
  const features = intent.coreFeatures?.length
    ? intent.coreFeatures.map((f, i) => `${i + 1}. ${f}`).join('\n')
    : '待定义';

  // 数据模型
  const models = intent.dataModels?.length
    ? intent.dataModels.map(m =>
      `**${m.name}**\n${m.fields.map(f => `- ${f}`).join('\n')}`
    ).join('\n\n')
    : '无特定数据模型';

  // API接口
  const apis = intent.apiEndpoints?.length
    ? intent.apiEndpoints.map(a =>
      `- \`${a.method} ${a.path}\` — ${a.description}`
    ).join('\n')
    : '无API接口（纯前端应用）';

  // 安全/隐私
  const security = intent.securityNotes?.length
    ? intent.securityNotes.map(s => `- ${s}`).join('\n')
    : '无特殊安全要求';

  return `# ${intent.businessGoal}

## 项目上下文

- **用户**：${intent.userType}
- **形态**：${intent.productShape}
- **阶段**：${intent.lifecycle}
${intent.ambiguity ? `- **待确认**：${intent.ambiguity}` : ''}

## 核心功能

${features}

## 技术栈

- 前端：${ts.frontend}
- 后端：${ts.backend}
- 数据库：${ts.db}
- 基础设施：${ts.infra.join('、')}

## 数据模型

${models}

## API 接口

${apis}

## 安全与隐私

${security}

## 文件任务

${tasks}

## 开发阶段

${phases}

## 开发约束

- 每个阶段完成后暂停，确认后再继续
- 不修改未列出的文件
- 不引入未列出的依赖
- 遇到歧义先确认再实现
- 严格遵循上述数据模型和API定义`;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} 超时 (${ms / 1000}s)`)), ms)
    ),
  ]);
}

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();
  let pingTimer: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`)); } catch { /* closed */ }
      };
      const sendPing = () => {
        try { controller.enqueue(encoder.encode(`event: ping\ndata: keepalive\n\n`)); } catch { /* ignore */ }
      };

      pingTimer = setInterval(sendPing, HEARTBEAT_MS);

      try {
        const body = await req.json();
        const userInput = body?.userInput;

        if (!userInput || typeof userInput !== 'string' || userInput.trim().length < 2) {
          send({ type: 'error', error: '请输入需求描述' });
          return;
        }

        const input = userInput.trim();

        // Step 1: Intent（带降级）
        send({ type: 'progress', step: 'intent', status: 'running' });
        let intent: UnifiedIntent;
        try {
          intent = await withTimeout(inferUnifiedIntent(input), PER_CALL_TIMEOUT, '意图识别');
          send({ type: 'progress', step: 'intent', status: 'done', result: intent });
        } catch (err) {
          console.warn('[context-compiler] intent error, using fallback', err);
          intent = getDefaultIntent(input);
          send({ type: 'progress', step: 'intent', status: 'done', result: intent });
        }

        // Step 2: Decompose（带降级）
        send({ type: 'progress', step: 'decompose', status: 'running' });
        let decompose: DecomposeResult;
        try {
          decompose = await withTimeout(decomposeToAtomicTasks(intent, input), PER_CALL_TIMEOUT, '任务拆解');
          send({ type: 'progress', step: 'decompose', status: 'done', result: decompose });
        } catch (err) {
          console.warn('[context-compiler] decompose error, using fallback', err);
          // 使用reasoner中的降级机制
          const simpleIntent: IntentResult = {
            businessGoal: intent.businessGoal,
            userType: intent.userType,
            productShape: intent.productShape,
            lifecycle: intent.lifecycle,
            ambiguity: intent.ambiguity,
            decisionPoints: intent.decisionPoints
          };
          decompose = await decomposeToAtomicTasks(simpleIntent, input);
          send({ type: 'progress', step: 'decompose', status: 'done', result: decompose });
        }

        // Step 3: Compile
        send({ type: 'progress', step: 'compile', status: 'running' });
        const prompt = buildContextExport(intent, decompose, input);
        send({ type: 'progress', step: 'compile', status: 'done' });

        send({ type: 'done', prompt, intent, decompose });
      } catch (err) {
        const msg = err instanceof Error ? err.message : '生成失败';
        send({ type: 'error', error: msg });
      } finally {
        if (pingTimer) clearInterval(pingTimer);
        try { controller.close(); } catch { /* closed */ }
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
