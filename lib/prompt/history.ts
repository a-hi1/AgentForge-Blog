import { getSupabaseServer, getSupabaseBrowser, isSupabaseConfigured } from '../supabase/client';

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
}): Promise<PromptHistoryRecord> {
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
}): Promise<PromptHistoryRecord[]> {
  let records: PromptHistoryRecord[] = [];

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseServer() || getSupabaseBrowser();
    if (supabase) {
      try {
        let query = supabase
          .from('prompt_history')
          .select('*')
          .order('created_at', { ascending: false });

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

  if (options?.limit) {
    records = records.slice(0, options.limit);
  }

  return records;
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
