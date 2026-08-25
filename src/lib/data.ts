// 数据访问层（Data Access Layer）
// 设计：
//   - 资源主数据始终来自本地种子 src/data/seed.ts（可靠、离线可渲染、无需先建库）。
//   - 当配置了 Supabase 时，额外合并「已审核通过的社区投稿」(submissions.status='approved')，
//     使 Supabase 成为一个可读写的投稿审核库，而无需把整个资源库搬到云端（避免空表导致首页空白）。
//   - 投稿提交（submitResource）在配置 Supabase 时写入云端审核库，否则落本地草稿。
// 上层页面只依赖本文件的异步接口，无需关心数据来自哪里 —— 单一入口、可替换、易测试。
import { getSupabase, hasSupabase } from './supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useAuthStore } from '@/store/useAuthStore';
import { subTypes, scenarios, resolveScenarios, isSlugVisible } from '@/data/taxonomy';
import { seedResources } from '@/data/seed';
import { isValidUrl } from './format';
import { readJSON, writeJSON, readRaw, writeRaw } from './storage';
import type { Resource, ResourceStatus, ResourceType, Scenario, SubType, Submission } from './types';

/**
 * 云端读取统一通道：未配置 Supabase / 客户端初始化失败 / 网络异常时
 * 统一返回 fallback（降级语义集中一处，调用方只写 happy path）。
 * 需要感知具体错误（如 23505 冲突码）的写入路径不适用，保持显式处理。
 */
async function withSupabase<T>(fallback: T, fn: (sb: SupabaseClient) => Promise<T>): Promise<T> {
  if (!hasSupabase) return fallback;
  try {
    const sb = await getSupabase();
    if (!sb) return fallback;
    return await fn(sb);
  } catch {
    return fallback;
  }
}

export interface ResourceQuery {
  subType?: string;
  scenario?: string;
  q?: string;
  type?: ResourceType | 'all';
  status?: ResourceStatus | 'all';
  sort?: 'default' | 'name' | 'updated';
}

/** 社区投稿在合并进列表时使用的 id 前缀（与本地种子 id 区分，避免冲突） */
const COMMUNITY_PREFIX = 'community-';

/**
 * DB 行形状（snake_case，与 Supabase PostgREST 返回格式一致）。
 * 注意与 TS 类型 Submission 的区别：后者用 camelCase（createdAt）。
 * 修正了此前直接用 Submission 类型强制转换导致 created_at→createdAt 字段丢失的 bug。
 */
interface SubmissionRow {
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
function normalizeSubmissionRow(row: Partial<SubmissionRow> & { subtype?: string }): SubmissionRow {
  return {
    ...(row as SubmissionRow),
    subType: row.subType ?? row.subtype ?? '',
  };
}

/** 对给定资源列表执行统一筛选 + 排序（本地种子与社区投稿共用） */
function filterResources(list: Resource[], query: ResourceQuery): Resource[] {
  let out = [...list];

  if (query.subType) out = out.filter((r) => r.subType === query.subType);
  // 场景过滤必须与首页场景树（buildScenarioTree 用 resolveScenarios）保持同一套判定：
  // 资源未显式声明 scenarios（如 curated.ts 中 scenarios:[]）时回退到子类型默认映射，
  // 否则这部分资源在场景页会全部丢失，造成首页计数与场景页内容严重不符。
  if (query.scenario) out = out.filter((r) => resolveScenarios(r).includes(query.scenario!));
  if (query.q) {
    const q = query.q.trim().toLowerCase();
    if (q) {
      out = out.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.summary.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          (r.tags ?? []).some((t) => t.toLowerCase().includes(q)) ||
          (r.models ?? []).some((m) => m.toLowerCase().includes(q)),
      );
    }
  }
  if (query.type && query.type !== 'all') out = out.filter((r) => r.type === query.type);
  if (query.status && query.status !== 'all') out = out.filter((r) => r.status === query.status);

  switch (query.sort) {
    case 'name':
      out.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'updated':
      out.sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
      break;
    default:
      // 精选优先，其余按名称
      out.sort((a, b) => Number(b.featured ?? false) - Number(a.featured ?? false) || a.name.localeCompare(b.name));
  }
  return out;
}

/** 将一条已通过的投稿（DB 行）映射为资源实体（合并进列表展示） */
function submissionToResource(row: SubmissionRow): Resource {
  return {
    id: `${COMMUNITY_PREFIX}${row.id}`,
    subType: row.subType,
    scenarios: [],
    name: row.name,
    url: row.url,
    type: row.type as ResourceType,
    status: 'ok',
    summary: row.summary,
    description: row.description ?? '',
    tags: ['社区投稿'],
    models: [],
    protocols: [],
    pros: [],
    cons: [],
    featured: false,
    official: false,
    community: true,
    // DB 列 created_at（snake_case）→ Resource 字段 updatedAt（camelCase）
    updatedAt: row.created_at,
  };
}

/** 拉取已审核通过的社区投稿（仅配置 Supabase 时调用） */
export function getCommunityResources(): Promise<Resource[]> {
  return withSupabase<Resource[]>([], async (sb) => {
    const { data, error } = await sb
      .from('submissions')
      .select('*')
      .eq('status', 'approved')
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    return (data as SubmissionRow[]).map((r) => submissionToResource(normalizeSubmissionRow(r)));
  });
}

export async function getSubTypes(): Promise<SubType[]> {
  return subTypes;
}

export async function getScenarios(): Promise<Scenario[]> {
  return scenarios;
}

// ---- 内存缓存（多槽 LRU，30 秒 TTL） ----
// 单槽缓存的问题：首页与分类页的 query key 不同，交替导航时互相驱逐，
// 几乎每次路由切换都打一次云端；且云端超时降级的残缺结果也会被缓存 30s。
const CACHE_TTL = 30_000;
const CACHE_TTL_DEGRADED = 3_000; // 云端超时/失败降级结果的短 TTL，尽快自愈
const CACHE_MAX_SLOTS = 12;
const cacheMap = new Map<string, { data: Resource[]; ts: number; ttl: number }>();

function cacheSet(key: string, data: Resource[], ttl: number) {
  cacheMap.delete(key);
  cacheMap.set(key, { data, ts: Date.now(), ttl });
  if (cacheMap.size > CACHE_MAX_SLOTS) {
    // Map 迭代序即插入序，淘汰最旧的槽
    const oldest = cacheMap.keys().next().value;
    if (oldest !== undefined) cacheMap.delete(oldest);
  }
}

/** 清除数据层缓存，在投稿/投票等数据变更操作后调用 */
export function invalidateCache() {
  cacheMap.clear();
}

export async function getResources(query: ResourceQuery = {}): Promise<Resource[]> {
  const cacheKey = JSON.stringify(query);
  const hit = cacheMap.get(cacheKey);
  if (hit && Date.now() - hit.ts < hit.ttl) {
    // LRU touch：重新插入到末尾
    cacheMap.delete(cacheKey);
    cacheMap.set(cacheKey, hit);
    return hit.data;
  }
  // 本地种子始终作为基础来源，保证离线/未配置时也能渲染
  const local = filterResources(seedResources, query);
  if (!hasSupabase) {
    cacheSet(cacheKey, local, CACHE_TTL);
    return local;
  }
  // 已配置 Supabase：额外合并已通过审核的社区投稿
  try {
    // 云端合并设 1.5s 上限：慢网络下不让远程往返拖住首屏。
    // 超时/失败标记 degraded，只允许 3s 短缓存，TTL 过后自动重试合并。
    let degraded = false;
    const community = await new Promise<Resource[]>((resolve) => {
      const timer = setTimeout(() => {
        degraded = true;
        resolve([]);
      }, 1500);
      getCommunityResources().then(
        (rows) => {
          clearTimeout(timer);
          resolve(rows);
        },
        () => {
          clearTimeout(timer);
          degraded = true;
          resolve([]);
        },
      );
    });
    // 社区投稿同样过构建期隐藏分类闸门（校园版隐藏分类的投稿审核通过也不展示）
    const result = [...local, ...filterResources(community, query).filter((r) => isSlugVisible(r.subType))];
    cacheSet(cacheKey, result, degraded ? CACHE_TTL_DEGRADED : CACHE_TTL);
    return result;
  } catch {
    return local;
  }
}

export async function getResource(id: string): Promise<Resource | null> {
  // 本地种子直接命中（绝大多数请求走这里，零网络开销）
  if (!id.startsWith(COMMUNITY_PREFIX)) {
    return seedResources.find((r) => r.id === id) ?? null;
  }
  // 社区投稿走云端（任何异常都降级为 null，绝不让详情页永久 loading）
  return withSupabase<Resource | null>(null, async (sb) => {
    const subId = id.slice(COMMUNITY_PREFIX.length);
    const { data, error } = await sb
      .from('submissions')
      .select('*')
      .eq('id', subId)
      .eq('status', 'approved')
      .maybeSingle();
    if (!error && data) {
      const r = submissionToResource(normalizeSubmissionRow(data as SubmissionRow));
      // 与列表同一闸门：隐藏分类的投稿详情也不可达
      return isSlugVisible(r.subType) ? r : null;
    }
    return null;
  });
}

/** 获取与指定资源相关的推荐（同 subType，排除自身，最多 limit 条） */
export async function getRelatedResources(id: string, limit = 6): Promise<Resource[]> {
  const target = await getResource(id);
  if (!target) return [];
  const all = await getResources({ subType: target.subType, sort: 'default' });
  return all.filter((r) => r.id !== id).slice(0, limit);
}

/** 根据 ID 列表批量获取资源（用于最近浏览等）；本地种子同步解析，社区投稿并行查询 */
export async function getResourcesByIds(ids: string[]): Promise<Resource[]> {
  if (!ids.length) return [];
  const results = await Promise.all(ids.map((id) => getResource(id)));
  return results.filter((r): r is Resource => r !== null);
}

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
      return { ok: false, mode: 'supabase', message: '提交失败，请稍后再试' };
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

/** 当前数据模式（用于页脚提示「本地演示 / 已连接 Supabase」） */
export function dataSourceMode(): 'supabase' | 'local' {
  return hasSupabase ? 'supabase' : 'local';
}

// ============================================================
// 社区验证投票（「还能不能薅」社区验证机制）
// - Supabase 可用：投票写入 verifications 表，统计来自云端（跨用户共享）。
// - 本地模式：投票记 localStorage，仅本设备可见（降级可用）。
// - 本设备投票记录始终存 localStorage，用于防重复 + 乐观计数。
// ============================================================
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

// ============================================================
// 资源留言（社区式：每个资源一个轻量评论区）
// - Supabase 可用：写入 comments 表（匿名可留、带昵称），跨用户共享。
// - 本地模式：存 localStorage（ob_comments_{id}），仅本设备可见（降级可用）。
// ============================================================
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

// ============================================================
// 管理员审核（issue #11）：待审队列 + 通过/拒绝。
// 权限双层：前端用 VITE_ADMIN_EMAILS 显示入口，服务端 RLS（0006 is_admin()）强制执行。
// ============================================================

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
