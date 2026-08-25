#!/usr/bin/env node
/**
 * SPA 深链兜底：把 index.html 复制到每个 history 路由对应的目录。
 *   npm run build 末尾自动执行（见 package.json）。
 *
 * 背景：history 路由（issue #15）后深链如 /resource/xxx 需要服务器端回退到 index.html。
 * Cloudflare Pages 新项目的 _redirects splat 规则行为不稳定（实测部分边缘不生效，
 * 精确路径规则还会被规范化成 308），因此改为在产物里预生成真实文件：
 * 深链直接命中 <outDir>/resource/<id>/index.html，任何静态托管都返回真 200，SEO 友好。
 *
 * 路由清单来源：public/sitemap.xml（与线上数据同源）+ 固定静态页集合。
 */
import { mkdir, copyFile, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = process.env.VITE_BUILD_DIR ?? 'docs';
const DOCS = join(ROOT, OUT_DIR);

// history 路由的固定静态页（不在 sitemap 中）
const STATIC_ROUTES = ['home', 'search', 'submit', 'about', 'favorites', 'my', 'ranking', 'help', 'admin'];

const xml = await readFile(join(ROOT, 'public/sitemap.xml'), 'utf8');
const routes = new Set(STATIC_ROUTES.map((p) => `/${p}`));
for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
  const path = new URL(m[1]).pathname.replace(/\/+$/, '');
  if (path && path !== '/') routes.add(path);
}

let n = 0;
for (const route of routes) {
  const dir = join(DOCS, route.replace(/^\//, ''));
  await mkdir(dir, { recursive: true });
  await copyFile(join(DOCS, 'index.html'), join(dir, 'index.html'));
  n++;
}
console.log(`[gen-spa-paths] 已生成 ${n} 个路由目录的 index.html（SPA 深链真 200 兜底）`);
