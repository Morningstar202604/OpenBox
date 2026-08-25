/**
 * URL 归一化——全站唯一数据源。
 * 已接入：seed 跨源去重、存活白名单匹配、黑名单命中、外链渲染防御（safeHref）。
 * 未接入：投稿查重（DB 侧 lower(url) 唯一索引为准，应用侧 ilike 预检，
 * 二者都作用于原始串——协议/www 差异的重复投稿由管理员人工审核兜底）。
 * 此前三层判定各写各的（去尾斜杠 / 全串精确 / host 精确），协议、www、端口、
 * 尾斜杠差异都会造成漏判或误杀，已接入场景统一收敛到本文件。
 */

/** host 级归一化：小写、去 www、去端口。黑名单/白名单匹配用。 */
export function urlHost(url: string): string {
  try {
    return new URL(url.trim()).host.toLowerCase().replace(/^www\./, '').replace(/:\d+$/, '');
  } catch {
    return '';
  }
}

/**
 * 外链渲染纵深防御：仅放行 http(s)。
 * 投稿端有 URL 白名单校验 + DB CHECK 拦 javascript: 伪协议，
 * 但历史数据/未跑 0005 的库无防护——渲染层统一再过一遍。
 */
export function safeHref(url: string): string {
  return /^https?:\/\//i.test(url.trim()) ? url : '#';
}

/**
 * 同站判定 key：协议归一（http→https）、host 级归一化、去默认端口、去尾斜杠。
 * http://x.com 与 https://www.x.com/ 视为同站。
 */
export function normalizeUrlKey(url: string): string {
  const raw = url.trim();
  try {
    const u = new URL(raw);
    const host = u.host.toLowerCase().replace(/^www\./, '');
    const port = u.port && u.port !== '80' && u.port !== '443' ? `:${u.port}` : '';
    const path = u.pathname.replace(/\/+$/, '');
    return `https://${host}${port}${path}`;
  } catch {
    // 非法 URL 退化为保守归一（仅小写+去尾斜杠），不抛异常阻断数据管线
    return raw.replace(/\/+$/, '').toLowerCase();
  }
}
