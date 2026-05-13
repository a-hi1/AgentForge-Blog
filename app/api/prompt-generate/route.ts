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

const PER_CALL_TIMEOUT = 120_000;
const HEARTBEAT_MS = 10_000;

interface UnifiedIntent extends IntentResult {
  techStack: {
    frontend: string;
    backend: string;
    db: string;
    infra: string[];
  };
}

async function inferUnifiedIntent(userInput: string): Promise<UnifiedIntent> {
  const system = `你是一位有 10 年经验的产品技术顾问。同时完成意图分析和技术选型。

技术选型原则：
- 最合适 ≠ 最先进。验证期项目用重型框架是浪费时间。
- 不是所有项目都需要 React/Next.js。
- 不是所有项目都需要后端。

输出严格 JSON：
{
  "businessGoal": "string",
  "userType": "string",
  "productShape": "string",
  "lifecycle": "string",
  "ambiguity": "string",
  "decisionPoints": ["string"],
  "techStack": {
    "frontend": "string",
    "backend": "string",
    "db": "string",
    "infra": ["string"]
  }
}`;

  return await callLLMWithJSON<UnifiedIntent>([
    { role: 'system', content: system },
    { role: 'user', content: userInput },
  ]);
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

  return `# ${intent.businessGoal}

## 项目上下文

- **目标**：${intent.businessGoal}
- **用户**：${intent.userType}
- **形态**：${intent.productShape}
- **阶段**：${intent.lifecycle}
- **注意**：${intent.ambiguity || '无特别模糊点'}

## 技术栈

- 前端：${ts.frontend}
- 后端：${ts.backend}
- 数据库：${ts.db}
- 基础设施：${ts.infra.join('、')}

## 文件任务

${tasks}

## 开发阶段

${phases}

## 开发约束

- 每个阶段完成后暂停，确认后再继续
- 不修改未列出的文件
- 不引入未列出的依赖
- 遇到歧义先确认再实现`;
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

        // Step 1: Intent
        send({ type: 'progress', step: 'intent', status: 'running' });
        let intent: UnifiedIntent;
        try {
          intent = await withTimeout(inferUnifiedIntent(input), PER_CALL_TIMEOUT, '意图识别');
          send({ type: 'progress', step: 'intent', status: 'done', result: intent });
        } catch (err) {
          console.error('[context-compiler] intent error', err);
          send({ type: 'step_error', step: 'intent', error: '意图分析失败，请重试' });
          return;
        }

        // Step 2: Decompose
        send({ type: 'progress', step: 'decompose', status: 'running' });
        let decompose: DecomposeResult;
        try {
          decompose = await withTimeout(decomposeToAtomicTasks(intent, input), PER_CALL_TIMEOUT, '任务拆解');
          send({ type: 'progress', step: 'decompose', status: 'done', result: decompose });
        } catch (err) {
          console.error('[context-compiler] decompose error', err);
          send({ type: 'step_error', step: 'decompose', error: '任务拆解失败，请重试' });
          return;
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
