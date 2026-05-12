// 方向探索 SSE Streaming API
import { NextRequest } from 'next/server';
import {
  startDiscovery,
  continueDiscovery,
  DiscoverySession,
} from '@/lib/idea-discovery';

export const maxDuration = 300;
export const runtime = 'nodejs';

// 简单的内存存储（生产环境应该用数据库）
const sessionStore = new Map<string, DiscoverySession>();

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
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const body = await req.json();
        const { idea, sessionId, answers } = body;

        let session: DiscoverySession;

        if (sessionId && sessionStore.has(sessionId)) {
          // 继续现有会话
          const existingSession = sessionStore.get(sessionId)!;
          session = await continueDiscovery(
            existingSession,
            answers || {},
            (event) => {
              sendSSE(controller, encoder, event);
            }
          );
        } else {
          // 开始新会话
          session = await startDiscovery(idea || '', (event) => {
            sendSSE(controller, encoder, event);
          });
        }

        // 保存会话
        sessionStore.set(session.id, session);

        // 发送完成事件
        sendSSE(controller, encoder, {
          type: 'complete',
          session,
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
