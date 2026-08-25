import type { ResourceStatus, ResourceType } from '@/lib/types';

/**
 * 计费类型与状态的展示元信息——TS 侧唯一来源。
 * 颜色一律引用 index.css 的状态令牌（var(--color-*)，浅/暗双阶自动适配），
 * soft 为同色 8%~12% 底色令牌；禁止在组件里写硬编码色值。
 */
export const TYPE_META: Record<ResourceType, { label: string; color: string; soft: string }> = {
  free: { label: '免费', color: 'var(--color-success)', soft: 'var(--color-success-soft)' },
  freemium: { label: '免费额度', color: 'var(--color-info)', soft: 'var(--color-info-soft)' },
  trial: { label: '试用', color: 'var(--color-official)', soft: 'var(--color-official-soft)' },
  paid: { label: '付费', color: 'var(--color-warning)', soft: 'var(--color-warning-soft)' },
};

export const STATUS_META: Record<ResourceStatus, { label: string; color: string; soft: string }> = {
  ok: { label: '可用', color: 'var(--color-success)', soft: 'var(--color-success-soft)' },
  unstable: { label: '不稳定', color: 'var(--color-warning)', soft: 'var(--color-warning-soft)' },
  unknown: { label: '未验证', color: 'var(--color-muted)', soft: 'color-mix(in srgb, var(--color-muted) 10%, transparent)' },
  dead: { label: '已失效', color: 'var(--color-danger)', soft: 'var(--color-danger-soft)' },
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
