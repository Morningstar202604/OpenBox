// 数据访问层 · 投稿与反馈域：社区投稿提交（双重校验 + 查重预检）与失效反馈
import { getSupabase, hasSupabase } from '../supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import { isValidUrl } from '../format';
import { readJSON, writeJSON } from '../storage';
import type { Submission } from '../types';
import { invalidateCache } from './resources';
import type { SubmissionRow } from './shared';

export type SubmitResult = {
  ok: boolean;
  mode: 'supabase' | 'local';
  id?: string;
  message?: string;
};

/** 投稿数据校验（前端 + 数据层双重防线，防垃圾/畸形提交） */
function validateSubmission(p: Omit<Submission, 'id' | 'status' | 'createdAt'>): string | null {
  const name = p.name?.trim() ?? '';
  const url = p.url?.trim() ?? '';
  const summary = p.summary?.trim() ?? '';
  if (!name || name.length > 80) return '名称需 1–80 个字符';
  if (!isValidUrl(url) || url.length > 500) return '请输入有效的 http(s) 链接';
  if (!summary || summary.length > 200) return '简介需 1–200 个字符';
  if (p.description && p.description.length > 1000) return '详细描述最多 1000 个字符';
  return null;
}

/** 投稿查重预检：与 0006 唯一索引同语义（lower(url)），大小写不敏感；失败不阻塞提交 */
async function precheckDuplicateUrl(
  sb: SupabaseClient,
  url: string,
): Promise<string | null> {
  try {
    // 转义 like 通配符，避免 URL 中的 %20 等编码被当作模式
    const escaped = url.replace(/[\\%_]/g, (c) => `\\${c}`);
    const { data: dup } = await sb
      .from('submissions')
      .select('id, status')
      .ilike('url', escaped)
      .in('status', ['pending', 'approved'])
      .limit(1);
    if (dup && dup.length) return '该链接已投稿过（待审或已收录），请勿重复提交';
    return null;
  } catch {
    /* 预检失败不阻塞提交，唯一索引仍会拦截 */
    return null;
  }
}

export async function submitResource(
  payload: Omit<Submission, 'id' | 'status' | 'createdAt'>,
): Promise<SubmitResult> {
  const err = validateSubmission(payload);
  if (err) return { ok: false, mode: 'local', message: err };
  if (hasSupabase) {
    const sb = await getSupabase();
    if (!sb) return { ok: false, mode: 'local', message: 'Supabase 客户端初始化失败' };
    // 同 URL 去重预检（服务端另有 lower(url) 部分唯一索引兜底，见 0006 迁移）
    const dupMsg = await precheckDuplicateUrl(sb, payload.url);
    if (dupMsg) return { ok: false, mode: 'supabase', message: dupMsg };
    try {
      const { data, error } = await sb
        .from('submissions')
        .insert({ ...payload, status: 'pending', created_at: new Date().toISOString() })
        .select()
        .single();
      if (!error && data) {
        invalidateCache();
        return { ok: true, mode: 'supabase', id: (data as SubmissionRow).id, message: '投稿已提交，等待审核通过后展示。' };
      }
      // 23505 = 唯一索引冲突（并发下预检漏判的重复投稿），给出与预检一致的友好文案
      if (error?.code === '23505') {
        return { ok: false, mode: 'supabase', message: '该链接已投稿过（待审或已收录），请勿重复提交' };
      }
      return { ok: false, mode: 'supabase', message: error?.message ?? '提交失败' };
    } catch {
      return { ok: false, mode: 'supabase', message: '投稿失败，请稍后再试。' };
    }
  }
  // 本地兜底：存入 localStorage（仅本机可见，不进入审核库）
  const item: Submission = {
    ...payload,
    id: `local-${Date.now()}`,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  const list = readJSON<Submission[]>('ob_submissions', []);
  if (writeJSON('ob_submissions', [...list, item])) {
    return { ok: true, mode: 'local', id: item.id, message: '已保存到本地草稿（未配置 Supabase，不会进入审核库）。' };
  }
  return { ok: false, mode: 'local', message: '本地保存失败（浏览器存储不可用）。' };
}

/** 匿名反馈报告：写入 reports 表（无需登录） */
export async function submitReport(
  resourceId: string,
  reason: string,
  note?: string,
): Promise<{ ok: boolean; message?: string }> {
  if (!hasSupabase) {
    return { ok: false, message: '反馈功能需要配置 Supabase' };
  }
  const sb = await getSupabase();
  if (!sb) return { ok: false, message: 'Supabase 客户端初始化失败' };
  try {
    const { error } = await sb.from('reports').insert({
      resource_id: resourceId,
      reason: note ? `${reason} | ${note}` : reason,
      created_at: new Date().toISOString(),
    });
    if (error) return { ok: false, message: error.message };
    invalidateCache();
    return { ok: true, message: '感谢反馈！' };
  } catch {
    return { ok: false, message: '提交失败，请稍后再试。' };
  }
}
