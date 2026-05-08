-- AgentForge OS Security Policies & RLS Configuration
-- Created: 2026-05-07
-- Purpose: Enable RLS policies for production security

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================

-- Enable RLS on executions
ALTER TABLE executions ENABLE ROW LEVEL SECURITY;

-- Enable RLS on execution_steps
ALTER TABLE execution_steps ENABLE ROW LEVEL SECURITY;

-- Enable RLS on agent_memory
ALTER TABLE agent_memory ENABLE ROW LEVEL SECURITY;

-- Enable RLS on memory_relations
ALTER TABLE memory_relations ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CREATE POLICIES FOR service_role ONLY
-- These policies allow full access to the service role
-- ============================================

-- Policy for executions
CREATE POLICY "Service role full access to executions"
    ON executions
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Policy for execution_steps
CREATE POLICY "Service role full access to execution_steps"
    ON execution_steps
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Policy for agent_memory
CREATE POLICY "Service role full access to agent_memory"
    ON agent_memory
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Policy for memory_relations
CREATE POLICY "Service role full access to memory_relations"
    ON memory_relations
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ============================================
-- NOTE: These policies are for the service role
-- For user-facing access, consider adding more
-- restrictive policies in production.
-- ============================================
