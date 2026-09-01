/**
 * 机器巡检历史数据
 * 数据来源：scripts/gen-status-history.mjs 生成的 public/status-history.json
 * （后续 CI 可每日追加真实数据，替换模拟数据）
 * 懒加载 + 模块级缓存：首次调用才请求，全站共享一份
 */
import type { StatusPoint } from '@/components/StatusChart';

interface StatusHistory {
  generatedAt: string;
  days: string[];
  resources: Record<string, StatusPoint[]>;
}

let historyPromise: Promise<StatusHistory> | null = null;

export function getStatusHistory(): Promise<StatusHistory> {
  historyPromise ??= fetch(`${import.meta.env.BASE_URL}status-history.json`)
    .then((r) => (r.ok ? r.json() : { generatedAt: '', days: [], resources: {} }))
    .catch(() => ({ generatedAt: '', days: [], resources: {} }));
  return historyPromise;
}

/** 获取指定 URL 的历史数据 */
export async function getResourceHistory(url: string): Promise<StatusPoint[]> {
  const history = await getStatusHistory();
  return history.resources[url] ?? [];
}
