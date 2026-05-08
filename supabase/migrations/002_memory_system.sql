-- AgentForge OS Phase 4C: Memory System Migration
-- Created: 2026-05-07

-- ============================================
-- TABLE: agent_memory
-- Stores structured memory of agent executions
-- ============================================
CREATE TABLE IF NOT EXISTS agent_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID NOT NULL REFERENCES executions(id) ON DELETE CASCADE,
    
    prompt TEXT NOT NULL,
    summary TEXT,
    lessons JSONB,
    
    tags TEXT[] DEFAULT '{}'::TEXT[],
    memory_type TEXT DEFAULT 'execution',
    importance_score FLOAT DEFAULT 0.5,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE: memory_relations
-- Tracks relationships between memories
-- ============================================
CREATE TABLE IF NOT EXISTS memory_relations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_execution_id UUID NOT NULL REFERENCES executions(id) ON DELETE CASCADE,
    target_execution_id UUID NOT NULL REFERENCES executions(id) ON DELETE CASCADE,
    
    relevance_score FLOAT DEFAULT 0,
    relation_type TEXT DEFAULT 'similar',
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

-- For agent_memory
CREATE INDEX IF NOT EXISTS idx_agent_memory_execution_id ON agent_memory(execution_id);
CREATE INDEX IF NOT EXISTS idx_agent_memory_importance ON agent_memory(importance_score DESC);
CREATE INDEX IF NOT EXISTS idx_agent_memory_created_at ON agent_memory(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_memory_tags ON agent_memory USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_agent_memory_type ON agent_memory(memory_type);

-- For memory_relations
CREATE INDEX IF NOT EXISTS idx_memory_relations_source ON memory_relations(source_execution_id);
CREATE INDEX IF NOT EXISTS idx_memory_relations_target ON memory_relations(target_execution_id);
CREATE INDEX IF NOT EXISTS idx_memory_relations_relevance ON memory_relations(relevance_score DESC);

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_agent_memory_updated_at
    BEFORE UPDATE ON agent_memory
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE agent_memory IS 'Structured memory of agent executions, extracted lessons, and metadata';
COMMENT ON COLUMN agent_memory.lessons IS 'JSONB containing {successes, failures, optimizations}';
COMMENT ON COLUMN agent_memory.importance_score IS 'Normalized 0-1 score of memory importance';
COMMENT ON TABLE memory_relations IS 'Relationship graph between different execution memories';
