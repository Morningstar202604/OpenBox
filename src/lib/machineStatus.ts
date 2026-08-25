/**
 * 机器巡检状态（前端运行时消费）。
 * 数据来源：CI 每日定时运行 scripts/monitor.mjs 产出的 public/resource-status.json
 * （随站点静态部署，零后端依赖）。懒加载 + 模块级缓存：首次调用才请求，
 * 全站共享一份；请求失败静默降级为空表（详情页不显示巡检行）。
 */
export interface MachineStatus {
  /** ok=可达 / suspect=首次失败待复核 / dead=连续失败判死 */
  v: 'ok' | 'suspect' | 'dead';
  /** 巡检时间（ISO） */
  at: string;
  /** HTTP 探测耗时 ms */
  ms?: number;
  /** 连续失败次数 */
  fails?: number;
}

type StatusMap = Record<string, MachineStatus>;

let statusPromise: Promise<StatusMap> | null = null;

export function getMachineStatusMap(): Promise<StatusMap> {
  statusPromise ??= fetch(`${import.meta.env.BASE_URL}resource-status.json`)
    .then((r) => (r.ok ? r.json() : {}))
    .then((json: unknown) => (json && typeof json === 'object' && 'resources' in json ? (json as { resources: StatusMap }).resources : {}))
    .catch(() => ({}));
  return statusPromise;
}
