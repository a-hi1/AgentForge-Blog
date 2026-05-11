import { NextRequest } from 'next/server';
import {
  inferIntent,
  decideArchitecture,
  compilePrompt,
} from '@/lib/prompt-orchestrator/reasoner';
import type { ReasoningStep } from '@/lib/prompt-orchestrator/reasoner';

export const runtime = 'nodejs';
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

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body?.input?.trim()) {
    return Response.json({ error: '请提供产品想法' }, { status: 400 });
  }

  const userInput: string = body.input.trim();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch { /* controller may be closed */ }
      };

      try {
        send({ type: 'progress', step: 'intent', status: 'active' });

        const intent = await withRetry(() => inferIntent(userInput), '意图识别');
        send({ type: 'step', step: { type: 'intent', label: '意图识别', result: intent, status: 'done' } as ReasoningStep });

        send({ type: 'progress', step: 'architecture', status: 'active' });

        const architecture = await withRetry(() => decideArchitecture(intent), '架构决策');
        send({ type: 'step', step: { type: 'architecture', label: '架构决策', result: architecture, status: 'done' } as ReasoningStep });

        send({ type: 'progress', step: 'compile', status: 'active' });

        const prompt = await withRetry(() => compilePrompt(intent, architecture, userInput), 'Prompt 编译');
        send({ type: 'step', step: { type: 'compile', label: 'Prompt 编译', result: prompt, status: 'done' } as ReasoningStep });

        send({ type: 'done', prompt, intent, architecture });
      } catch (e) {
        const msg = e instanceof Error ? e.message : '推理失败，请重试';
        send({ type: 'error', error: msg });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}