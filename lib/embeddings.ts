/**
 * Embedding 工具
 * 优先级：
 * 1. MaxKB 内置本地向量服务（text2vec-base-chinese，默认 768 维）
 * 2. OpenAI 兼容 /embeddings（智谱 embedding-2、OpenAI text-embedding-3-small 等）
 * 3. 本地哈希回退（可相对排序，非语义模型）
 *
 * MaxKB local_model 服务：
 *   python main.py dev local_model  # 默认 127.0.0.1:11636
 *   POST {MAXKB_EMBEDDING_URL}/model/{model_id}/embed_query
 *     Content-Type: application/x-www-form-urlencoded
 *     body: text=<query>
 *   POST .../embed_documents  body: texts=...&texts=...
 *   响应：{ code: 200, data: number[] | number[][] }
 */

export interface EmbeddingOptions {
  model?: string;
  dimensions?: number;
}

export const DEFAULT_EMBEDDING_DIM = 768;

export type EmbeddingProvider = 'maxkb' | 'openai-compatible' | 'local-hash';

export interface EmbeddingMeta {
  provider: EmbeddingProvider;
  model?: string | null;
  dimensions: number;
}

function resolveOpenAICompatibleModel(baseUrl: string, explicit?: string): string | null {
  if (explicit) return explicit;
  if (process.env.EMBEDDING_MODEL) return process.env.EMBEDDING_MODEL;
  if (baseUrl.includes('bigmodel.cn')) return 'embedding-2';
  if (baseUrl.includes('api.openai.com')) return 'text-embedding-3-small';
  // DeepSeek 对话 API 无稳定 embedding 端点
  if (baseUrl.includes('deepseek.com')) return null;
  return 'text-embedding-3-small';
}

function getMaxKBConfig(): { baseUrl: string; modelId: string } | null {
  const modelId = process.env.MAXKB_MODEL_ID?.trim();
  if (!modelId) return null;

  const raw =
    process.env.MAXKB_EMBEDDING_URL?.trim() ||
    'http://127.0.0.1:11636/admin/api';
  const baseUrl = raw.replace(/\/$/, '');
  return { baseUrl, modelId };
}

/**
 * 调用 MaxKB local_model 的 embed_query 接口。
 * 内置默认模型 shibing624/text2vec-base-chinese → 768 维，与 pgvector schema 对齐。
 */
async function embedViaMaxKB(
  text: string,
  dimensions: number
): Promise<number[] | null> {
  const cfg = getMaxKBConfig();
  if (!cfg) return null;

  const url = `${cfg.baseUrl}/model/${cfg.modelId}/embed_query`;
  const input = text.slice(0, 8000);

  try {
    const form = new URLSearchParams({ text: input });
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
      // 本地服务，给足冷启动时间
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      console.warn(`[Embedding/MaxKB] ${url} -> ${response.status} ${errBody.slice(0, 120)}`);
      return null;
    }

    const result = await response.json();
    // MaxKB 标准响应：{ code: 200, data: number[] }
    // 兼容直接返回数组 / OpenAI 风格
    let embedding: unknown =
      result?.data ?? result?.embedding ?? result?.data?.[0]?.embedding;

    if (result?.code !== undefined && result.code !== 200) {
      console.warn(`[Embedding/MaxKB] code=${result.code} msg=${result?.message || ''}`);
      return null;
    }

    // data 可能是向量本身
    if (Array.isArray(embedding) && typeof embedding[0] === 'number') {
      return normalizeDimensions(embedding.map(Number), dimensions);
    }
    // data 可能是 { embedding: [...] }
    if (embedding && typeof embedding === 'object' && Array.isArray((embedding as { embedding?: number[] }).embedding)) {
      return normalizeDimensions(
        (embedding as { embedding: number[] }).embedding.map(Number),
        dimensions
      );
    }

    console.warn('[Embedding/MaxKB] 响应中未找到向量数组');
    return null;
  } catch (e) {
    console.warn('[Embedding/MaxKB] 请求失败:', e instanceof Error ? e.message : e);
    return null;
  }
}

async function embedViaOpenAICompatible(
  text: string,
  dimensions: number,
  modelOverride?: string
): Promise<number[] | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseUrl = (process.env.OPENAI_BASE_URL || 'https://api.deepseek.com/v1').replace(
    /\/$/,
    ''
  );
  const model = resolveOpenAICompatibleModel(baseUrl, modelOverride);

  if (!apiKey || !model) return null;

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
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      console.warn(`[Embedding] ${url} -> ${response.status} ${errBody.slice(0, 120)}`);
      return null;
    }

    const result = await response.json();
    const embedding = result.data?.[0]?.embedding ?? result.embedding ?? result.data?.embedding;
    if (Array.isArray(embedding) && embedding.length > 0) {
      return normalizeDimensions(embedding.map(Number), dimensions);
    }
  } catch (e) {
    console.warn('[Embedding] OpenAI 兼容请求失败:', e instanceof Error ? e.message : e);
  }
  return null;
}

/** 当前生效的 embedding 提供方（诊断用，不发网络请求） */
export function resolveEmbeddingProvider(): EmbeddingMeta {
  const dimensions = DEFAULT_EMBEDDING_DIM;
  if (getMaxKBConfig()) {
    return {
      provider: 'maxkb',
      model: process.env.MAXKB_MODEL_ID,
      dimensions,
    };
  }
  const baseUrl = (process.env.OPENAI_BASE_URL || 'https://api.deepseek.com/v1').replace(
    /\/$/,
    ''
  );
  const model = resolveOpenAICompatibleModel(baseUrl);
  if (process.env.OPENAI_API_KEY && model) {
    return { provider: 'openai-compatible', model, dimensions };
  }
  return { provider: 'local-hash', model: null, dimensions };
}

/**
 * 生成文本向量。
 * MaxKB → OpenAI 兼容 → 本地哈希回退。
 */
export async function generateEmbedding(
  text: string,
  options?: EmbeddingOptions
): Promise<number[] | null> {
  const dimensions = options?.dimensions || DEFAULT_EMBEDDING_DIM;

  // 1) MaxKB 内置向量（text2vec-base-chinese）
  const maxkbVec = await embedViaMaxKB(text, dimensions);
  if (maxkbVec) return maxkbVec;

  // 2) OpenAI 兼容远程 embedding
  const remoteVec = await embedViaOpenAICompatible(text, dimensions, options?.model);
  if (remoteVec) return remoteVec;

  // 3) 本地哈希回退
  if (getMaxKBConfig()) {
    console.warn('[Embedding] MaxKB 不可用且远程 embedding 失败，使用本地哈希回退');
  } else {
    const baseUrl = (process.env.OPENAI_BASE_URL || '').toLowerCase();
    if (baseUrl.includes('deepseek.com') || !process.env.EMBEDDING_MODEL) {
      console.warn('[Embedding] 未配置 MaxKB / 远程 embedding，使用本地哈希回退向量');
    } else {
      console.warn('[Embedding] 远程向量失败，使用本地哈希回退');
    }
  }
  return fallbackEmbedding(text, dimensions);
}

export async function generateEmbeddings(
  texts: string[],
  options?: EmbeddingOptions
): Promise<(number[] | null)[]> {
  // MaxKB 支持 batch embed_documents，优先走批量
  const cfg = getMaxKBConfig();
  const dimensions = options?.dimensions || DEFAULT_EMBEDDING_DIM;

  if (cfg && texts.length > 1) {
    try {
      const url = `${cfg.baseUrl}/model/${cfg.modelId}/embed_documents`;
      const form = new URLSearchParams();
      texts.map((t) => t.slice(0, 8000)).forEach((text) => form.append('texts', text));
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form,
        signal: AbortSignal.timeout(60_000),
      });
      if (response.ok) {
        const result = await response.json();
        const data = result?.data;
        if (Array.isArray(data) && data.length === texts.length) {
          return data.map((row: unknown) => {
            if (Array.isArray(row) && typeof row[0] === 'number') {
              return normalizeDimensions(row.map(Number), dimensions);
            }
            return null;
          });
        }
      }
    } catch (e) {
      console.warn('[Embedding/MaxKB] batch 失败，回退逐条:', e instanceof Error ? e.message : e);
    }
  }

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
