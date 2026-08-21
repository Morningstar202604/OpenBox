import type { ResourceStatus, ResourceType } from '@/lib/types';

// 计费类型与状态的展示元信息（颜色 / 文案）。集中管理，避免组件内散落硬编码。
export const TYPE_META: Record<ResourceType, { label: string; color: string }> = {
  free: { label: '免费', color: '#10b981' },
  freemium: { label: '免费额度', color: '#0ea5e9' },
  trial: { label: '试用', color: '#8b5cf6' },
  paid: { label: '付费', color: '#f59e0b' },
};

export const STATUS_META: Record<ResourceStatus, { label: string; color: string }> = {
  ok: { label: '可用', color: '#10b981' },
  unstable: { label: '不稳定', color: '#f59e0b' },
  unknown: { label: '未验证', color: '#94a3b8' },
  dead: { label: '已失效', color: '#ef4444' },
};

export const ALL_TYPES: ResourceType[] = ['free', 'freemium', 'trial', 'paid'];
export const ALL_STATUSES: ResourceStatus[] = ['ok', 'unstable', 'unknown', 'dead'];

/**
 * 统一时间显示（ISO 或短日期兼容）：
 * - fmtDate('2026-08-19') → '08-19'（纯日期直接截取，不受时区影响）
 * - fmtDate('2026-08-21T02:14:00Z', true) → '08-21 02:14'（含时刻按本地时区）
 * 解析失败时回退到原串截断，不抛异常。
 */
export function fmtDate(s?: string | null, withTime = false): string {
  if (!s) return '';
  // 纯日期（YYYY-MM-DD）直接截取，避免 new Date 解析带来的时区跨天偏移
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m && !withTime) return `${m[2]}-${m[3]}`;
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    const p = (n: number) => `${n}`.padStart(2, '0');
    const date = `${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    return withTime ? `${date} ${p(d.getHours())}:${p(d.getMinutes())}` : date;
  }
  return s.slice(0, 5);
}

/** http(s) 链接白名单（前端校验 + 数据层双重防线共用） */
export const URL_PATTERN = /^https?:\/\/[^\s]+\.[^\s]{2,}$/i;

/** 是否合法 http(s) 链接 */
export const isValidUrl = (u: string) => URL_PATTERN.test(u);
