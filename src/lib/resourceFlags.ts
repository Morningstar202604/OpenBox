import type { Resource } from '@/lib/types';

/**
 * 资源展示标记派生助手（纯函数，不侵入 Resource 数据模型）。
 * 用于卡片/详情/分类页统一标注：是否免费、是否官方、是否需要代理/海外网络。
 */

/** 是否真免费：仅计费类型为 free 视为真免费（freemium/trial/paid 均非免费） */
export function isFree(r: Resource): boolean {
  return r.type === 'free';
}

/** 是否非免费：freemium(免费额度)/trial(试用)/paid(付费) 都算非免费，免费类板块需明确标注 */
export function isNonFree(r: Resource): boolean {
  return r.type !== 'free';
}

/** 是否官方出品：官方类默认按非免费对待，避免与社区免费资源混淆 */
export function isOfficial(r: Resource): boolean {
  return !!r.official;
}

/**
 * 需海外网络才能访问的官方服务域名（确定性白名单）。
 * 只收录「国内明确无法直连、必须代理」的官方 AI 服务，避免误伤国内可直连的中转站/公益站。
 * 匹配规则：host 完全相等，或为其子域（endsWith('.' + 域名)）——避免 `zenmux.ai` 误命中 `x.ai` 这类后缀越界。
 */
const OVERSEAS_DOMAINS = [
  'google.com', // gemini.google.com / cloud.google.com / generative-ai
  'openai.com', // platform.openai.com / chat / academy
  'anthropic.com', // docs.anthropic.com
  'claude.com', // platform.claude.com
  'grok.com', // grok.com
  'x.ai', // x.ai（精确边界，不匹配 zenmux.ai）
  'deeplearning.ai', // deeplearning.ai
] as const;

/** 需海外的顶级域（TLD 级判定，如 .google 专属根域） */
const OVERSEAS_TLDS = ['.google'] as const;

/** 从 URL 中安全提取 hostname（解析失败返回空串，不抛异常） */
function hostOf(url?: string): string {
  if (!url) return '';
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
}

/** host 是否命中海外官方域名（精确 or 子域），或命中海外 TLD */
function isOverseasHost(host: string): boolean {
  if (!host) return false;
  if (OVERSEAS_TLDS.some((tld) => host.endsWith(tld))) return true;
  return OVERSEAS_DOMAINS.some((d) => host === d || host.endsWith('.' + d));
}

/**
 * 是否需要代理 / 海外网络才能访问。
 * 判定来源（多源交叉，既防漏标也防误标）：
 *  1. tags 含「海外」「境外」——数据侧已人工标注的直接采信；
 *  2. 官方海外服务域名白名单（gemini/openai/anthropic/grok/google cloud 等）——确定性补漏；
 *  3. 文案明确的负面语境（需海外、海外网络、地区限制、需代理、proxy、国内直连+超时/403/SSL/失败）。
 * 注意：单独的「国内直连」是正面卖点（国内可达），不得据此判为需海外。
 */
export function needsOverseas(r: Resource): boolean {
  // 1. 数据侧显式标注
  if (r.tags?.some((t) => t === '海外' || t === '境外')) return true;

  // 2. 官方海外域名白名单（确定性）
  if (isOverseasHost(hostOf(r.url))) return true;

  // 3. 文案负面语境（排除「国内直连」正面用法：仅当其后跟随失败类描述才算）
  const txt = `${r.description ?? ''} ${r.tags?.join(' ') ?? ''}`;
  if (/需海外|海外网络|地区限制|需代理|proxy|境外|要求.*海外/.test(txt)) return true;
  if (/国内直连[^，。;]{0,8}(超时|403|SSL|异常|失败|无法|不可)/.test(txt)) return true;

  return false;
}
