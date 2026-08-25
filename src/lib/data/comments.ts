// 数据访问层 · 评论留言域：每个资源一个轻量评论区
// - Supabase 可用：写入 comments 表（匿名可留、带昵称），跨用户共享。
// - 本地模式：存 localStorage（ob_comments_{id}），仅本设备可见（降级可用）。
import { getSupabase, hasSupabase } from '../supabase';
import { readJSON, writeJSON } from '../storage';
import { useAuthStore } from '@/store/useAuthStore';
import { withSupabase } from './shared';
import { invalidateCache } from './resources';

export interface CommentItem {
  id: string;
  resourceId: string;
  content: string;
  nickname: string;
  createdAt: string;
}

function localComments(resourceId: string): CommentItem[] {
  return readJSON<CommentItem[]>(`ob_comments_${resourceId}`, []);
}

function saveLocalComment(resourceId: string, item: CommentItem) {
  const list = localComments(resourceId);
  writeJSON(`ob_comments_${resourceId}`, [item, ...list].slice(0, 100));
}

/** comments 表行形状（snake_case） */
interface CommentRow {
  id: string;
  resource_id: string;
  content: string;
  nickname: string | null;
  created_at: string;
}

/** DB 行 → CommentItem（getComments / getMyComments 共用，此前两处重复实现） */
function mapCommentRow(r: CommentRow): CommentItem {
  return {
    id: r.id,
    resourceId: r.resource_id,
    content: r.content,
    nickname: r.nickname ?? '匿名',
    createdAt: r.created_at,
  };
}

/** 读取某资源的留言列表（云端在前，本地兜底并集去重） */
export async function getComments(resourceId: string): Promise<CommentItem[]> {
  const local = localComments(resourceId);
  const cloud = await withSupabase<CommentItem[]>([], async (sb) => {
    const { data, error } = await sb
      .from('comments')
      .select('id, resource_id, content, nickname, created_at')
      .eq('resource_id', resourceId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error || !data) return [];
    return (data as CommentRow[]).map(mapCommentRow);
  });
  const cloudIds = new Set(cloud.map((c) => c.id));
  return [...cloud, ...local.filter((l) => !cloudIds.has(l.id))];
}

/** 发表一条留言（昵称可选，默认匿名；登录时一并写入 user_id 以支持「我的评论」） */
export async function addComment(
  resourceId: string,
  content: string,
  nickname?: string,
): Promise<{ ok: boolean; message?: string }> {
  const nick = nickname?.trim() || '匿名';
  const uid = useAuthStore.getState().user?.id ?? null;
  const item: CommentItem = {
    // 同毫秒碰撞防护：附加随机后缀，避免 React key 重复
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    resourceId,
    content,
    nickname: nick,
    createdAt: new Date().toISOString(),
  };
  if (hasSupabase) {
    const sb = await getSupabase();
    if (!sb) {
      saveLocalComment(resourceId, item);
      return { ok: false, message: 'Supabase 客户端初始化失败' };
    }
    try {
      const { error } = await sb
        .from('comments')
        .insert({ resource_id: resourceId, content, nickname: nick, user_id: uid, created_at: item.createdAt });
      if (error) {
        saveLocalComment(resourceId, item);
        return { ok: false, message: error.message };
      }
      invalidateCache();
      return { ok: true };
    } catch {
      // 网络异常：仅存本机。必须如实告知降级，否则用户以为全世界都能看到这条评论
      saveLocalComment(resourceId, item);
      return { ok: false, message: '网络异常，内容已暂存到本机（其他设备不可见）' };
    }
  }
  saveLocalComment(resourceId, item);
  return { ok: true };
}

/** 读取某用户发表的所有留言（用于「我的评论」；按时间倒序） */
export function getMyComments(userId: string): Promise<CommentItem[]> {
  return withSupabase<CommentItem[]>([], async (sb) => {
    const { data, error } = await sb
      .from('comments')
      .select('id, resource_id, content, nickname, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error || !data) return [];
    return (data as CommentRow[]).map(mapCommentRow);
  });
}
