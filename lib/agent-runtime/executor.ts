import { getAgentPrompt, getAgentDefaultTask } from './prompts';
import { validateOutput, buildRetryInstruction } from './outputValidator';
import { CHINESE_OUTPUT_INSTRUCTION } from './constants';

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
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseUrl = process.env.OPENAI_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4';
  const model = process.env.OPENAI_MODEL || 'glm-4-flash';

  if (!apiKey) {
    return generateFallbackResponse(agentName, task, context);
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
      console.error(`[Executor] API call failed: ${response.status} ${response.statusText}`);
      return generateFallbackResponse(agentName, task, context);
    }

    const result = await response.json();
    const content = result.choices[0]?.message?.content;

    if (content) {
      const validation = validateOutput(content);
      if (!validation.isValid && validation.chineseRatio < 0.4) {
        console.warn(`[Executor] Output quality low (score: ${validation.score}), retrying with correction`);
        return await retryWithCorrection(agentName, fullTask, context, systemPrompt, config, validation.issues);
      }
      return content;
    }

    return generateFallbackResponse(agentName, task, context);
  } catch (error) {
    console.error('[Executor] API error:', error);
    return generateFallbackResponse(agentName, task, context);
  }
}

async function retryWithCorrection(
  agentName: string,
  task: string,
  context: string,
  systemPrompt: string,
  config: AgentConfig,
  issues: string[]
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseUrl = process.env.OPENAI_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4';
  const model = process.env.OPENAI_MODEL || 'glm-4-flash';

  if (!apiKey) {
    return generateFallbackResponse(agentName, task, context);
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
      return generateFallbackResponse(agentName, task, context);
    }

    const result = await response.json();
    return result.choices[0]?.message?.content || generateFallbackResponse(agentName, task, context);
  } catch {
    return generateFallbackResponse(agentName, task, context);
  }
}

export async function executeAgentStreaming(
  agentName: string,
  task: string,
  context: string,
  onChunk: (chunk: string) => Promise<void>,
  systemPromptOverride?: string
): Promise<void> {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseUrl = process.env.OPENAI_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4';
  const model = process.env.OPENAI_MODEL || 'glm-4-flash';

  if (!apiKey) {
    const fallback = generateFallbackResponse(agentName, task, context);
    await onChunk(fallback);
    return;
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
      console.error(`[Executor] Streaming API failed: ${response.status}`);
      const fallback = generateFallbackResponse(agentName, task, context);
      await onChunk(fallback);
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      const fallback = generateFallbackResponse(agentName, task, context);
      await onChunk(fallback);
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';

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
              await onChunk(content);
            }
          } catch (e) {
            // Ignore malformed JSON chunks
          }
        }
      }
    }
  } catch (error) {
    console.error('[Executor] Streaming error:', error);
    const fallback = generateFallbackResponse(agentName, task, context);
    await onChunk(fallback);
  }
}

function generateFallbackResponse(agentName: string, task: string, context: string): string {
  const taskPreview = task || context;

  if (agentName.includes('架构') || agentName.includes('Architect') || agentName.includes('产品分析')) {
    return `# 一、业务目标分析

基于用户需求「${taskPreview.slice(0, 80)}」，核心目标是构建一个满足业务场景的系统。

# 二、核心功能拆解

1. 用户模块：处理用户注册、登录和权限管理
2. 核心业务模块：实现主要业务逻辑
3. 数据模块：管理数据存储和查询

# 三、数据模型设计

核心数据表包括用户表、业务主表和关联表，需要考虑索引策略和查询优化。

# 四、系统架构设计

采用前后端分离架构，前端使用 React/Next.js，后端提供 RESTful API，数据层使用 PostgreSQL。

# 五、关键实现难点

需要关注并发处理、数据一致性保证和异常场景的容错设计。`;
  }

  if (agentName.includes('代码') || agentName.includes('Coding') || agentName.includes('实现') || agentName.includes('重构')) {
    return `# 一、实现思路

基于需求「${taskPreview.slice(0, 80)}」，采用模块化方式实现。

# 二、模块目录结构

\`\`\`
src/
  ├── models/        # 数据模型定义
  ├── services/      # 业务逻辑层
  ├── controllers/   # 接口处理层
  └── utils/         # 工具函数
\`\`\`

# 三、核心代码实现

\`\`\`typescript
// 核心业务逻辑实现
export class BusinessService {
  async process(input: string): Promise<Result> {
    // 业务处理逻辑
    const validated = this.validate(input);
    return await this.execute(validated);
  }
}
\`\`\`

# 四、API 接口设计

提供 RESTful API，包含输入验证、错误处理和响应格式化。

# 五、注意事项

需要处理并发场景、输入验证和错误恢复。`;
  }

  if (agentName.includes('调试') || agentName.includes('Debug') || agentName.includes('诊断')) {
    return `# 一、风险点识别

针对「${taskPreview.slice(0, 80)}」的实现，识别以下风险：
- 边界条件未充分处理
- 异常路径缺乏容错机制

# 二、Bug 场景分析

在高并发或异常输入场景下，可能出现数据不一致或服务不可用。

# 三、修复方案

增加输入验证、异常捕获和重试机制。

# 四、验证策略

设计覆盖正常路径和异常路径的测试用例。`;
  }

  return `针对「${taskPreview.slice(0, 80)}」，已完成分析。需要结合具体业务场景进行深入设计和实现。`;
}
