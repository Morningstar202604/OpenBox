import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL as CONFIG_URL, SUPABASE_ANON_KEY as CONFIG_KEY, SUPABASE_PROXY_URL as CONFIG_PROXY } from "./supabaseConfig";

// 本地开发可用 .env 的 VITE_SUPABASE_* 覆盖；部署到静态托管（GitHub Pages）时 .env 不会被
// 打包进产物，因此 supabaseConfig.ts 里预置了「公开的」anon key，保证线上构建也能启用登录/收藏/反馈。
// ⚠️ 切勿把 service_role / secret 写进前端：那等于把数据库管理权公开给所有人。
const envUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? "";
const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? "";
const envProxy = (import.meta.env.VITE_SUPABASE_PROXY_URL as string | undefined)?.trim() ?? "";

const supabaseUrl = (envUrl || CONFIG_URL).trim();
const supabaseAnonKey = (envKey || CONFIG_KEY).trim();
// 代理地址优先级：.env > supabaseConfig.ts。配置后所有 API 请求走代理（国内加速）。
const supabaseProxyUrl = (envProxy || CONFIG_PROXY).trim();

const isReal =
  supabaseUrl.startsWith("https://") &&
  !supabaseUrl.includes("your-project-id") &&
  supabaseAnonKey.length > 0 &&
  !supabaseAnonKey.includes("your-anon-key");

export const hasSupabase = isReal;

// 实际请求地址：配了代理走代理，否则直连 Supabase。
const requestUrl = (supabaseProxyUrl || supabaseUrl).trim();

export const supabase: SupabaseClient | null = isReal
  ? createClient(requestUrl, supabaseAnonKey, {
      auth: {
        // 确保 auth 回调用 Supabase 原始域名（而非代理域名），避免 OAuth 回调地址不匹配。
        detectSessionInUrl: true,
      },
    })
  : null;

/**
 * 认证功能总开关（当前 true：登录/注册 UI 已接好）。
 * 线上可用的完整前提：
 *   1) 本文件已注入公开 anon key（见 supabaseConfig.ts）—— 已完成；
 *   2) 仓库 Settings → Pages → Source 设为「Deploy from a branch: main /docs」；
 *   3) Supabase Authentication → Providers → Email 关闭「Confirm email」（否则注册后需验证邮件，
 *      未配 SMTP 会卡死，用户永远登不进来）。
 * 数据库表（profiles/favorites/reports/submissions/resources/categories）已建好。
 * 未配置凭证时自动降级为本地模式：收藏存 localStorage、投稿存本地草稿、反馈不可用。
 */
export const AUTH_ENABLED = true;
