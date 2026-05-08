-- 创建 executions 表
CREATE TABLE IF NOT EXISTS executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 创建 execution_steps 表
CREATE TABLE IF NOT EXISTS execution_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES executions(id) ON DELETE CASCADE,
  step_index INT NOT NULL,
  agent TEXT NOT NULL,
  task TEXT NOT NULL,
  output TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  duration_ms INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 为 executions 表创建索引
CREATE INDEX IF NOT EXISTS idx_executions_created_at ON executions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_executions_status ON executions(status);

-- 为 execution_steps 表创建索引
CREATE INDEX IF NOT EXISTS idx_execution_steps_execution_id ON execution_steps(execution_id);
CREATE INDEX IF NOT EXISTS idx_execution_steps_step_index ON execution_steps(step_index);

-- 创建自动更新 updated_at 的触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为 executions 表添加触发器
DROP TRIGGER IF EXISTS update_executions_updated_at ON executions;
CREATE TRIGGER update_executions_updated_at
  BEFORE UPDATE ON executions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 为 execution_steps 表添加触发器
DROP TRIGGER IF EXISTS update_execution_steps_updated_at ON execution_steps;
CREATE TRIGGER update_execution_steps_updated_at
  BEFORE UPDATE ON execution_steps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 启用行级安全策略（RLS）
ALTER TABLE executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution_steps ENABLE ROW LEVEL SECURITY;

-- 创建策略：允许任何人读取
CREATE POLICY "Allow public read access on executions" ON executions
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access on execution_steps" ON execution_steps
  FOR SELECT USING (true);

-- 创建策略：允许服务角色写入
CREATE POLICY "Allow service role write access on executions" ON executions
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role write access on execution_steps" ON execution_steps
  FOR ALL USING (true) WITH CHECK (true);
