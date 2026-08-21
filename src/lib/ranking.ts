// 通用混合评分体系（覆盖全部子类型，替代原 RankingList 中简陋的 hotScore）
// 设计目标：透明、可解释、不「奇怪」。
import type { Resource } from '@/lib/types';
//   总分 = 静态基线(0-80) + 真实信号(0-30)，满分 100。
//   静态基线：与子类型无关的通用维度（免费度/官方可信/稳定性/新鲜度/功能丰富/人气）。
//   真实信号：来自社区验证投票、讨论数、收藏数、分维度均分（需 Supabase，缺省为 0）。
// 权重集中在此一处，调整评分只改这里，不散落到组件。
// ============================================================================
export interface ScorePart {
  label: string;
  score: number;
  max: number;
}
export interface ScoreBreakdown {
  total: number; // 0-100（clamp 后）
  static: number; // 0-80
  signal: number; // -10 ~ 30（社区判定失效时为负，用于下沉）
  parts: ScorePart[];
}
export interface ResourceSignals {
  verifyOk?: number;
  verifyDead?: number;
  commentCount?: number;
  favoriteCount?: number;
  ratingAvg?: number; // 0-1
}

// 静态基线（满分 80）：通用、可解释，不依赖任何后端数据。
function staticScore(r: Resource): { score: number; parts: ScorePart[] } {
  const freeDegree = r.type === 'free' ? 25 : r.type === 'freemium' ? 18 : r.type === 'trial' ? 10 : 4;
  // 官方可信给 modest 加分：官方≠免费（用户要求不混淆），故不过分加权。
  const officialTrust = r.official ? 8 : 5;
  const status = r.status === 'ok' ? 15 : r.status === 'unstable' ? 8 : r.status === 'unknown' ? 5 : 2;
  // 防御非法日期串：Date.parse 返回 NaN 会污染整条评分链（NaN 传播），回退为最旧
  const parsedTs = r.updatedAt ? Date.parse(r.updatedAt) : NaN;
  const days = Number.isFinite(parsedTs) ? Math.max(0, (Date.now() - parsedTs) / 86_400_000) : 999;
  const fresh = Math.max(0, Math.min(12, 12 - days / 30)); // 近一月满分，逐月衰减
  const rich = Math.min(10, (r.tags?.length ?? 0) + (r.models?.length ?? 0) + (r.protocols?.length ?? 0));
  const pop = Math.round(((r.popularity ?? 0) / 100) * 10);
  const parts: ScorePart[] = [
    { label: '免费度', score: freeDegree, max: 25 },
    { label: '官方可信', score: officialTrust, max: 8 },
    { label: '稳定性', score: status, max: 15 },
    { label: '新鲜度', score: Math.round(fresh), max: 12 },
    { label: '功能丰富', score: rich, max: 10 },
    { label: '人气', score: pop, max: 10 },
  ];
  const score = parts.reduce((a, p) => a + p.score, 0);
  return { score: Math.min(80, score), parts };
}

// 真实信号（满分 30）：社区行为驱动，缺省 0（无后端数据时退化为纯静态）。
function signalScore(s?: ResourceSignals): { score: number; parts: ScorePart[] } {
  if (!s) return { score: 0, parts: [] };
  const ok = s.verifyOk ?? 0;
  const dead = s.verifyDead ?? 0;
  // ±10：ok 占比映射到 [-1,1] 再放大 10 倍。
  // 注意括号——必须先算完 (ratio*2-1)*10 再 round，否则中间值会被量化成 -10/0/10 三档而失真。
  const verify = ok + dead > 0 ? Math.round(((ok / (ok + dead)) * 2 - 1) * 10) : 0;
  const comments = Math.min(8, s.commentCount ?? 0); // 0-8 讨论热度
  const favs = Math.min(6, Math.round((s.favoriteCount ?? 0) / 5)); // 0-6 收藏热度
  const rating = s.ratingAvg != null ? Math.round(Math.max(0, Math.min(1, s.ratingAvg)) * 6) : 0; // 0-6
  const parts: ScorePart[] = [
    { label: '社区验证', score: verify, max: 10 },
    { label: '讨论热度', score: comments, max: 8 },
    { label: '收藏热度', score: favs, max: 6 },
    { label: '用户评分', score: rating, max: 6 },
  ];
  // verify 保留符号参与求和：多数人投「已失效」时必须真实扣分，否则失效资源无法下沉。
  const score = verify + comments + favs + rating;
  return { score: Math.max(-10, Math.min(30, score)), parts };
}

/** 通用混合评分：返回 0-100 总分与各维度明细（详情页/榜单均可复用） */
export function scoreResource(r: Resource, signals?: ResourceSignals): ScoreBreakdown {
  const st = staticScore(r);
  const sg = signalScore(signals);
  const total = Math.max(0, Math.min(100, st.score + sg.score));
  return { total, static: st.score, signal: sg.score, parts: [...st.parts, ...sg.parts] };
}
