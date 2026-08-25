// 数据访问层 · 管理员审核域（issue #11）：待审队列 + 通过/拒绝。
// 权限双层：前端用 VITE_ADMIN_EMAILS 显示入口，服务端 RLS（0006 is_admin()）强制执行。
import { getSupabase } from '../supabase';
import type { ResourceType, Submission } from '../types';
import { withSupabase, SubmissionRow, normalizeSubmissionRow } from './shared';
import { invalidateCache } from './resources';

/** 当前登录用户是否为管理员（客户端预判；最终以 RLS 为准） */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allow = (import.meta.env.VITE_ADMIN_EMAILS as string | undefined) ?? '';
  return allow
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.toLowerCase());
}

export function getPendingSubmissions(): Promise<Submission[]> {
  return withSupabase<Submission[]>([], async (sb) => {
    const { data, error } = await sb
      .from('submissions')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error || !data) return [];
    return (data as SubmissionRow[]).map((r) => {
      const row = normalizeSubmissionRow(r);
      return {
        id: row.id,
        subType: row.subType,
        name: row.name,
        url: row.url,
        type: row.type as ResourceType,
        summary: row.summary,
        description: row.description ?? '',
        status: 'pending',
        createdAt: row.created_at,
      };
    });
  });
}

export async function reviewSubmission(
  id: string,
  decision: 'approved' | 'rejected',
): Promise<{ ok: boolean; message?: string }> {
  try {
    const sb = await getSupabase();
    if (!sb) return { ok: false, message: 'Supabase 未配置' };
    const { error } = await sb.from('submissions').update({ status: decision }).eq('id', id);
    if (error) return { ok: false, message: error.message };
    invalidateCache();
    return { ok: true };
  } catch {
    return { ok: false, message: '操作失败，请稍后再试' };
  }
}
