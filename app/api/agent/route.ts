import { NextResponse } from 'next/server';
import { executeAgentStreaming } from '@/lib/agent-runtime/executor';
import { generatePlan } from '@/lib/agent-runtime/planner';
import { MemoryManager } from '@/lib/agent-runtime/memoryManager';
import { generateId } from '@/lib/agent-runtime/storage';
import { validateOutput } from '@/lib/agent-runtime/outputValidator';
import { analyzeDomain, buildDomainContext } from '@/lib/agent-runtime/domainAnalyzer';
import type { ExecutionRecord } from '@/lib/agent-runtime/storage';

export async function POST(request: Request) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let executionSteps: any[] = [];
      let executionId: string | null = null;
      let memoryInfluenced = false;

      const encodeStreamEvent = (event: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      try {
        const { prompt } = await request.json();

        if (!prompt || typeof prompt !== 'string') {
          encodeStreamEvent({
            type: 'error',
            message: '请提供有效的任务描述',
          });
          controller.close();
          return;
        }

        executionId = generateId();
        
        const domainAnalysis = analyzeDomain(prompt);
        const domainContext = buildDomainContext(domainAnalysis);

        const retrievedMemories = await MemoryManager.retrieveRelevantMemories(prompt);
        const memoryContext = MemoryManager.formatMemoryContext(retrievedMemories);

        if (retrievedMemories.length > 0) {
          memoryInfluenced = true;
          encodeStreamEvent({
            type: 'memory_status',
            message: `已召回 ${retrievedMemories.length} 条相关记忆`,
          });
        }

        encodeStreamEvent({
          type: 'memory_influence',
          memories: retrievedMemories.map(m => ({
            prompt: m.memory.prompt.slice(0, 100),
            relevance_score: m.relevance_score,
            reason: m.relevance_reason,
          })),
          memory_influenced: memoryInfluenced,
        });

        const planMemories = retrievedMemories.map(m => m.memory);
        const plan = await generatePlan(prompt, { memories: planMemories as any });
        memoryInfluenced = memoryInfluenced || plan.memoryInfluenced;

        const contextWithDomain = domainContext || '';

        for (let i = 0; i < plan.steps.length; i++) {
          const step = plan.steps[i];
          
          encodeStreamEvent({
            type: 'step_start',
            step: step.step,
            agent: step.agent,
            task: step.task,
          });

          let fullOutput = '';
          
          const systemOverride = contextWithDomain 
            ? `${step.agent}\n\n${contextWithDomain}`
            : undefined;

          await executeAgentStreaming(
            step.agent,
            step.task,
            `${prompt}\n\n${memoryContext}`.trim(),
            async (chunk: string) => {
              fullOutput += chunk;
              encodeStreamEvent({
                type: 'step_chunk',
                step: step.step,
                agent: step.agent,
                output: chunk,
              });
            },
            systemOverride
          );

          const qualityValidation = validateOutput(fullOutput);
          
          encodeStreamEvent({
            type: 'step_complete',
            step: step.step,
            agent: step.agent,
            task: step.task,
            output: fullOutput,
            status: 'completed',
            quality_score: qualityValidation.score,
            chinese_ratio: Math.round(qualityValidation.chineseRatio * 100),
          });

          executionSteps.push({
            ...step,
            output: fullOutput,
            status: 'completed',
            quality_score: qualityValidation.score,
            timestamp: new Date().toISOString(),
          });
        }

        if (executionId) {
          const avgQuality = Math.round(
            executionSteps.reduce((s, e) => s + (e.quality_score || 80), 0) / executionSteps.length
          );

          const record: ExecutionRecord = {
            id: executionId,
            prompt,
            steps: executionSteps.map(s => ({
              agent: s.agent,
              task: s.task,
              output: s.output,
              status: s.status as 'completed',
              timestamp: s.timestamp,
            })),
            status: 'completed',
            memory_influenced: memoryInfluenced,
            adaptation_reason: plan.adaptationReasons,
            timestamp: new Date().toISOString(),
          };

          await import('@/lib/agent-runtime/storage').then(m => m.saveExecution(record));

          try {
            const lessons = await MemoryManager.extractExecutionLessons({
              prompt,
              steps: executionSteps,
              status: 'completed',
            });
            await MemoryManager.storeExecutionMemory(executionId, prompt, lessons, `质量评分: ${avgQuality}/100`);
          } catch (memErr) {
            console.warn('[Agent API] Memory storage failed:', memErr);
          }
        }

        encodeStreamEvent({
          type: 'complete',
          executionId: executionId,
          memory_influenced: memoryInfluenced,
          domain: domainAnalysis.domain,
          total_steps: executionSteps.length,
          avg_quality: Math.round(
            executionSteps.reduce((s, e) => s + (e.quality_score || 80), 0) / executionSteps.length
          ),
        });

      } catch (error) {
        console.error('[Agent API] Error:', error);
        encodeStreamEvent({
          type: 'error',
          message: error instanceof Error ? error.message : '系统处理异常，请稍后重试',
        });
      } finally {
        controller.close();
      }
    }
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
