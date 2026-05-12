const API_URL = `${process.env.OPENAI_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4'}/chat/completions`;
const API_KEY = process.env.OPENAI_API_KEY || '';
const MODEL = process.env.OPENAI_MODEL || 'glm-4-flash';

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
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        if (attempt === maxRetries) throw new Error(`API error: ${response.status}`);
        continue;
      }

      const result = await response.json();
      const content = result.choices?.[0]?.message?.content || '';

      if (!content) {
        if (attempt === maxRetries) throw new Error('Empty response');
        continue;
      }

      try {
        const parsed = JSON.parse(content);
        if (typeof parsed === 'object' && parsed !== null) {
          return parsed as T;
        }
      } catch {
        if (attempt === maxRetries) throw new Error('Invalid JSON');
      }
    } catch (e) {
      if (attempt === maxRetries) throw e;
    }
  }
  throw new Error('Max retries exceeded');
}
