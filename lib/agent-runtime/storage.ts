import { supabaseServer, isSupabaseConfigured } from '../supabase/client';

// 保持原有的类型定义
export interface ExecutionStep {
  agent: string;
  task: string;
  output: string;
  status: 'pending' | 'executing' | 'completed';
  timestamp: string;
  start_time?: number; // 新增：开始时间用于计算时长
}

export interface ExecutionRecord {
  id: string;
  prompt: string;
  steps: ExecutionStep[];
  timestamp: string;
  status?: 'pending' | 'running' | 'completed' | 'failed';
  summary?: string;
  adaptation_reason?: string[];
  memory_influence_level?: number;
  memory_influenced?: boolean;
}

// Helper: UUID 生成
export function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 创建一个新的执行记录
 */
export async function createExecution(prompt: string): Promise<string> {
  const id = generateId();
  
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabaseServer
        .from('executions')
        .insert({
          id,
          prompt,
          status: 'pending',
        });
      
      if (error) {
        console.error('[Supabase] createExecution failed:', error);
      }
      return id;
    } catch (e) {
      console.error('[Supabase] createExecution error:', e);
      return id;
    }
  }
  
  console.warn('[Storage] Supabase not configured, execution not persisted');
  return id;
}

/**
 * 追加/更新一个步骤
 */
export async function appendExecutionStep(
  executionId: string,
  stepIndex: number,
  step: Partial<ExecutionStep>
): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      // 1. 先更新 execution 的状态
      if (step.status === 'executing') {
        await supabaseServer
          .from('executions')
          .update({ status: 'running' })
          .eq('id', executionId);
      }

      // 2. 检查 step 是否已经存在
      const { data: existing } = await supabaseServer
        .from('execution_steps')
        .select('id')
        .eq('execution_id', executionId)
        .eq('step_index', stepIndex)
        .maybeSingle();

      if (existing) {
        // 更新现有 step
        const updateData: any = {};
        if (step.output !== undefined) updateData.output = step.output;
        if (step.status) updateData.status = step.status;
        if (step.start_time && step.timestamp) {
          const duration = new Date(step.timestamp).getTime() - step.start_time;
          updateData.duration_ms = duration;
        }

        const { error } = await supabaseServer
          .from('execution_steps')
          .update(updateData)
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // 插入新 step
        const { error } = await supabaseServer
          .from('execution_steps')
          .insert({
            execution_id: executionId,
            step_index: stepIndex,
            agent: step.agent,
            task: step.task,
            output: step.output || '',
            status: step.status || 'pending',
          });

        if (error) throw error;
      }
    } catch (e) {
      console.error('[Supabase] appendExecutionStep failed:', e);
    }
  }
}

/**
 * 完成整个执行记录
 */
export async function completeExecution(
  executionId: string,
  status: 'completed' | 'failed' = 'completed',
  summary?: string
): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabaseServer
        .from('executions')
        .update({
          status,
          summary,
        })
        .eq('id', executionId);

      if (error) throw error;
    } catch (e) {
      console.error('[Supabase] completeExecution failed:', e);
    }
  }
}

/**
 * 获取所有执行记录
 */
export async function getExecutions(): Promise<ExecutionRecord[]> {
  if (isSupabaseConfigured()) {
    try {
      console.log('[Supabase] Fetching executions...');
      
      const { data, error } = await supabaseServer
        .from('executions')
        .select(`
          *,
          execution_steps (
            step_index,
            agent,
            task,
            output,
            status,
            created_at
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[Supabase] Query error:', error);
        throw error;
      }
      
      console.log('[Supabase] Found', (data || []).length, 'executions');

      // 转换为本地格式
      const transformed = (data || []).map(item => ({
        id: item.id,
        prompt: item.prompt,
        status: item.status,
        summary: item.summary,
        timestamp: item.created_at,
        steps: (item.execution_steps || [])
          .sort((a: any, b: any) => a.step_index - b.step_index)
          .map((step: any) => ({
            agent: step.agent,
            task: step.task,
            output: step.output,
            status: step.status,
            timestamp: step.created_at,
          })),
      }));
      
      console.log('[Supabase] Transformed', transformed.length, 'records');
      return transformed;
    } catch (e) {
      console.error('[Supabase] getExecutions failed:', e);
      return [];
    }
  } else {
    console.log('[Storage] Supabase not configured, no executions found');
    return [];
  }
}

/**
 * 根据 ID 获取单个执行记录
 */
export async function getExecutionById(id: string): Promise<ExecutionRecord | null> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabaseServer
        .from('executions')
        .select(`
          *,
          execution_steps (
            step_index,
            agent,
            task,
            output,
            status,
            created_at
          )
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        id: data.id,
        prompt: data.prompt,
        status: data.status,
        summary: data.summary,
        timestamp: data.created_at,
        steps: (data.execution_steps || [])
          .sort((a: any, b: any) => a.step_index - b.step_index)
          .map((step: any) => ({
            agent: step.agent,
            task: step.task,
            output: step.output,
            status: step.status,
            timestamp: step.created_at,
          })),
      };
    } catch (e) {
      console.error('[Supabase] getExecutionById failed:', e);
      return null;
    }
  }
  
  return null;
}

/**
 * 保持向后兼容的导出
 */
export function saveExecution(record: ExecutionRecord): void {
  if (isSupabaseConfigured()) {
    (async () => {
      try {
        await supabaseServer.from('executions').upsert({
          id: record.id,
          prompt: record.prompt,
          status: record.status || 'completed',
          summary: record.summary,
          created_at: record.timestamp,
        });

        // 删除旧的 steps
        await supabaseServer.from('execution_steps').delete().eq('execution_id', record.id);
        
        // 插入新的 steps
        if (record.steps && record.steps.length > 0) {
          const stepsToInsert = record.steps.map((step, idx) => ({
            execution_id: record.id,
            step_index: idx,
            agent: step.agent,
            task: step.task,
            output: step.output,
            status: step.status,
            created_at: step.timestamp,
          }));

          await supabaseServer.from('execution_steps').insert(stepsToInsert);
        }
      } catch (e) {
        console.error('[Supabase] saveExecution failed:', e);
      }
    })();
  }
}
