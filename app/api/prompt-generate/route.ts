import { NextRequest } from 'next/server';
import { inferIntent, decideArchitecture, decomposeToAtomicTasks, compilePrompt } from '@/lib/prompt-orchestrator/reasoner';

export const maxDuration = 120;

const MAX_RETRIES = 2;
const TIMEOUT_MS = 60_000;

async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  for (let i = 0; i <= MAX_RETRIES; i++) {
    try {
      return await Promise.race([
        fn(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`${label} 超时，请重试`)), TIMEOUT_MS)
        ),
      ]);
    } catch (e) {
      if (i === MAX_RETRIES) throw e;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw new Error(`${label} 失败`);
}

function sse(data: Record<string, unknown>) {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: NextRequest) {
  const { userInput } = await req.json();

  if (!userInput || typeof userInput !== 'string' || userInput.trim().length < 2) {
    return new Response(sse({ type: 'error', error: '请输入至少 10 个字的需求描述' }), {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
    });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(new TextEncoder().encode(sse(data)));
      };

      try {
        send({ type: 'progress', step: 'intent', status: 'running' });
        const intent = await withRetry(() => inferIntent(userInput.trim()), '意图识别');
        send({ type: 'progress', step: 'intent', status: 'done' });

        send({ type: 'progress', step: 'architecture', status: 'running' });
        const architecture = await withRetry(() => decideArchitecture(intent), '架构决策');
        send({ type: 'progress', step: 'architecture', status: 'done' });

        send({ type: 'progress', step: 'decompose', status: 'running' });
        const decompose = await withRetry(() => decomposeToAtomicTasks(intent, architecture, userInput.trim()), '任务拆解');
        send({ type: 'progress', step: 'decompose', status: 'done' });

        send({ type: 'progress', step: 'compile', status: 'running' });
        const prompt = await withRetry(() => compilePrompt(intent, architecture, decompose, userInput.trim()), 'Prompt 编译');
        send({ type: 'progress', step: 'compile', status: 'done' });

        send({ type: 'done', prompt, intent, architecture, decompose });
      } catch (e) {
        const msg = e instanceof Error ? e.message : '生成失败，请重试';
        send({ type: 'error', error: msg });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  });
}
