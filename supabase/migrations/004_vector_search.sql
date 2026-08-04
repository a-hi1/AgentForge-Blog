-- AgentForge: pgvector 语义检索
-- 在 Supabase SQL Editor 中执行本文件
-- 前置：PostgreSQL + 可用的 vector 扩展

-- 1) 启用扩展
CREATE EXTENSION IF NOT EXISTS vector;

-- 2) 记忆表增加 768 维向量列
ALTER TABLE agent_memory
  ADD COLUMN IF NOT EXISTS embedding vector(768);

-- 3) 近似最近邻索引
CREATE INDEX IF NOT EXISTS idx_agent_memory_embedding
  ON agent_memory
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 10);

-- 4) 余弦相似度检索 RPC（应用侧 supabase.rpc('match_memories', ...)）
CREATE OR REPLACE FUNCTION match_memories(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.6,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  execution_id uuid,
  prompt text,
  summary text,
  lessons jsonb,
  tags text[],
  importance_score float,
  similarity float,
  created_at timestamptz
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    am.id,
    am.execution_id,
    am.prompt,
    am.summary,
    am.lessons,
    am.tags,
    am.importance_score,
    (1 - (am.embedding <=> query_embedding))::float AS similarity,
    am.created_at
  FROM agent_memory am
  WHERE am.embedding IS NOT NULL
    AND 1 - (am.embedding <=> query_embedding) > match_threshold
  ORDER BY am.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 兼容旧函数名（若历史脚本引用 search_similar_memories）
CREATE OR REPLACE FUNCTION search_similar_memories(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.6,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  execution_id uuid,
  prompt text,
  summary text,
  lessons jsonb,
  tags text[],
  memory_type text,
  importance_score float,
  created_at timestamptz,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    am.id,
    am.execution_id,
    am.prompt,
    am.summary,
    am.lessons,
    am.tags,
    am.memory_type,
    am.importance_score,
    am.created_at,
    (1 - (am.embedding <=> query_embedding))::float AS similarity
  FROM agent_memory am
  WHERE am.embedding IS NOT NULL
    AND 1 - (am.embedding <=> query_embedding) > match_threshold
  ORDER BY am.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

COMMENT ON COLUMN agent_memory.embedding IS '768-d embedding for semantic memory retrieval';
COMMENT ON FUNCTION match_memories IS 'Cosine similarity search over agent_memory.embedding';
