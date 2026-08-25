// 数据访问层 · 社区验证投票域（「还能不能薅」社区验证机制）
// - Supabase 可用：投票写入 verifications 表，统计来自云端（跨用户共享）。
// - 本地模式：投票记 localStorage，仅本设备可见（降级可用）。
// - 本设备投票记录始终存 localStorage，用于防重复 + 乐观计数。
import { getSupabase, hasSupabase } from '../supabase';
import { readJSON, readRaw, writeJSON, writeRaw } from '../storage';
import { withSupabase } from './shared';
import { invalidateCache } from './resources';

export interface VerificationStats {
  ok: number;
  dead: number;
  total: number;
  lastAt: string | null;
}

const VKEY = 'ob_verifications';

/**
 * 稳定匿名设备指纹：首次生成随机 UUID 存 localStorage，之后复用。
 * 用途：服务端投票去重（verifications.voter_fp 唯一索引 + 0008 RLS 长度校验）。
 * 随机生成、不含任何个人身份信息；localStorage 不可用时退化为会话级内存指纹
 * （仍满足服务端 ≥8 字符校验与会话内去重，不再返回空串绕过约束）。
 */
let memoryFingerprint: string | null = null;

function newFingerprint(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}-${Math.random().toString(36).slice(2, 12)}`;
}

function voterFingerprint(): string {
  const saved = readRaw('ob_voter_fp');
  if (saved) return saved.slice(0, 64);
  // localStorage 不可用：退化为会话级内存指纹（仍满足服务端长度校验与会话内去重）
  memoryFingerprint ??= newFingerprint();
  writeRaw('ob_voter_fp', memoryFingerprint);
  return memoryFingerprint;
}

/** 本设备投票记录的存储形状 */
export interface LocalVote {
  result: 'ok' | 'dead';
  at: string;
  synced?: boolean;
}

function readVoteMap(): Record<string, LocalVote> {
  return readJSON<Record<string, LocalVote>>(VKEY, {});
}

/** 读取本设备的投票记录（未投返回 null）；导出供 VerifyWidget 复用，避免重复解析 */
export function getLocalVote(resourceId: string): LocalVote | null {
  return readVoteMap()[resourceId] ?? null;
}

/** 记录本设备投票；synced=true 表示该票已成功写入云端（统计时不再与云端重复计数） */
function saveLocalVote(resourceId: string, result: 'ok' | 'dead', synced = false) {
  const m = readVoteMap();
  m[resourceId] = { result, at: new Date().toISOString(), synced };
  writeJSON(VKEY, m);
}

/** 提交一次验证投票：'ok'=还能用，'dead'=已失效；duplicate=true 表示该设备此前已投过（服务端去重命中） */
export async function submitVerification(
  resourceId: string,
  result: 'ok' | 'dead',
): Promise<{ ok: boolean; duplicate?: boolean; message?: string }> {
  // 先落本地（无论云端成败都保留本设备记录，用于防重复 + 未上云时的兜底统计）
  saveLocalVote(resourceId, result, false);
  if (hasSupabase) {
    const sb = await getSupabase();
    if (!sb) return { ok: true };
    try {
      const { error } = await sb
        .from('verifications')
        .insert({ resource_id: resourceId, result, voter_fp: voterFingerprint(), created_at: new Date().toISOString() });
      if (error) {
        // 23505 = 唯一索引冲突：该设备指纹对此资源已有服务端选票。
        // 标记本地票已同步，统计以云端为准，避免同一设备被计两次。
        if (error.code === '23505') {
          saveLocalVote(resourceId, result, true);
          return { ok: true, duplicate: true, message: '本设备已投过票' };
        }
        return { ok: false, message: error.message };
      }
      // 云端写入成功：标记本地票已上云，统计时以云端为准，避免同票被计两次
      saveLocalVote(resourceId, result, true);
      invalidateCache();
    } catch {
      /* 云端失败不阻塞：本地已记录（未上云），统计时作兜底计入 */
    }
  }
  return { ok: true };
}

/** 读取某资源的验证统计（总票数 / 可用票 / 失效票 / 最近验证时间） */
export async function getVerificationStats(resourceId: string): Promise<VerificationStats> {
  const local = getLocalVote(resourceId);
  // 云端精确计数（head 请求不传回行）——不受 PostgREST max_rows 截断影响，
  // 热门资源过千票也不会悄悄算少；未配置/失败时 cloud 为 null，走本地兜底
  const cloud = await withSupabase<{ ok: number; dead: number; lastAt: string | null } | null>(
    null,
    async (sb) => {
      const countOpts = { count: 'exact', head: true } as const;
      const [okRes, deadRes, lastRes] = await Promise.all([
        sb.from('verifications').select('*', countOpts).eq('resource_id', resourceId).eq('result', 'ok'),
        sb.from('verifications').select('*', countOpts).eq('resource_id', resourceId).eq('result', 'dead'),
        sb
          .from('verifications')
          .select('created_at')
          .eq('resource_id', resourceId)
          .order('created_at', { ascending: false })
          .limit(1),
      ]);
      if (okRes.error || deadRes.error || lastRes.error) return null;
      const lastRow = lastRes.data as { created_at: string }[] | null;
      return {
        ok: okRes.count ?? 0,
        dead: deadRes.count ?? 0,
        lastAt: lastRow && lastRow.length ? lastRow[0].created_at : null,
      };
    },
  );
  // 云端可用：以云端为准；本设备「未成功上云」的票兜底计入（已上云的不重复计）
  let ok = cloud?.ok ?? 0;
  let dead = cloud?.dead ?? 0;
  let lastAt = cloud?.lastAt ?? null;
  if (local && (cloud === null || local.synced !== true)) {
    if (local.result === 'ok') ok += 1;
    else dead += 1;
    if (!lastAt || local.at > lastAt) lastAt = local.at;
  }
  return { ok, dead, total: ok + dead, lastAt };
}

/** 批量读取多个资源的验证统计：单次 in() 查询替代逐资源 N 次请求（榜单/列表页性能关键） */
export async function getVerificationStatsBatch(
  resourceIds: string[],
): Promise<Record<string, { ok: number; dead: number }>> {
  const out: Record<string, { ok: number; dead: number }> = {};
  // 本设备「未成功上云」的票先兜底计入
  for (const id of resourceIds) {
    const local = getLocalVote(id);
    if (local && local.synced !== true) {
      out[id] = { ok: local.result === 'ok' ? 1 : 0, dead: local.result === 'dead' ? 1 : 0 };
    }
  }
  if (!resourceIds.length) return out;
  return withSupabase(out, async (sb) => {
    // 分页循环拉取：显式 range 绕开 PostgREST 默认 max_rows 截断，
    // 避免热门资源票数被静默算少；order 保证分页窗口稳定（并发写不漏不重）
    const PAGE = 1000;
    let from = 0;
    for (;;) {
      const { data, error } = await sb
        .from('verifications')
        .select('resource_id, result')
        .in('resource_id', resourceIds)
        .order('created_at', { ascending: true })
        .range(from, from + PAGE - 1);
      if (error || !data || !data.length) break;
      for (const r of data as { resource_id: string; result: string }[]) {
        (out[r.resource_id] ??= { ok: 0, dead: 0 });
        if (r.result === 'ok') out[r.resource_id].ok += 1;
        else if (r.result === 'dead') out[r.resource_id].dead += 1;
      }
      if (data.length < PAGE) break;
      from += PAGE;
    }
    return out;
  });
}
