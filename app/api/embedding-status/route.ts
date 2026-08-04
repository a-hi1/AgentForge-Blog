import { NextResponse } from 'next/server';
import { resolveEmbeddingProvider } from '@/lib/embeddings';

export const runtime = 'nodejs';

/**
 * 诊断当前 embedding 提供方（不触发实际向量化）。
 * GET /api/embedding-status
 *
 * 生产环境不回显完整 MaxKB URL，避免信息过度暴露。
 */
export async function GET() {
  const meta = resolveEmbeddingProvider();
  const maxkbConfigured = Boolean(process.env.MAXKB_MODEL_ID?.trim());
  const isProd = process.env.NODE_ENV === 'production';

  return NextResponse.json({
    provider: meta.provider,
    model: meta.model ?? null,
    dimensions: meta.dimensions,
    maxkbConfigured,
    // 仅开发环境返回具体 URL，生产只返回是否已配置
    maxkbUrl: isProd
      ? maxkbConfigured
        ? '[configured]'
        : null
      : process.env.MAXKB_EMBEDDING_URL || 'http://127.0.0.1:11636/admin/api',
    hint:
      meta.provider === 'maxkb'
        ? '已配置 MaxKB 本地向量。请确保 local_model 服务在运行：python main.py dev local_model'
        : meta.provider === 'openai-compatible'
          ? '使用 OpenAI 兼容 embedding 端点'
          : '未配置真实向量模型，将使用本地哈希回退。可设置 MAXKB_MODEL_ID 接入 MaxKB text2vec。',
  });
}
