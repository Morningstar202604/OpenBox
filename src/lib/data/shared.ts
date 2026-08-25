// 数据访问层 · 共享基座
// withSupabase：云端读取统一通道；SubmissionRow：投稿表 DB 行形状与归一化。
// 供 data/ 下各域模块复用（2026-08 自 671 行单文件拆分，见 lib/data.ts 门面说明）。
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase, hasSupabase } from '../supabase';

/**
 * 云端读取统一通道：未配置 Supabase / 客户端初始化失败 / 网络异常时
 * 统一返回 fallback（降级语义集中一处，调用方只写 happy path）。
 * 需要感知具体错误（如 23505 冲突码）的写入路径不适用，保持显式处理。
 */
export async function withSupabase<T>(fallback: T, fn: (sb: SupabaseClient) => Promise<T>): Promise<T> {
  if (!hasSupabase) return fallback;
  try {
    const sb = await getSupabase();
    if (!sb) return fallback;
    return await fn(sb);
  } catch {
    return fallback;
  }
}

/**
 * 投稿表行形状（snake_case，与 Supabase PostgREST 返回格式一致）。
 * 注意与 TS 类型 Submission 的区别：后者用 camelCase（createdAt）。
 * 修正了此前直接用 Submission 类型强制转换导致 created_at→createdAt 字段丢失的 bug。
 */
export interface SubmissionRow {
  id: string;
  subType: string;
  name: string;
  url: string;
  type: string;
  summary: string;
  description: string | null;
  submitter: string | null;
  status: string;
  created_at: string;
}

/**
 * 行级归一化：历史库的 subType 列可能是小写 subtype（0001 旧文件未加引号被
 * Postgres 折叠，0008 迁移负责重命名收编）。在映射层做一次防御性读取，
 * 无论库处于哪种迁移状态，前端契约都稳定为驼峰 subType。
 */
export function normalizeSubmissionRow(row: Partial<SubmissionRow> & { subtype?: string }): SubmissionRow {
  return {
    ...(row as SubmissionRow),
    subType: row.subType ?? row.subtype ?? '',
  };
}
