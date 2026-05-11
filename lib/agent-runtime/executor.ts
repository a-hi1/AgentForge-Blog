import { getAgentPrompt, getAgentDefaultTask } from './prompts';
import { validateOutput, buildRetryInstruction } from './outputValidator';
import { CHINESE_OUTPUT_INSTRUCTION } from './constants';

export type ExecutionSource = 'real-api' | 'failed';

export interface ExecutionResult {
  output: string;
  success: boolean;
  source: ExecutionSource;
  error?: string;
  duration: number;
}

interface AgentConfig {
  name: string;
  task: string;
  temperature?: number;
  maxTokens?: number;
}

function getConfig(agentName: string, task: string): AgentConfig {
  return {
    name: agentName,
    task: task,
    temperature: 0.4,
    maxTokens: 4000,
  };
}

export async function executeAgent(
  agentName: string,
  task: string,
  context: string,
  systemPromptOverride?: string
): Promise<ExecutionResult> {
  const startTime = Date.now();
  const apiKey = process.env.OPENAI_API_KEY;
  const baseUrl = process.env.OPENAI_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4';
  const model = process.env.OPENAI_MODEL || 'glm-4-flash';

  if (!apiKey) {
    return {
      output: '',
      success: false,
      source: 'failed',
      error: '未配置 API Key，请在 .env.local 中设置 OPENAI_API_KEY',
      duration: Date.now() - startTime,
    };
  }

  const config = getConfig(agentName, task);
  const systemPrompt = systemPromptOverride || getAgentPrompt(agentName);
  const fullTask = getAgentDefaultTask(agentName, task);

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `${CHINESE_OUTPUT_INSTRUCTION}\n\n用户需求：${context}\n\n你的具体任务：${fullTask}` },
        ],
        temperature: config.temperature,
        max_tokens: config.maxTokens,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      return {
        output: '',
        success: false,
        source: 'failed',
        error: `API 调用失败: ${response.status} ${response.statusText}${errorText ? ` - ${errorText.slice(0, 200)}` : ''}`,
        duration: Date.now() - startTime,
      };
    }

    const result = await response.json();
    const content = result.choices[0]?.message?.content;

    if (content) {
      const validation = validateOutput(content);
      if (!validation.isValid && validation.chineseRatio < 0.4) {
        const retryResult = await retryWithCorrection(agentName, fullTask, context, systemPrompt, config, validation.issues);
        return { ...retryResult, source: 'real-api', duration: Date.now() - startTime };
      }
      return { output: content, success: true, source: 'real-api', duration: Date.now() - startTime };
    }

    return {
      output: '',
      success: false,
      source: 'failed',
      error: 'API 返回空内容',
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      output: '',
      success: false,
      source: 'failed',
      error: error instanceof Error ? error.message : 'API 调用异常',
      duration: Date.now() - startTime,
    };
  }
}

async function retryWithCorrection(
  agentName: string,
  task: string,
  context: string,
  systemPrompt: string,
  config: AgentConfig,
  issues: string[]
): Promise<ExecutionResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseUrl = process.env.OPENAI_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4';
  const model = process.env.OPENAI_MODEL || 'glm-4-flash';

  if (!apiKey) {
    return { output: '', success: false, source: 'failed', error: '未配置 API Key', duration: 0 };
  }

  const retryInstruction = buildRetryInstruction(issues);

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `${CHINESE_OUTPUT_INSTRUCTION}${retryInstruction}\n\n用户需求：${context}\n\n你的具体任务：${task}` },
        ],
        temperature: Math.max(0.2, (config.temperature || 0.4) - 0.1),
        max_tokens: config.maxTokens,
      }),
    });

    if (!response.ok) {
      return { output: '', success: false, source: 'failed', error: `重试失败: ${response.status}`, duration: 0 };
    }

    const result = await response.json();
    const content = result.choices[0]?.message?.content;
    if (content) {
      return { output: content, success: true, source: 'real-api', duration: 0 };
    }
    return { output: '', success: false, source: 'failed', error: '重试返回空内容', duration: 0 };
  } catch {
    return { output: '', success: false, source: 'failed', error: '重试调用异常', duration: 0 };
  }
}

export async function executeAgentStreaming(
  agentName: string,
  task: string,
  context: string,
  onChunk: (chunk: string) => Promise<void>,
  systemPromptOverride?: string,
  onSource?: (source: ExecutionSource) => void
): Promise<ExecutionResult> {
  const startTime = Date.now();
  const apiKey = process.env.OPENAI_API_KEY;
  const baseUrl = process.env.OPENAI_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4';
  const model = process.env.OPENAI_MODEL || 'glm-4-flash';

  if (!apiKey) {
    onSource?.('failed');
    return {
      output: '',
      success: false,
      source: 'failed',
      error: '未配置 API Key，请在 .env.local 中设置 OPENAI_API_KEY',
      duration: Date.now() - startTime,
    };
  }

  const config = getConfig(agentName, task);
  const systemPrompt = systemPromptOverride || getAgentPrompt(agentName);
  const fullTask = getAgentDefaultTask(agentName, task);

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `${CHINESE_OUTPUT_INSTRUCTION}\n\n用户需求：${context}\n\n你的具体任务：${fullTask}` },
        ],
        temperature: config.temperature,
        max_tokens: config.maxTokens,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      onSource?.('failed');
      return {
        output: '',
        success: false,
        source: 'failed',
        error: `API 调用失败: ${response.status} ${response.statusText}${errorText ? ` - ${errorText.slice(0, 200)}` : ''}`,
        duration: Date.now() - startTime,
      };
    }

    onSource?.('real-api');

    const reader = response.body?.getReader();
    if (!reader) {
      onSource?.('failed');
      return {
        output: '',
        success: false,
        source: 'failed',
        error: '无法读取 API 响应流',
        duration: Date.now() - startTime,
      };
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let fullOutput = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ') && line !== 'data: [DONE]') {
          try {
            const json = JSON.parse(line.slice(6));
            const content = json.choices?.[0]?.delta?.content;
            if (content) {
              fullOutput += content;
              await onChunk(content);
            }
          } catch {
            // Ignore malformed JSON chunks
          }
        }
      }
    }

    return { output: fullOutput, success: true, source: 'real-api', duration: Date.now() - startTime };
  } catch (error) {
    onSource?.('failed');
    return {
      output: '',
      success: false,
      source: 'failed',
      error: error instanceof Error ? error.message : 'API 调用异常',
      duration: Date.now() - startTime,
    };
  }
}


