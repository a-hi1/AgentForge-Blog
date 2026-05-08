import { createClient } from '@supabase/supabase-js';

// 读取环境变量 - 清理 URL 中的多余路径
const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
// 移除 /rest/v1/ 或其他路径后缀，只保留基础 URL
const cleanSupabaseUrl = rawSupabaseUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');

const supabaseUrl = cleanSupabaseUrl;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// 浏览器客户端（客户端组件使用）
export const supabaseBrowser = createClient(supabaseUrl, supabaseAnonKey);

// 服务器客户端（服务端组件/API使用）
export const supabaseServer = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

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
