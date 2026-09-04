// 动态 SEO：路由切换时同步 title / meta description / OG / canonical。
// history 路由迁移（issue #15）后 URL 为真实路径，canonical/sitemap 与之保持一致。

const SITE = typeof window !== 'undefined' ? window.location.origin : (import.meta.env.VITE_SITE_URL || 'https://openbox-nav.pages.dev');
const DEFAULT_TITLE = 'OpenBox · 免费 AI 资源导航';
const DEFAULT_DESC =
  'OpenBox · 免费 AI 资源导航 — 聚合免费 API、中转站、节点订阅、AI 应用、AI Agent、开源模型、实用工具、学习资源、免费服务器与域名。280+ 精选资源，社区投稿 + 集体验证 + 人工精选，三语界面。';

function upsertMeta(selector: string, attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export interface SEOInfo {
  title?: string;
  description?: string;
  /** history 路由路径，如 '/resource/xxx'；省略则 canonical 指向站点根 */
  path?: string;
}

export function setSEO(info: SEOInfo) {
  const title = info.title ? `${info.title} · OpenBox` : DEFAULT_TITLE;
  const desc = info.description?.trim() || DEFAULT_DESC;
  const url = info.path ? `${SITE}${info.path}` : `${SITE}/`;

  document.title = title;
  upsertMeta('meta[name="description"]', 'name', 'description', desc);
  upsertMeta('meta[property="og:title"]', 'property', 'og:title', title);
  upsertMeta('meta[property="og:description"]', 'property', 'og:description', desc);
  upsertMeta('meta[property="og:url"]', 'property', 'og:url', url);
  upsertMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title);
  upsertMeta('meta[name="twitter:description"]', 'name', 'twitter:description', desc);

  let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.appendChild(canonical);
  }
  canonical.href = url;
}

/**
 * 页面级 JSON-LD 结构化数据（如资源详情的 SoftwareApplication）。
 * 传入 null 清除——路由切换时由 App 层调用，避免上一页的数据残留误导爬虫。
 */
export function setJsonLd(data: Record<string, unknown> | null) {
  const ID = 'ob-jsonld-page';
  document.getElementById(ID)?.remove();
  if (!data) return;
  const el = document.createElement('script');
  el.type = 'application/ld+json';
  el.id = ID;
  el.textContent = JSON.stringify(data);
  document.head.appendChild(el);
}
