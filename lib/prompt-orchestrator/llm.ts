import { safeParseLLMJson } from '@/lib/utils/safeJson';

const API_URL = `${process.env.OPENAI_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4'}/chat/completions`;
const API_KEY = process.env.OPENAI_API_KEY || '635dcc8632034607ac10426542c991f5.4biUondwITYglFFV';
const MODEL = process.env.OPENAI_MODEL || 'glm-4.5-air';

export async function callLLMWithJSON<T>(
  messages: { role: string; content: string }[],
  maxRetries: number = 2
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
        body: JSON.stringify({
          model: MODEL,
          messages,
          temperature: 0.4 + attempt * 0.1,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        const errBody = await response.text().catch(() => 'unknown');
        console.error(`LLM API error (attempt ${attempt + 1}/${maxRetries + 1}):`, response.status, errBody.slice(0, 300));
        if (attempt === maxRetries) throw new Error(`API error ${response.status}: ${errBody.slice(0, 200)}`);
        continue;
      }

      const result = await response.json();
      const content = result.choices?.[0]?.message?.content || '';

      if (!content) {
        if (attempt === maxRetries) throw new Error('Empty response from LLM');
        continue;
      }

      const parsed = safeParseLLMJson<T>(content, null as unknown as T);
      if (parsed !== null && typeof parsed === 'object') {
        return parsed;
      }

      if (attempt === maxRetries) throw new Error('Failed to parse JSON from LLM response');
    } catch (e) {
      if (attempt === maxRetries) throw e;
    }
  }
  throw new Error('Max retries exceeded');
}
