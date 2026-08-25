#!/usr/bin/env node
/**
 * SPA 深链兜底：把 index.html 复制到每个 history 路由对应的目录。
 *   npm run build 末尾自动执行（见 package.json）。
 *
 * 背景：history 路由（issue #15）后深链如 /resource/<id> 需要服务器端回退到 index.html。
 * Cloudflare Pages 新项目的 _redirects splat 规则行为不稳定（实测部分边缘不生效，
 * 精确路径规则还会被规范化成 308），因此改为在产物里预生成真实文件：
 * 深链直接命中 <outDir>/resource/<id>/index.html，任何静态托管都返回真 200，SEO 友好。
 *
 * 路由清单来源：public/sitemap.xml（与线上数据同源）+ 固定静态页集合。
 */
import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { loadSeedResources } from './lib-bundle-data.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = process.env.VITE_BUILD_DIR ?? 'docs';
const DOCS = join(ROOT, OUT_DIR);

// history 路由的固定静态页（不在 sitemap 中）
const STATIC_ROUTES = ['home', 'search', 'submit', 'about', 'favorites', 'my', 'ranking', 'help', 'admin'];

// 构建期隐藏分类（与 src/data/taxonomy.ts 的 VITE_HIDDEN_CATEGORIES 同一语义）：
// 校园版隐藏的分类，其分类页、资源详情页路由目录与产物 sitemap.xml 条目全部剔除，
// 避免「导航不可见但直链可达/可被抓取」。public/sitemap.xml 原件保持全量，供公网版构建复用。
// 注意：应用 JS 内仍会残留惰性字符串（taxonomy 运行时过滤需要全量数组参与、
// 营销文案与其他资源的正文提及），UI/搜索/详情均不会展示，属可接受的字节残留。
const HIDDEN = new Set(
  (process.env.VITE_HIDDEN_CATEGORIES ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
);

/** 隐藏分类下的资源 id 集合（Node 内打包种子数据拿到 id→subType 全量映射） */
async function loadHiddenResourceIds() {
  if (HIDDEN.size === 0) return new Set();
  const rows = await loadSeedResources(['id', 'subType']);
  return new Set(rows.filter((r) => HIDDEN.has(r.subType)).map((r) => r.id));
}

const hiddenResourceIds = await loadHiddenResourceIds();

function safeDecode(s) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s; // 畸形百分号编码（资源 id 含裸 % 时）按原样匹配，不让构建中断
  }
}

function isRouteVisible(path) {
  const cat = path.match(/^\/category\/([^/]+)$/);
  if (cat) return !HIDDEN.has(cat[1]);
  const res = path.match(/^\/resource\/(.+)$/);
  if (res) return !hiddenResourceIds.has(safeDecode(res[1]));
  return true;
}

const xml = await readFile(join(ROOT, 'public/sitemap.xml'), 'utf8');
const routes = new Set(STATIC_ROUTES.map((p) => `/${p}`));
for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
  const path = new URL(m[1]).pathname.replace(/\/+$/, '');
  if (path && path !== '/' && isRouteVisible(path)) routes.add(path);
}

let n = 0;
for (const route of routes) {
  const dir = join(DOCS, route.replace(/^\//, ''));
  await mkdir(dir, { recursive: true });
  await copyFile(join(DOCS, 'index.html'), join(dir, 'index.html'));
  n++;
}
console.log(`[gen-spa-paths] 已生成 ${n} 个路由目录的 index.html（SPA 深链真 200 兜底）`);

// 隐藏分类时重写产物内 sitemap.xml（public/ 原件保持全量，供公网版构建复用）
if (HIDDEN.size > 0) {
  let removed = 0;
  const filtered = xml.replace(/<url>[\s\S]*?<\/url>/g, (block) => {
    const loc = block.match(/<loc>([^<]+)<\/loc>/)?.[1] ?? '';
    return isRouteVisible(new URL(loc).pathname.replace(/\/+$/, '')) ? block : ((removed++), '');
  });
  await writeFile(join(DOCS, 'sitemap.xml'), filtered.replace(/\n{3,}/g, '\n\n'), 'utf8');
  console.log(`[gen-spa-paths] 已按隐藏分类过滤产物 sitemap.xml：剔除 ${removed} 个 URL`);
}
