import { getSupabaseServer, isSupabaseConfigured } from '../supabase/client';

export interface ExecutionStep {
  agent: string;
  task: string;
  output: string;
  status: 'pending' | 'executing' | 'completed';
  timestamp: string;
  start_time?: number;
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

export function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export async function createExecution(prompt: string): Promise<string> {
  const id = generateId();

  if (!isSupabaseConfigured()) {
    console.warn('[Storage] Supabase not configured, execution not persisted');
    return id;
  }

  const supabase = getSupabaseServer();
  if (!supabase) return id;

  try {
    const { error } = await supabase
      .from('executions')
      .insert({ id, prompt, status: 'pending' });

    if (error) {
      console.error('[Supabase] createExecution failed:', error);
    }
    return id;
  } catch (e) {
    console.error('[Supabase] createExecution error:', e);
    return id;
  }
}

export async function appendExecutionStep(
  executionId: string,
  stepIndex: number,
  step: Partial<ExecutionStep>
): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const supabase = getSupabaseServer();
  if (!supabase) return;

  try {
    if (step.status === 'executing') {
      await supabase
        .from('executions')
        .update({ status: 'running' })
        .eq('id', executionId);
    }

    const { data: existing } = await supabase
      .from('execution_steps')
      .select('id')
      .eq('execution_id', executionId)
      .eq('step_index', stepIndex)
      .maybeSingle();

    if (existing) {
      const updateData: any = {};
      if (step.output !== undefined) updateData.output = step.output;
      if (step.status) updateData.status = step.status;
      if (step.start_time && step.timestamp) {
        const duration = new Date(step.timestamp).getTime() - step.start_time;
        updateData.duration_ms = duration;
      }

      const { error } = await supabase
        .from('execution_steps')
        .update(updateData)
        .eq('id', existing.id);

      if (error) throw error;
    } else {
      const { error } = await supabase
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

export async function completeExecution(
  executionId: string,
  status: 'completed' | 'failed' = 'completed',
  summary?: string
): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const supabase = getSupabaseServer();
  if (!supabase) return;

  try {
    const { error } = await supabase
      .from('executions')
      .update({ status, summary })
      .eq('id', executionId);

    if (error) throw error;
  } catch (e) {
    console.error('[Supabase] completeExecution failed:', e);
  }
}

export async function getExecutions(): Promise<ExecutionRecord[]> {
  if (!isSupabaseConfigured()) {
    console.log('[Storage] Supabase not configured, no executions found');
    return [];
  }

  const supabase = getSupabaseServer();
  if (!supabase) return [];

  try {
    console.log('[Supabase] Fetching executions...');

    const { data, error } = await supabase
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
}

export async function getExecutionById(id: string): Promise<ExecutionRecord | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = getSupabaseServer();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
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

export function saveExecution(record: ExecutionRecord): void {
  if (!isSupabaseConfigured()) return;

  const supabase = getSupabaseServer();
  if (!supabase) return;

  (async () => {
    try {
      await supabase.from('executions').upsert({
        id: record.id,
        prompt: record.prompt,
        status: record.status || 'completed',
        summary: record.summary,
        created_at: record.timestamp,
      });

      await supabase.from('execution_steps').delete().eq('execution_id', record.id);

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

        await supabase.from('execution_steps').insert(stepsToInsert);
      }
    } catch (e) {
      console.error('[Supabase] saveExecution failed:', e);
    }
  })();
}
