// 免费 API 排行榜评分体系（自设计）
// 评分公式：综合 8 个维度加权求和（满分 100）
//   免费额度 25 + 官方/社区 15 + 稳定性 20 + 易访问性 10
//   + 模型丰富度 15 + 签到机制 5 + 人气 10 + 社区验证 ±5
import type { Resource } from '@/lib/types';

export interface RankPart {
  label: string;
  score: number;
  max: number;
}

export interface RankScore {
  resource: Resource;
  total: number;
  parts: RankPart[];
  votes: { ok: number; dead: number };
}

/** 对一条 free-api 资源打分（votes 来自社区验证统计，可缺省） */
export function scoreFreeApi(
  r: Resource,
  votes?: { ok: number; dead: number },
): RankScore {
  const tags = (r.tags ?? []).join(' ');

  // ① 免费额度（25）：纯免费最高，试用其次
  const freeScore =
    r.type === 'free' ? 25 : r.type === 'freemium' ? 18 : r.type === 'trial' ? 10 : 4;

  // ② 官方/社区（15）：官方背书更可靠
  const officialScore = r.official ? 15 : 8;

  // ③ 稳定性（20）：以实跳验证状态为准
  const statusScore =
    r.status === 'ok' ? 20 : r.status === 'unstable' ? 10 : r.status === 'unknown' ? 6 : 0;

  // ④ 易访问性（10）：国内直连加分，纯海外减分
  const accessScore = /国产|国内直连|CN节点/.test(tags) ? 10 : /海外/.test(tags) ? 5 : 7;

  // ⑤ 模型丰富度（15）：支持模型越多越值
  const n = r.models?.length ?? 0;
  const modelScore = n >= 5 ? 15 : n >= 3 ? 12 : n >= 1 ? 8 : 5;

  // ⑥ 签到/免费额度机制（5）：有签到白嫖机制加分
  const checkinScore = /签到/.test(tags) ? 5 : 0;

  // ⑦ 人气（10）：编辑人气分归一化
  const popScore = Math.round(((r.popularity ?? 0) / 100) * 10);

  // ⑧ 社区验证（±5）：ok 票占比高加分、dead 多扣分
  let voteScore = 0;
  const v = votes ?? { ok: 0, dead: 0 };
  if (v.ok + v.dead > 0) {
    const ratio = v.ok / (v.ok + v.dead);
    voteScore = Math.round((ratio * 2 - 1) * 5);
  }

  const total = Math.max(0, Math.min(100, freeScore + officialScore + statusScore + accessScore + modelScore + checkinScore + popScore + voteScore));

  return {
    resource: r,
    total,
    parts: [
      { label: '免费额度', score: freeScore, max: 25 },
      { label: '官方/社区', score: officialScore, max: 15 },
      { label: '稳定性', score: statusScore, max: 20 },
      { label: '易访问性', score: accessScore, max: 10 },
      { label: '模型丰富度', score: modelScore, max: 15 },
      { label: '签到机制', score: checkinScore, max: 5 },
      { label: '人气', score: popScore, max: 10 },
      { label: '社区验证', score: voteScore, max: 5 },
    ],
    votes: v,
  };
}

// ============================================================================
// 通用混合评分体系（覆盖全部子类型，替代原 RankingList 中简陋的 hotScore）
// 设计目标：透明、可解释、不「奇怪」。
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
  const days = r.updatedAt ? Math.max(0, (Date.now() - Date.parse(r.updatedAt)) / 86_400_000) : 999;
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
