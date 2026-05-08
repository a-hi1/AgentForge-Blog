import { createClient, SupabaseClient } from '@supabase/supabase-js';

let browserClient: SupabaseClient | null = null;
let serverClient: SupabaseClient | null = null;

function getEnv() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return { url, anonKey, serviceKey };
}

function logEnvCheck() {
  const { url, anonKey, serviceKey } = getEnv();
  console.log('[ENV CHECK]', {
    hasUrl: !!url,
    hasKey: !!anonKey,
    hasServiceKey: !!serviceKey,
  });
}

export function getSupabaseBrowser(): SupabaseClient | null {
  if (browserClient) return browserClient;

  const { url, anonKey } = getEnv();

  if (!url || !anonKey) {
    console.warn('[Supabase] Browser client: env missing');
    logEnvCheck();
    return null;
  }

  browserClient = createClient(url, anonKey);
  return browserClient;
}

export function getSupabaseServer(): SupabaseClient | null {
  if (serverClient) return serverClient;

  const { url, serviceKey } = getEnv();

  if (!url || !serviceKey) {
    console.warn('[Supabase] Server client: env missing');
    logEnvCheck();
    return null;
  }

  serverClient = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return serverClient;
}

export function isSupabaseConfigured(): boolean {
  const { url, serviceKey } = getEnv();
  const configured = !!url && !!serviceKey;
  console.log('[Supabase] Configured:', configured, {
    url: url ? `${url.substring(0, 20)}...` : 'missing',
    hasServiceKey: !!serviceKey,
  });
  return configured;
}

export function getSupabaseDebugInfo() {
  const { url, anonKey, serviceKey } = getEnv();
  return {
    url: url ? `${url.substring(0, 30)}...` : 'missing',
    hasAnonKey: !!anonKey,
    hasServiceKey: !!serviceKey,
  };
}
