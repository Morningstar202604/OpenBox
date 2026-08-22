import { useEffect, useState } from 'react';

export type RouteName =
  | 'landing'
  | 'home'
  | 'category'
  | 'scenario'
  | 'resource'
  | 'search'
  | 'submit'
  | 'about'
  | 'favorites'
  | 'my'
  | 'ranking'
  | 'help'
  | 'admin'
  | 'notfound';

export interface Route {
  name: RouteName;
  slug?: string;
  id?: string;
  q?: string;
}

/** 部署基路径：GitHub Pages 为 '/OpenBox'，Cloudflare Pages 根部署为 ''（VITE_BASE_URL=/） */
const BASE = import.meta.env.BASE_URL.replace(/\/+$/, '');

/** 把带基路径的 pathname 归一化为路由内部路径（'/OpenBox/resource/x' → '/resource/x'） */
export function stripBase(pathname: string): string {
  const p = decodeURI(pathname);
  if (BASE && (p === BASE || p.startsWith(`${BASE}/`))) return p.slice(BASE.length) || '/';
  return p;
}

/**
 * 纯函数：路径 + 查询串 → 路由对象。
 * 与旧 hash 路由（#/resource/x）的解析语义逐段一致，便于回归与测试。
 */
export function routeFromPath(pathPart: string, queryPart = ''): Route {
  const segments = pathPart.split('/').filter(Boolean); // 去掉空段
  const query = new URLSearchParams(queryPart);

  switch (segments[0]) {
    case undefined:
      // 根路径默认进入「引导页」
      return { name: 'landing' };
    case 'home':
      return { name: 'home' };
    case 'category':
      return segments[1] ? { name: 'category', slug: segments[1] } : { name: 'home' };
    case 'scenario':
      return segments[1] ? { name: 'scenario', slug: segments[1] } : { name: 'home' };
    case 'resource':
      return segments[1] ? { name: 'resource', id: segments[1] } : { name: 'home' };
    case 'search':
      return { name: 'search', q: query.get('q') ?? '' };
    case 'submit':
      return { name: 'submit' };
    case 'about':
      return { name: 'about' };
    case 'favorites':
      return { name: 'favorites' };
    case 'my':
      return { name: 'my' };
    case 'ranking':
      return { name: 'ranking' };
    case 'help':
      return { name: 'help' };
    case 'admin':
      return { name: 'admin' };
    default:
      return { name: 'notfound' };
  }
}

/**
 * 从当前地址解析路由。
 * 兼容层：若仍存在旧 hash 路由链接（外链/收藏/搜索引擎已收录的 /#/resource/x），
 * 直接按 hash 解析渲染——hash 片段不会发送到服务器，_redirects 无法接管，
 * 只能在客户端解析；地址栏升级由 useHashRoute 挂载后的 rewriteLegacyHash 完成。
 */
export function parseLocation(): Route {
  const rawHash = window.location.hash.replace(/^#/, '');
  if (rawHash) {
    // 页内锚（如 /help#intro 的 #intro）不属于路由，仅当 hash 以 "/" 开头才按路由处理
    if (rawHash.startsWith('/')) {
      const [pathPart, queryPart] = rawHash.split('?');
      return routeFromPath(pathPart, queryPart);
    }
  }
  return routeFromPath(stripBase(window.location.pathname), window.location.search.replace(/^\?/, ''));
}

/** 旧 hash 链接的地址栏升级：#/resource/x → /resource/x（replaceState，不产生历史记录） */
function rewriteLegacyHash(): void {
  const raw = window.location.hash.replace(/^#/, '');
  if (!raw.startsWith('/')) return;
  const [pathPart, queryPart] = raw.split('?');
  const target = `${BASE}${pathPart}${queryPart ? `?${queryPart}` : ''}`;
  window.history.replaceState(null, '', target);
}

/** 站内导航：pushState 一条干净路径并广播 popstate 驱动重渲染 */
export function navigate(path: string): void {
  window.history.pushState(null, '', `${BASE}${path}`);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

/** 生成 <a href> 用的完整路径（含部署基路径），保证复制出去的链接两种部署下都有效 */
export function routeHref(path: string): string {
  return `${BASE}${path}`;
}

export function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseLocation());
  useEffect(() => {
    rewriteLegacyHash();
    const onNav = () => setRoute(parseLocation());
    window.addEventListener('popstate', onNav);
    return () => window.removeEventListener('popstate', onNav);
  }, []);
  return route;
}
