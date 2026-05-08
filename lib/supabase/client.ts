import { createClient, SupabaseClient } from '@supabase/supabase-js';

const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const cleanSupabaseUrl = rawSupabaseUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');

const supabaseUrl = cleanSupabaseUrl;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const PLACEHOLDER = 'placeholder-not-configured';

function createBrowserClient(): SupabaseClient {
  if (supabaseUrl && supabaseAnonKey) {
    return createClient(supabaseUrl, supabaseAnonKey);
  }
  return createClient('https://placeholder.supabase.co', PLACEHOLDER);
}

function createServerClient(): SupabaseClient {
  if (supabaseUrl && supabaseServiceRoleKey) {
    return createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return createClient('https://placeholder.supabase.co', PLACEHOLDER, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export const supabaseBrowser = createBrowserClient();
export const supabaseServer = createServerClient();

// Helper 函数：检查是否配置了 Supabase
export function isSupabaseConfigured() {
  const configured = !!supabaseUrl && !!supabaseServiceRoleKey;
  console.log('[Supabase] Configured:', configured, {
    url: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'missing',
    hasServiceKey: !!supabaseServiceRoleKey,
  });
  return configured;
}

// 调试信息导出
export function getSupabaseDebugInfo() {
  return {
    url: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'missing',
    hasAnonKey: !!supabaseAnonKey,
    hasServiceKey: !!supabaseServiceRoleKey,
  };
}
