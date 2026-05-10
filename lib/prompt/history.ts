import { getSupabaseServer, getSupabaseBrowser, isSupabaseConfigured } from '../supabase/client';
import { calculatePromptScore, PromptScore } from './scorer';

export interface PromptHistoryRecord {
  id: string;
  project_id?: string;
  title: string;
  project_type: string;
  phase?: string;
  input: string;
  output: string;
  created_at: string;
  favorite: boolean;
  tags: string[];
  version?: number;
  parent_id?: string;
  score?: number;
  score_details?: PromptScore;
  execution_success?: boolean;
  feedback?: 'excellent' | 'average' | 'failed';
}

export function generatePromptId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `prompt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getLocalStorageFallback() {
  try {
    const key = 'agentforge_prompt_history';
    const data = localStorage.getItem(key);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.warn('[PromptHistory] localStorage read failed');
  }
  return [];
}

function saveToLocalStorage(history: PromptHistoryRecord[]) {
  try {
    const key = 'agentforge_prompt_history';
    localStorage.setItem(key, JSON.stringify(history));
  } catch (e) {
    console.warn('[PromptHistory] localStorage write failed');
  }
}

export async function savePrompt(params: {
  title: string;
  project_type: string;
  phase?: string;
  project_id?: string;
  input: string;
  output: string;
  tags?: string[];
  version?: number;
  parent_id?: string;
  execution_success?: boolean;
  feedback?: 'excellent' | 'average' | 'failed';
}): Promise<PromptHistoryRecord> {
  const scoreDetails = calculatePromptScore({
    prompt: params.output,
    projectType: params.project_type,
    executionSuccess: params.execution_success,
    userFeedback: params.feedback
  });

  const record: PromptHistoryRecord = {
    id: generatePromptId(),
    title: params.title,
    project_type: params.project_type,
    phase: params.phase,
    project_id: params.project_id,
    input: params.input,
    output: params.output,
    created_at: new Date().toISOString(),
    favorite: false,
    tags: params.tags || [],
    version: params.version || 1,
    parent_id: params.parent_id,
    score: scoreDetails.score,
    score_details: scoreDetails,
    execution_success: params.execution_success,
    feedback: params.feedback
  };

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseServer() || getSupabaseBrowser();
    if (supabase) {
      try {
        const { error } = await supabase.from('prompt_history').insert(record);
        if (!error) {
          return record;
        }
        console.warn('[PromptHistory] Supabase save failed, falling back');
      } catch (e) {
        console.warn('[PromptHistory] Supabase save error, falling back');
      }
    }
  }

  const history = getLocalStorageFallback();
  history.unshift(record);
  saveToLocalStorage(history.slice(0, 100));
  return record;
}

export async function getPromptHistory(options?: {
  projectId?: string;
  limit?: number;
  search?: string;
  onlyFavorites?: boolean;
  sortBy?: 'smart' | 'score' | 'date' | 'favorite';
}): Promise<PromptHistoryRecord[]> {
  let records: PromptHistoryRecord[] = [];

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseServer() || getSupabaseBrowser();
    if (supabase) {
      try {
        let query = supabase
          .from('prompt_history')
          .select('*');

        if (options?.projectId) {
          query = query.eq('project_id', options.projectId);
        }

        if (options?.onlyFavorites) {
          query = query.eq('favorite', true);
        }

        if (options?.limit) {
          query = query.limit(options.limit);
        }

        if (options?.search) {
          query = query.or(
            `title.ilike.%${options.search}%,input.ilike.%${options.search}%,output.ilike.%${options.search}%`
          );
        }

        query = query.order('created_at', { ascending: false });

        const { data, error } = await query;
        if (!error && data) {
          records = data;
        }
      } catch (e) {
        console.warn('[PromptHistory] Supabase fetch failed, falling back');
      }
    }
  }

  if (records.length === 0) {
    records = getLocalStorageFallback();
  }

  if (options?.projectId) {
    records = records.filter(r => r.project_id === options.projectId);
  }

  if (options?.onlyFavorites) {
    records = records.filter(r => r.favorite);
  }

  if (options?.search) {
    const s = options.search.toLowerCase();
    records = records.filter(
      r =>
        r.title.toLowerCase().includes(s) ||
        r.input.toLowerCase().includes(s) ||
        r.output.toLowerCase().includes(s)
    );
  }

  if (options?.sortBy === 'smart' || options?.sortBy === undefined) {
    records = sortBySmart(records);
  } else if (options?.sortBy === 'score') {
    records = [...records].sort((a, b) => (b.score || 0) - (a.score || 0));
  } else if (options?.sortBy === 'favorite') {
    records = [...records].sort((a, b) => (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0));
  }

  if (options?.limit) {
    records = records.slice(0, options.limit);
  }

  return records;
}

function sortBySmart(records: PromptHistoryRecord[]): PromptHistoryRecord[] {
  return [...records].sort((a, b) => {
    if (a.favorite && !b.favorite) return -1;
    if (!a.favorite && b.favorite) return 1;
    
    const aScore = a.score || 50;
    const bScore = b.score || 50;
    if (aScore !== bScore) return bScore - aScore;
    
    const aDate = new Date(a.created_at).getTime();
    const bDate = new Date(b.created_at).getTime();
    return bDate - aDate;
  });
}

export async function toggleFavorite(id: string, favorite?: boolean): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseServer() || getSupabaseBrowser();
    if (supabase) {
      try {
        const { data: existing } = await supabase
          .from('prompt_history')
          .select('favorite')
          .eq('id', id)
          .maybeSingle();

        const newFavorite =
          favorite !== undefined ? favorite : !existing?.favorite;

        const { error } = await supabase
          .from('prompt_history')
          .update({ favorite: newFavorite })
          .eq('id', id);

        if (!error) return;
      } catch (e) {
        console.warn('[PromptHistory] Supabase toggle failed, falling back');
      }
    }
  }

  const history = getLocalStorageFallback();
  const idx = history.findIndex((r: PromptHistoryRecord) => r.id === id);
  if (idx !== -1) {
    history[idx].favorite =
      favorite !== undefined ? favorite : !history[idx].favorite;
    saveToLocalStorage(history);
  }
}

export async function deletePrompt(id: string): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseServer() || getSupabaseBrowser();
    if (supabase) {
      try {
        const { error } = await supabase.from('prompt_history').delete().eq('id', id);
        if (!error) return;
      } catch (e) {
        console.warn('[PromptHistory] Supabase delete failed, falling back');
      }
    }
  }

  const history = getLocalStorageFallback().filter((r: PromptHistoryRecord) => r.id !== id);
  saveToLocalStorage(history);
}

export async function searchPrompt(query: string, limit: number = 20): Promise<PromptHistoryRecord[]> {
  return getPromptHistory({ search: query, limit });
}

export async function getPromptById(id: string): Promise<PromptHistoryRecord | null> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseServer() || getSupabaseBrowser();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('prompt_history')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        if (!error && data) return data;
      } catch (e) {
        console.warn('[PromptHistory] Supabase fetch failed, falling back');
      }
    }
  }

  const history = getLocalStorageFallback();
  return history.find((r: PromptHistoryRecord) => r.id === id) || null;
}

export async function updatePromptFeedback(
  id: string, 
  feedback: 'excellent' | 'average' | 'failed'
): Promise<void> {
  const prompt = await getPromptById(id);
  if (!prompt) return;

  const newScore = calculatePromptScore({
    prompt: prompt.output,
    projectType: prompt.project_type,
    executionSuccess: prompt.execution_success,
    userFeedback: feedback
  });

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseServer() || getSupabaseBrowser();
    if (supabase) {
      try {
        const { error } = await supabase
          .from('prompt_history')
          .update({ 
            feedback,
            score: newScore.score,
            score_details: newScore
          })
          .eq('id', id);
        if (!error) return;
      } catch (e) {
        console.warn('[PromptHistory] Supabase feedback update failed');
      }
    }
  }

  const history = getLocalStorageFallback();
  const idx = history.findIndex((r: PromptHistoryRecord) => r.id === id);
  if (idx !== -1) {
    history[idx] = {
      ...history[idx],
      feedback,
      score: newScore.score,
      score_details: newScore
    };
    saveToLocalStorage(history);
  }
}

export async function updateExecutionSuccess(id: string, success: boolean): Promise<void> {
  const prompt = await getPromptById(id);
  if (!prompt) return;

  const newScore = calculatePromptScore({
    prompt: prompt.output,
    projectType: prompt.project_type,
    executionSuccess: success,
    userFeedback: prompt.feedback
  });

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseServer() || getSupabaseBrowser();
    if (supabase) {
      try {
        const { error } = await supabase
          .from('prompt_history')
          .update({ 
            execution_success: success,
            score: newScore.score,
            score_details: newScore
          })
          .eq('id', id);
        if (!error) return;
      } catch (e) {
        console.warn('[PromptHistory] Supabase execution update failed');
      }
    }
  }

  const history = getLocalStorageFallback();
  const idx = history.findIndex((r: PromptHistoryRecord) => r.id === id);
  if (idx !== -1) {
    history[idx] = {
      ...history[idx],
      execution_success: success,
      score: newScore.score,
      score_details: newScore
    };
    saveToLocalStorage(history);
  }
}

export async function savePromptVersion(
  originalId: string,
  improvedPrompt: string
): Promise<PromptHistoryRecord> {
  const original = await getPromptById(originalId);
  if (!original) {
    throw new Error('Original prompt not found');
  }

  const nextVersion = (original.version || 1) + 1;
  
  return await savePrompt({
    title: original.title,
    project_type: original.project_type,
    phase: original.phase,
    project_id: original.project_id,
    input: original.input,
    output: improvedPrompt,
    tags: [...original.tags],
    version: nextVersion,
    parent_id: originalId
  });
}
