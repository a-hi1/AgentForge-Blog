import { safeParseLLMJson } from '@/lib/utils/safeJson';

const API_URL = `${process.env.OPENAI_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4'}/chat/completions`;
const API_KEY = process.env.OPENAI_API_KEY || '635dcc8632034607ac10426542c991f5.4biUondwITYglFFV';
const MODEL = process.env.OPENAI_MODEL || 'glm-4.5-air';

export async function callLLMWithJSON<T>(
  messages: { role: string; content: string }[],
  maxRetries: number = 2,
  temperature: number = 0.3
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000);

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
        body: JSON.stringify({
          model: MODEL,
          messages,
          temperature: temperature + attempt * 0.1,
          max_tokens: 4000,
          top_p: 0.9,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errBody = await response.text().catch(() => 'unknown');
        console.error(`LLM API error (attempt ${attempt + 1}/${maxRetries + 1}):`, response.status, errBody.slice(0, 300));
        if (attempt === maxRetries) throw new Error(`API 返回错误 ${response.status}`);
        continue;
      }

      const result = await response.json();
      const content = result.choices?.[0]?.message?.content || '';

      if (!content) {
        console.warn(`Empty response from LLM, attempt ${attempt + 1}/${maxRetries + 1}`);
        if (attempt === maxRetries) throw new Error('AI 返回了空响应');
        continue;
      }

      const parsed = safeParseLLMJson<T>(content, null as unknown as T);
      if (parsed !== null && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
        return parsed;
      }

      console.warn(`Failed to parse JSON, attempt ${attempt + 1}/${maxRetries + 1}`, content.slice(0, 200));
      if (attempt === maxRetries) throw new Error('AI 返回的内容无法解析');
    } catch (e: any) {
      if (e.name === 'AbortError') {
        console.error(`LLM 请求超时 (attempt ${attempt + 1}/${maxRetries + 1})`);
        if (attempt === maxRetries) throw new Error('AI 请求超时，请稍后重试');
      } else {
        console.error(`Error in LLM call, attempt ${attempt + 1}/${maxRetries + 1}:`, e);
        if (attempt === maxRetries) throw new Error('网络连接失败，请检查网络后重试');
      }
    }
  }
  throw new Error('Max retries exceeded');
}
