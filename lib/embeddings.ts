/**
 * Embedding 工具
 * - 优先调用 OpenAI 兼容 /embeddings 接口（若 provider 支持）
 * - DeepSeek 对话 API 通常无 embedding：自动走本地哈希回退，保证记忆链路可演示
 * - 智谱可用 embedding-2；也可通过 EMBEDDING_MODEL 覆盖
 */

export interface EmbeddingOptions {
  model?: string;
  dimensions?: number;
}

export const DEFAULT_EMBEDDING_DIM = 768;

function resolveEmbeddingModel(baseUrl: string, explicit?: string): string | null {
  if (explicit) return explicit;
  if (process.env.EMBEDDING_MODEL) return process.env.EMBEDDING_MODEL;
  if (baseUrl.includes('bigmodel.cn')) return 'embedding-2';
  if (baseUrl.includes('api.openai.com')) return 'text-embedding-3-small';
  // DeepSeek 等：无稳定 embedding 端点 → 返回 null 触发本地回退
  if (baseUrl.includes('deepseek.com')) return null;
  return 'text-embedding-3-small';
}

/**
 * 生成文本向量。
 * 远程失败 / 无 embedding 模型时返回本地哈希向量（可相对排序，非语义模型）。
 */
export async function generateEmbedding(
  text: string,
  options?: EmbeddingOptions
): Promise<number[] | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseUrl = (process.env.OPENAI_BASE_URL || 'https://api.deepseek.com/v1').replace(
    /\/$/,
    ''
  );
  const dimensions = options?.dimensions || DEFAULT_EMBEDDING_DIM;
  const model = resolveEmbeddingModel(baseUrl, options?.model);

  if (!apiKey || !model) {
    if (!model) {
      console.warn('[Embedding] 当前 provider 无 embedding 模型配置，使用本地哈希回退向量');
    } else {
      console.warn('[Embedding] OPENAI_API_KEY 缺失，使用本地哈希回退向量');
    }
    return fallbackEmbedding(text, dimensions);
  }

  const input = text.slice(0, 8000);
  const url = `${baseUrl}/embeddings`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        input,
        dimensions,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      console.warn(`[Embedding] ${url} -> ${response.status} ${errBody.slice(0, 120)}`);
      return fallbackEmbedding(text, dimensions);
    }

    const result = await response.json();
    const embedding = result.data?.[0]?.embedding ?? result.embedding ?? result.data?.embedding;
    if (Array.isArray(embedding) && embedding.length > 0) {
      return normalizeDimensions(embedding.map(Number), dimensions);
    }
  } catch (e) {
    console.warn('[Embedding] 请求失败:', e);
  }

  console.warn('[Embedding] 远程向量失败，使用本地哈希回退');
  return fallbackEmbedding(text, dimensions);
}

export async function generateEmbeddings(
  texts: string[],
  options?: EmbeddingOptions
): Promise<(number[] | null)[]> {
  const results = await Promise.allSettled(texts.map((t) => generateEmbedding(t, options)));
  return results.map((r) => (r.status === 'fulfilled' ? r.value : null));
}

/** 将任意维度向量调整到目标维度（池化 / 零填充）并 L2 归一化 */
export function normalizeDimensions(vec: number[], targetDim: number): number[] {
  if (vec.length === targetDim) return l2Normalize(vec);
  if (vec.length > targetDim) {
    const ratio = vec.length / targetDim;
    const result: number[] = [];
    for (let i = 0; i < targetDim; i++) {
      const start = Math.floor(i * ratio);
      const end = Math.max(start + 1, Math.floor((i + 1) * ratio));
      const slice = vec.slice(start, end);
      result.push(slice.reduce((a, b) => a + b, 0) / slice.length);
    }
    return l2Normalize(result);
  }
  return l2Normalize([...vec, ...new Array(targetDim - vec.length).fill(0)]);
}

/**
 * 确定性关键词哈希向量：无外部依赖时仍可做相对相似度排序。
 * 注意：这不是语义 embedding，检索质量弱于真实模型。
 */
export function fallbackEmbedding(
  text: string,
  dimensions: number = DEFAULT_EMBEDDING_DIM
): number[] {
  const vec = new Array(dimensions).fill(0);
  const tokens = tokenize(text);
  if (tokens.length === 0) return vec;

  for (const token of tokens) {
    let hash = 2166136261;
    for (let i = 0; i < token.length; i++) {
      hash ^= token.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    const idx = Math.abs(hash) % dimensions;
    vec[idx] += 1;
    vec[(idx + 1) % dimensions] += 0.25;
  }

  return l2Normalize(vec);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a?.length || !b?.length || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

function l2Normalize(vec: number[]): number[] {
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
  if (norm === 0) return vec;
  return vec.map((v) => v / norm);
}

function tokenize(text: string): string[] {
  const lower = text.toLowerCase();
  const latin = lower.match(/[a-z0-9_]+/g) || [];
  const cjk = lower.match(/[一-鿿]{1,2}/g) || [];
  return [...latin, ...cjk].filter(Boolean);
}
