// 分维度评分数据层（「针对不同模块的不同评论体系」的评分部分）。
// - Supabase 可用：读写 ratings 表（每用户每维度一行，upsert），聚合均值跨用户共享。
// - 本地模式（未配置 Supabase）：暂不支持云端评分，返回空（UI 提示登录/连接后可用）。
import { supabase, hasSupabase, AUTH_ENABLED } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';

const authOn = AUTH_ENABLED && hasSupabase;

export interface DimensionAvg {
  dimension: string;
  avg: number; // 1-5
  count: number;
}
export interface ResourceRatings {
  byDimension: Record<string, DimensionAvg>;
  overall: number; // 1-5 综合均值
  total: number; // 总评分数
}

/** 读取某资源的分维度聚合（均值 + 票数） */
export async function getRatings(resourceId: string): Promise<ResourceRatings> {
  const empty: ResourceRatings = { byDimension: {}, overall: 0, total: 0 };
  if (!(authOn && supabase)) return empty;
  try {
    const { data, error } = await supabase
      .from('ratings')
      .select('dimension, score')
      .eq('resource_id', resourceId);
    if (error || !data) return empty;
    const acc: Record<string, { sum: number; n: number }> = {};
    for (const r of data as { dimension: string; score: number }[]) {
      if (!acc[r.dimension]) acc[r.dimension] = { sum: 0, n: 0 };
      acc[r.dimension].sum += r.score;
      acc[r.dimension].n += 1;
    }
    const byDimension: Record<string, DimensionAvg> = {};
    let overallSum = 0;
    let overallN = 0;
    for (const [dim, v] of Object.entries(acc)) {
      byDimension[dim] = { dimension: dim, avg: v.sum / v.n, count: v.n };
      overallSum += v.sum;
      overallN += v.n;
    }
    return { byDimension, overall: overallN ? overallSum / overallN : 0, total: overallN };
  } catch {
    return empty;
  }
}

/**
 * 提交/更新某一维度的评分（1-5）。需登录（评分是注册后功能）。
 * 用 (resource_id, user_id, dimension) 唯一约束做 upsert，重复提交即覆盖。
 */
export async function upsertRating(
  resourceId: string,
  dimension: string,
  score: number,
): Promise<{ ok: boolean; message?: string }> {
  const uid = useAuthStore.getState().user?.id;
  if (!uid) return { ok: false, message: '请先登录后评分' };
  if (!supabase) return { ok: false, message: '评分服务未连接' };
  try {
    const { error } = await supabase
      .from('ratings')
      .upsert(
        { resource_id: resourceId, user_id: uid, dimension, score },
        { onConflict: 'resource_id,user_id,dimension' },
      );
    if (error) return { ok: false, message: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, message: String(e) };
  }
}

export interface MyRating {
  resourceId: string;
  dimension: string;
  score: number;
}

/** 读取当前登录用户的所有评分（用于「我的评分」） */
export async function getMyRatings(userId: string): Promise<MyRating[]> {
  if (!(authOn && supabase)) return [];
  try {
    const { data, error } = await supabase
      .from('ratings')
      .select('resource_id, dimension, score')
      .eq('user_id', userId);
    if (error || !data) return [];
    return (data as { resource_id: string; dimension: string; score: number }[]).map((r) => ({
      resourceId: r.resource_id,
      dimension: r.dimension,
      score: r.score,
    }));
  } catch {
    return [];
  }
}
