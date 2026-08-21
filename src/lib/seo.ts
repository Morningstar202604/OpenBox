// 动态 SEO：路由切换时同步 title / meta description / OG / canonical。
// SPA 的 hash 路由 URL 本身对搜索引擎不友好（见 issue #10），但执行 JS 的
// 爬虫（Google）与社交分享卡片依赖这些标签，仍是零成本收益。

const SITE = 'https://openbox-13o.pages.dev';
const DEFAULT_TITLE = 'OpenBox · 开源 AI 资源导航';
const DEFAULT_DESC =
  'OpenBox · 开源 AI 资源导航 — 聚合免费 API、中转站、代理节点、AI 应用、工具与学习资料。14 大分类 270+ 精选资源，社区投稿 + 实时验证 + 人工精选，三语界面，登录云同步。';

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
  /** hash 路由路径，如 '/resource/xxx'；省略则 canonical 指向站点根 */
  path?: string;
}

export function setSEO(info: SEOInfo) {
  const title = info.title ? `${info.title} · OpenBox` : DEFAULT_TITLE;
  const desc = info.description?.trim() || DEFAULT_DESC;
  const url = info.path ? `${SITE}/#${info.path}` : `${SITE}/`;

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
