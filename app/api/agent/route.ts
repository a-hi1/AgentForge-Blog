import { NextRequest } from 'next/server';
import { createPlan, MemoryAwarePlan } from '@/lib/agent-runtime/planner';
import { executeAgentStreaming } from '@/lib/agent-runtime/executor';
import { formatStepStart, formatStepChunk, formatStepComplete, formatComplete, formatMemoryInfluence, formatMemoryStatus, encodeStreamEvent } from '@/lib/agent-runtime/formatter';
import { createExecution, appendExecutionStep, completeExecution, getExecutionById, saveExecution, ExecutionRecord } from '@/lib/agent-runtime/storage';
import MemoryManager from '@/lib/agent-runtime/memoryManager';
import { rateLimiter } from '@/lib/rate-limiter';

export async function POST(request: NextRequest) {
  // 1. Get client IP for rate limiting
  const clientIp = request.ip || request.headers.get('x-forwarded-for') || 'unknown';

  // 2. Check rate limit
  if (rateLimiter.isRateLimited(clientIp)) {
    const rateLimitInfo = rateLimiter.getRemaining(clientIp);
    return new Response(JSON.stringify({
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
      resetTime: new Date(rateLimitInfo.resetTime).toISOString(),
      remaining: rateLimitInfo.remaining
    }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Remaining': rateLimitInfo.remaining.toString(),
        'X-RateLimit-Reset': rateLimitInfo.resetTime.toString(),
        'Retry-After': Math.ceil((rateLimitInfo.resetTime - Date.now()) / 1000).toString()
      }
    });
  }

  const { prompt } = await request.json();

  if (!prompt) {
    return new Response(JSON.stringify({ error: 'Prompt is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Initialize executionId early for error handling
  let executionId: string | undefined;

  (async () => {
    try {
      console.log('[Agent] Starting memory-augmented execution');
      
      // 1. Create execution record
      executionId = await createExecution(prompt);
      console.log('[Agent] Execution ID:', executionId);
      
      if (!executionId) {
        throw new Error('Failed to create execution ID');
      }
    } catch (error) {
      console.error('[Agent] Execution error:', error);
      if (executionId) {
        await completeExecution(executionId, 'failed');
      }
      await writer.write(encoder.encode(
        encodeStreamEvent(formatComplete())
      ));
      await writer.close();
      return;
    }
    
    const safeExecutionId: string = executionId!;
    
    try {
      // 2. Retrieve relevant memories first
      const relevantMemories = await MemoryManager.retrieveRelevantMemories(prompt);
      console.log('[Agent] Retrieved', relevantMemories.length, 'relevant memories');
      
      // 3. Generate memory-aware plan
      const memoryPlan: MemoryAwarePlan = await createPlan(prompt, relevantMemories);
      console.log('[Agent] Plan influenced:', memoryPlan.memory_influenced);
      
      // 4. Send memory influence info to frontend first
      if (relevantMemories.length > 0) {
        await writer.write(encoder.encode(
          encodeStreamEvent(formatMemoryInfluence({
            memories_used: relevantMemories,
            memory_influenced: memoryPlan.memory_influenced,
            adaptations: memoryPlan.adaptations,
            adaptation_reason: memoryPlan.adaptation_reason,
            memory_influence_level: memoryPlan.memory_influence_level
          }))
        ));
      } else {
        await writer.write(encoder.encode(
          encodeStreamEvent(formatMemoryStatus('No relevant historical memory found'))
        ));
      }
      
      // 5. Execute plan with memory context injection
      const steps = memoryPlan.steps;
      const memoryContext = MemoryManager.formatMemoryContext(relevantMemories);
      
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const stepNumber = i + 1;
        const startTime = Date.now();

        console.log('[Agent] Executing step:', stepNumber, step.agent);

        await appendExecutionStep(safeExecutionId, i, {
          agent: step.agent,
          task: step.task,
          output: '',
          status: 'executing',
          timestamp: new Date().toISOString(),
          start_time: startTime,
        });

        await writer.write(encoder.encode(
          encodeStreamEvent(formatStepStart(stepNumber, step.agent, step.task))
        ));

        let fullOutput = '';
        await executeAgentStreaming(
          step.agent,
          step.task,
          prompt + memoryContext,
          async (chunk) => {
            fullOutput += chunk;
            await appendExecutionStep(safeExecutionId, i, {
              output: fullOutput,
            });
            await writer.write(encoder.encode(
              encodeStreamEvent(formatStepChunk(stepNumber, chunk))
            ));
          }
        );

        await appendExecutionStep(safeExecutionId, i, {
          status: 'completed',
          output: fullOutput,
          timestamp: new Date().toISOString(),
        });

        await writer.write(encoder.encode(
          encodeStreamEvent(formatStepComplete(stepNumber, fullOutput))
        ));
      }

      console.log('[Agent] All steps complete, storing memory');
      
      // 6. Get full execution data and add adaptation metadata
      const finalExecution = await getExecutionById(safeExecutionId);
      
      // 7. Store adaptation metadata
      if (finalExecution) {
        const executionWithMeta: ExecutionRecord = {
          ...finalExecution,
          adaptation_reason: memoryPlan.adaptation_reason,
          memory_influence_level: memoryPlan.memory_influence_level,
          memory_influenced: memoryPlan.memory_influenced
        };
        saveExecution(executionWithMeta);
        
        // 8. Extract and store memories
        const lessons = await MemoryManager.extractExecutionLessons(finalExecution);
        
        // Store the memory
        const storedMemory = await MemoryManager.storeExecutionMemory(
          safeExecutionId,
          prompt,
          lessons
        );
        
        if (storedMemory) {
          console.log('[Agent] Memory stored successfully');
          
          // Link with previous memories
          for (const prevMemory of relevantMemories) {
            await MemoryManager.linkExecutionMemory(
              safeExecutionId,
              prevMemory.memory.execution_id,
              prevMemory.relevance_score,
              'improved_from'
            );
          }
        }
      }
      
      // 9. Mark complete
      await completeExecution(safeExecutionId, 'completed');

      await writer.write(encoder.encode(encodeStreamEvent(formatComplete())));
    } catch (error) {
      console.error('[Agent] Execution error:', error);
      await completeExecution(safeExecutionId, 'failed');
      await writer.write(encoder.encode(
        encodeStreamEvent(formatComplete())
      ));
    } finally {
      await writer.close();
    }
  })();

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
