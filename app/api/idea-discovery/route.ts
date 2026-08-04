// 方向探索 SSE Streaming API
import { NextRequest } from 'next/server';
import {
  startDiscovery,
  continueDiscovery,
  DiscoverySession,
} from '@/lib/idea-discovery';
import { enforceRateLimit } from '@/lib/rate-limiter';

export const maxDuration = 300;
export const runtime = 'nodejs';

function sendSSE(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  data: any
) {
  try {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
  } catch (error) {
    console.error('SSE send error:', error);
  }
}

export async function POST(req: NextRequest) {
  const limited = enforceRateLimit(req);
  if (limited) return limited;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const body = await req.json();
        const { idea, session: clientSession, answers } = body;

        let currentSession: DiscoverySession;

        const eventHandler = (event: any) => {
          sendSSE(controller, encoder, event);
        };

        // 优先使用客户端传来的完整session，避免服务器内存丢失问题
        if (clientSession && clientSession.id && answers) {
          currentSession = await continueDiscovery(
            clientSession,
            answers || {},
            eventHandler
          );
        } else {
          currentSession = await startDiscovery(idea || '', eventHandler);
        }

        const finalReport = currentSession.collectedFacts.finalReport;

        sendSSE(controller, encoder, {
          type: 'session_update',
          session: currentSession,
          report: finalReport,
        });

        sendSSE(controller, encoder, {
          type: 'complete',
          session: currentSession,
          report: finalReport,
        });

        controller.close();
      } catch (error) {
        console.error('Idea discovery error:', error);
        sendSSE(controller, encoder, {
          type: 'error',
          error:
            error instanceof Error ? error.message : 'An error occurred',
        });
        controller.close();
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
