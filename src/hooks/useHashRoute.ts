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
  | 'speedtest'
  | 'compare'
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
  // 畸形百分号（如 ?ghpath=/resource/100%）会让 decodeURI 抛 URIError——路由层绝不能崩
  let p: string;
  try {
    p = decodeURI(pathname);
  } catch {
    p = pathname;
  }
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

/** 路径与查询串拆分（'?' 后视为查询串） */
export function splitPath(raw: string): { pathPart: string; queryPart: string } {
  const i = raw.indexOf('?');
  return i === -1
    ? { pathPart: raw, queryPart: '' }
    : { pathPart: raw.slice(0, i), queryPart: raw.slice(i + 1) };
}

/** 安全 decode（畸形百分号不抛异常），hash 路径与 pathname 行为保持一致 */
function decodeSafe(s: string): string {
  try {
    return decodeURI(s);
  } catch {
    return s;
  }
}

/**
 * 从当前地址解析路由。
 * 兼容层（按序）：
 * 1. ghpath 参数：GitHub Pages 无 SPA fallback，深层直链先落到 public/404.html，
 *    由它带 ?ghpath=<原路径> 回首页，这里原地 replaceState 还原干净 URL；
 * 2. 旧 hash 链接（外链/收藏/搜索引擎已收录的 /#/resource/x）按 hash 解析渲染——
 *    hash 片段不会发送到服务器，只能在客户端解析，地址栏升级由挂载后的 rewrite 完成。
 */
export function parseLocation(): Route {
  const ghRaw = new URLSearchParams(window.location.search).get('ghpath');
  if (ghRaw) {
    const { pathPart, queryPart } = splitPath(ghRaw);
    return routeFromPath(stripBase(pathPart), queryPart);
  }
  const rawHash = window.location.hash.replace(/^#/, '');
  if (rawHash.startsWith('/')) {
    const { pathPart, queryPart } = splitPath(rawHash);
    return routeFromPath(decodeSafe(pathPart), queryPart);
  }
  return routeFromPath(stripBase(window.location.pathname), window.location.search.replace(/^\?/, ''));
}

/** 首帧后的地址栏原地升级（不产生历史记录）：ghpath 回跳与旧 hash 一并处理 */
function rewriteLegacyUrl(): void {
  const search = new URLSearchParams(window.location.search);
  const ghRaw = search.get('ghpath');
  if (ghRaw !== null) {
    search.delete('ghpath');
    const rest = search.toString();
    const { pathPart, queryPart } = splitPath(ghRaw);
    const query = queryPart || rest;
    window.history.replaceState(null, '', `${BASE}${stripBase(pathPart)}${query ? `?${query}` : ''}`);
    return;
  }
  const rawHash = window.location.hash.replace(/^#/, '');
  if (!rawHash.startsWith('/')) return;
  const { pathPart, queryPart } = splitPath(rawHash);
  window.history.replaceState(null, '', `${BASE}${pathPart}${queryPart ? `?${queryPart}` : ''}`);
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
    rewriteLegacyUrl();
    const onNav = () => setRoute(parseLocation());
    window.addEventListener('popstate', onNav);
    return () => window.removeEventListener('popstate', onNav);
  }, []);
  return route;
}
