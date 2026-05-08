-- AgentForge OS Phase 5: Production Hardening
-- Supabase Security Policies & Index Optimization
-- Created: 2026-05-07

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================

ALTER TABLE executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_relations ENABLE ROW LEVEL SECURITY;

-- ============================================
-- SECURITY POLICIES
-- ============================================

-- ------------------------------
-- EXECUTIONS TABLE
-- ------------------------------

-- Service role: full access
CREATE POLICY "Service role full access - executions"
  ON executions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Anon user: read-only
CREATE POLICY "Anon read-only - executions"
  ON executions
  FOR SELECT
  USING (true);

-- ------------------------------
-- EXECUTION_STEPS TABLE
-- ------------------------------

-- Service role: full access
CREATE POLICY "Service role full access - execution_steps"
  ON execution_steps
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Anon user: read-only
CREATE POLICY "Anon read-only - execution_steps"
  ON execution_steps
  FOR SELECT
  USING (true);

-- ------------------------------
-- AGENT_MEMORY TABLE
-- ------------------------------

-- Service role only: full access
CREATE POLICY "Service role only - agent_memory"
  ON agent_memory
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Deny anon access explicitly
CREATE POLICY "Anon no access - agent_memory"
  ON agent_memory
  FOR ALL
  USING (false);

-- ------------------------------
-- MEMORY_RELATIONS TABLE
-- ------------------------------

-- Service role only: full access
CREATE POLICY "Service role only - memory_relations"
  ON memory_relations
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Deny anon access explicitly
CREATE POLICY "Anon no access - memory_relations"
  ON memory_relations
  FOR ALL
  USING (false);

-- ============================================
-- INDEX OPTIMIZATION
-- ============================================

-- ------------------------------
-- EXECUTIONS TABLE INDEXES
-- ------------------------------

-- Timestamp index (for listing recent executions)
CREATE INDEX IF NOT EXISTS idx_executions_timestamp 
  ON executions(created_at DESC);

-- ID index (primary lookup)
CREATE INDEX IF NOT EXISTS idx_executions_id 
  ON executions(id);

-- Status index
CREATE INDEX IF NOT EXISTS idx_executions_status 
  ON executions(status);

-- ------------------------------
-- EXECUTION_STEPS TABLE INDEXES
-- ------------------------------

-- Execution ID + step index (primary lookup)
CREATE INDEX IF NOT EXISTS idx_execution_steps_execution_id 
  ON execution_steps(execution_id, step_index);

-- Agent type index (for analytics)
CREATE INDEX IF NOT EXISTS idx_execution_steps_agent 
  ON execution_steps(agent);

-- ------------------------------
-- AGENT_MEMORY TABLE INDEXES
-- ------------------------------

-- Execution ID index
CREATE INDEX IF NOT EXISTS idx_agent_memory_execution_id 
  ON agent_memory(execution_id);

-- Created at + importance (for relevant memory lookup)
CREATE INDEX IF NOT EXISTS idx_agent_memory_created_importance 
  ON agent_memory(created_at DESC, importance_score DESC);

-- Tags for fast filtering
CREATE INDEX IF NOT EXISTS idx_agent_memory_tags 
  ON agent_memory USING GIN(tags);

-- ------------------------------
-- MEMORY_RELATIONS TABLE INDEXES
-- ------------------------------

-- Source execution index
CREATE INDEX IF NOT EXISTS idx_memory_relations_source 
  ON memory_relations(source_execution_id);

-- Target execution index
CREATE INDEX IF NOT EXISTS idx_memory_relations_target 
  ON memory_relations(target_execution_id);

-- Relevance score index
CREATE INDEX IF NOT EXISTS idx_memory_relations_relevance 
  ON memory_relations(relevance_score DESC);

-- ============================================
-- AUTO-UPDATED TIMESTAMPS
-- ============================================

-- Function already exists from previous migration, ensuring here
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
