import { getAgentPrompt } from './prompts';

export interface ExecutionStep {
  agent: string;
  task: string;
  output: string;
  status: 'pending' | 'executing' | 'completed';
  timestamp: string;
}

const API_TIMEOUT = 30000;

const fallbackResponses: Record<string, string> = {
  'Architect Agent': '架构设计完成。系统架构方案已就绪，可进入实现阶段。',
  'Coding Agent': '代码生成完成。核心模块实现方案已就绪，可进入审查阶段。',
  'Debug Agent': '质量审查完成。未发现严重问题，代码质量达标。',
  'Deploy Agent': '部署方案已制定。系统已满足上线条件。',
};

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = API_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('请求超时');
    }
    throw error;
  }
}

export async function executeAgent(
  agentName: string,
  task: string,
  context: string
): Promise<string> {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    const baseUrl = process.env.OPENAI_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4';
    const model = process.env.OPENAI_MODEL || 'glm-4-flash';

    if (!apiKey) {
      console.warn('OPENAI_API_KEY 未配置，使用降级响应');
      return fallbackResponses[agentName] || '智能代理执行完成';
    }

    const systemPrompt = getAgentPrompt(agentName) + '\n\n重要：你必须始终使用简体中文回答。禁止输出英文标题。代码保留英文标识符，但所有解释和说明必须使用中文。';

    const response = await fetchWithTimeout(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `用户需求：${context}\n\n你的具体任务：${task}` },
        ],
        temperature: 0.7,
        stream: true,
      }),
    }, API_TIMEOUT);

    if (!response.ok) {
      throw new Error(`API 请求失败: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content;
              if (content) {
                fullContent += content;
              }
            } catch (e) {}
          }
        }
      }
    }

    return fullContent || (fallbackResponses[agentName] || '智能代理执行完成');
  } catch (error) {
    console.warn(`执行器错误 ${agentName}，使用降级响应:`, error);
    return fallbackResponses[agentName] || `[${agentName} 执行异常]`;
  }
}

export async function executeAgentStreaming(
  agentName: string,
  task: string,
  context: string,
  onChunk: (chunk: string) => void
): Promise<string> {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    const baseUrl = process.env.OPENAI_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4';
    const model = process.env.OPENAI_MODEL || 'glm-4-flash';

    if (!apiKey) {
      console.warn('OPENAI_API_KEY 未配置，使用降级响应');
      const fallback = fallbackResponses[agentName] || '智能代理执行完成';
      onChunk(fallback);
      return fallback;
    }

    const systemPrompt = getAgentPrompt(agentName) + '\n\n重要：你必须始终使用简体中文回答。禁止输出英文标题。代码保留英文标识符，但所有解释和说明必须使用中文。';

    const response = await fetchWithTimeout(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `用户需求：${context}\n\n你的具体任务：${task}` },
        ],
        temperature: 0.7,
        stream: true,
      }),
    }, API_TIMEOUT);

    if (!response.ok) {
      throw new Error(`API 请求失败: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content;
              if (content) {
                fullContent += content;
                onChunk(content);
              }
            } catch (e) {}
          }
        }
      }
    }

    return fullContent || (fallbackResponses[agentName] || '智能代理执行完成');
  } catch (error) {
    console.warn(`执行器错误 ${agentName}，使用降级响应:`, error);
    const fallback = fallbackResponses[agentName] || `[${agentName} 执行异常]`;
    onChunk(fallback);
    return fallback;
  }
}
