import { NextRequest } from 'next/server';
import {
  inferIntent,
  decideArchitecture,
  compilePrompt,
} from '@/lib/prompt-orchestrator/reasoner';
import type { ReasoningStep } from '@/lib/prompt-orchestrator/reasoner';

export const runtime = 'nodejs';

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
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        send({ type: 'progress', step: 'intent', status: 'active' });

        const intent = await inferIntent(userInput);
        const intentStep: ReasoningStep = { type: 'intent', label: '意图识别', result: intent, status: 'done' };
        send({ type: 'step', step: intentStep });

        send({ type: 'progress', step: 'architecture', status: 'active' });

        const architecture = await decideArchitecture(intent);
        const archStep: ReasoningStep = { type: 'architecture', label: '架构决策', result: architecture, status: 'done' };
        send({ type: 'step', step: archStep });

        send({ type: 'progress', step: 'compile', status: 'active' });

        const prompt = await compilePrompt(intent, architecture, userInput);
        const compileStep: ReasoningStep = { type: 'compile', label: 'Prompt 编译', result: prompt, status: 'done' };
        send({ type: 'step', step: compileStep });

        send({ type: 'done', prompt });
      } catch (e) {
        const msg = e instanceof Error ? e.message : '推理失败';
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