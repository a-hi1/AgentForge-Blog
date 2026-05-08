import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// 加载环境变量
dotenv.config({ path: '.env.local' });

const EXECUTIONS_DIR = path.join(process.cwd(), 'data', 'executions');

async function migrateExecutions() {
  console.log('🚀 开始迁移执行记录...\n');

  // 检查是否有 Supabase 配置
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ 错误：请先在 .env.local 中配置 Supabase 环境变量');
    process.exit(1);
  }

  // 初始化 Supabase 客户端
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  // 检查本地文件
  if (!fs.existsSync(EXECUTIONS_DIR)) {
    console.log('ℹ️ 没有找到本地执行记录，跳过迁移');
    process.exit(0);
  }

  const files = fs.readdirSync(EXECUTIONS_DIR).filter(f => f.endsWith('.json'));
  
  if (files.length === 0) {
    console.log('ℹ️ 没有本地执行记录需要迁移');
    process.exit(0);
  }

  console.log(`📦 找到 ${files.length} 个本地执行记录\n`);

  let successCount = 0;
  let skipCount = 0;

  for (const file of files) {
    try {
      const filePath = path.join(EXECUTIONS_DIR, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const record = JSON.parse(content);

      // 检查是否已经存在于数据库
      const { data: existing } = await supabase
        .from('executions')
        .select('id')
        .eq('id', record.id)
        .maybeSingle();

      if (existing) {
        console.log(`⏭️ 跳过 ${file} - 已存在于数据库`);
        skipCount++;
        continue;
      }

      // 1. 插入 execution
      const { error: execError } = await supabase
        .from('executions')
        .insert({
          id: record.id,
          prompt: record.prompt,
          status: record.status || 'completed',
          summary: record.summary || null,
          created_at: record.timestamp,
        });

      if (execError) throw execError;

      // 2. 插入 steps
      if (record.steps && record.steps.length > 0) {
        const stepsToInsert = record.steps.map((step: any, idx: number) => ({
          execution_id: record.id,
          step_index: idx,
          agent: step.agent,
          task: step.task,
          output: step.output,
          status: step.status,
          created_at: step.timestamp,
        }));

        const { error: stepsError } = await supabase
          .from('execution_steps')
          .insert(stepsToInsert);

        if (stepsError) throw stepsError;
      }

      console.log(`✅ 成功迁移 ${file}`);
      successCount++;

    } catch (error) {
      console.error(`❌ 迁移失败 ${file}:`, error);
    }
  }

  console.log(`\n📊 迁移完成：${successCount} 成功，${skipCount} 跳过`);
}

migrateExecutions().catch(console.error);
