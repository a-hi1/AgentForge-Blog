import { NextRequest, NextResponse } from 'next/server';
import { getExecutions } from '@/lib/agent-runtime/storage';
import { getSupabaseDebugInfo, isSupabaseConfigured, getSupabaseServer } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const lineageId = searchParams.get('lineage');
    
    if (lineageId) {
      return await getLineage(lineageId);
    }
    
    console.log('[API] Fetching executions...');
    console.log('[Supabase] Debug:', getSupabaseDebugInfo());
    console.log('[Supabase] Configured:', isSupabaseConfigured());
    
    const executions = await getExecutions();
    console.log('[API] Fetched', executions.length, 'executions');
    
    return NextResponse.json(executions);
  } catch (error) {
    console.error('[API] Failed to fetch executions:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch executions', 
        details: String(error),
        debug: getSupabaseDebugInfo()
      },
      { status: 500 }
    );
  }
}

async function getLineage(executionId: string) {
  if (!isSupabaseConfigured()) {
    const executions = await getExecutions();
    return NextResponse.json({ lineage: executions });
  }

  const supabase = getSupabaseServer();
  if (!supabase) {
    const executions = await getExecutions();
    return NextResponse.json({ lineage: executions });
  }

  try {
    const { data: relations, error: relError } = await supabase
      .from('memory_relations')
      .select('*')
      .or(`source_execution_id.eq.${executionId},target_execution_id.eq.${executionId}`);
    
    if (relError) throw relError;
    
    const relatedIds = new Set<string>([executionId]);
    (relations || []).forEach(r => {
      relatedIds.add(r.source_execution_id);
      relatedIds.add(r.target_execution_id);
    });
    
    const { data: executions, error: execError } = await supabase
      .from('executions')
      .select('*')
      .in('id', Array.from(relatedIds))
      .order('created_at', { ascending: false });
    
    if (execError) throw execError;
    
    return NextResponse.json({ lineage: executions || [] });
  } catch (error) {
    console.error('[API] Failed to fetch lineage:', error);
    const executions = await getExecutions();
    return NextResponse.json({ lineage: executions });
  }
}
