// 数据访问层 · 资源域：查询/筛选/缓存/社区投稿合并
// 本地种子始终是基础来源（离线可渲染），Supabase 仅增量合并已审核通过的社区投稿。
import { hasSupabase } from '../supabase';
import { subTypes, scenarios, resolveScenarios, isSlugVisible } from '@/data/taxonomy';
import { seedResources } from '@/data/seed';
import type { Resource, ResourceStatus, ResourceType, Scenario, SubType } from '../types';
import { needsOverseas } from '../resourceFlags';
import { withSupabase, SubmissionRow, normalizeSubmissionRow } from './shared';

export interface ResourceQuery {
  subType?: string;
  scenario?: string;
  q?: string;
  type?: ResourceType | 'all';
  status?: ResourceStatus | 'all';
  /** 只看国内可直连（排除需海外网络/代理的资源） */
  domestic?: boolean;
  /** 只看社区公益资源（排除官方出品） */
  communityOnly?: boolean;
  sort?: 'default' | 'name' | 'updated';
}

/** 社区投稿在合并进列表时使用的 id 前缀（与本地种子 id 区分，避免冲突） */
const COMMUNITY_PREFIX = 'community-';

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
  if (query.domestic) out = out.filter((r) => !needsOverseas(r));
  if (query.communityOnly) out = out.filter((r) => !r.official);

  switch (query.sort) {
    case 'name':
      out.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'updated':
      out.sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
      break;
    default:
      // 国内可直连优先（需海外/代理的下沉），组内精选优先，再按名称稳定排序
      out.sort(
        (a, b) =>
          Number(needsOverseas(a)) - Number(needsOverseas(b)) ||
          Number(b.featured ?? false) - Number(a.featured ?? false) ||
          a.name.localeCompare(b.name),
      );
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

/** 当前数据模式（用于页脚提示「本地演示 / 已连接 Supabase」） */
export function dataSourceMode(): 'supabase' | 'local' {
  return hasSupabase ? 'supabase' : 'local';
}
