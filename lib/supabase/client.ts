import { createClient, SupabaseClient } from '@supabase/supabase-js';

let browserClient: SupabaseClient | null = null;
let serverClient: SupabaseClient | null = null;
let envLogged = false;

function getEnv() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return { url, anonKey, serviceKey };
}

export function getSupabaseBrowser(): SupabaseClient | null {
  if (browserClient) return browserClient;

  const { url, anonKey } = getEnv();

  if (!url || !anonKey) {
    if (!envLogged) {
      console.warn('[Supabase] 环境变量缺失，数据库功能不可用');
      envLogged = true;
    }
    return null;
  }

  browserClient = createClient(url, anonKey);
  return browserClient;
}

export function getSupabaseServer(): SupabaseClient | null {
  if (serverClient) return serverClient;

  const { url, serviceKey } = getEnv();

  if (!url || !serviceKey) {
    if (!envLogged) {
      console.warn('[Supabase] 环境变量缺失，数据库功能不可用');
      envLogged = true;
    }
    return null;
  }

  serverClient = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return serverClient;
}

export function isSupabaseConfigured(): boolean {
  const { url, serviceKey } = getEnv();
  return !!url && !!serviceKey;
}

export function getSupabaseDebugInfo() {
  const { url, anonKey, serviceKey } = getEnv();
  return {
    url: url ? `${url.substring(0, 30)}...` : 'missing',
    hasAnonKey: !!anonKey,
    hasServiceKey: !!serviceKey,
  };
}
