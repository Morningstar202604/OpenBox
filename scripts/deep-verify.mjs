#!/usr/bin/env node
/**
 * 深度资源验证器（方法②+⑤ 的脚本化沉淀，补 monitor.mjs 只探 HTTP/DNS 的短板）：
 *   node scripts/deep-verify.mjs [--out report.json] [--only subType=free-api,relays]
 *
 * 对每条 status != dead 的种子资源做三层真实验证：
 *   L1 落地页抓取：GET 真实页面，提取 <title> 与首屏文本样本，
 *      与资源名做品牌词匹配；识别停放页/nginx 默认页/Cloudflare 盾与 5xx 报错。
 *   L2 网关实探：URL 形似 API 端点时，GET {origin}/v1/models（无鉴权）——
 *      返回 JSON（模型列表或任意 error 结构）即证明网关服务真实存在；
 *      返回 HTML 则说明只是普通网页、并非所宣称的 API。
 *   L3 汇总 flags：PARKED / NGINX_DEFAULT / CLOUDFLARE_5XX / SHIELDED / TITLE_NONE ...
 *
 * 判定纪律：本工具只产出证据，不直接改数据状态；
 * 单次探测不定罪（连续判死交给 monitor 的两击机制），人工复核 tips 后才动 status。
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { loadSeedResources } from './lib-bundle-data.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TIMEOUT_MS = 15_000;
const CONCURRENCY = 6;
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

const args = process.argv.slice(2);
const outFile = args.includes('--out') ? args[args.indexOf('--out') + 1] : null;
const onlyIdx = args.indexOf('--only');
const onlyFilter = onlyIdx > -1 ? args[onlyIdx + 1] : null; // subType=a,b

// ---- 停放/报错特征 ----
const PARKED_SIGS = [
  'domain for sale', 'buy this domain', 'this domain is for sale', 'parked',
  'sedoparking', 'dan.com', 'afternic', 'hugedomains', '域名出售', '域名转让',
];
const NGINX_DEFAULT = /^welcome to nginx/i;
const ERROR_TEXTS = ['403 forbidden', '404 not found', '502 bad gateway', '503 service', '522', '530'];

function stripTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, 4000);
}

function extractTitle(html) {
  const m = /<title[^>]*>([\s\S]{0,300}?)<\/title>/i.exec(html);
  return m ? m[1].replace(/\s+/g, ' ').trim() : '';
}

/** 品牌词集合：名称切词(≥2位字母数字) + 中文前4字符整体 */
function brandTokens(name) {
  const tokens = new Set();
  for (const t of name.toLowerCase().split(/[^\p{L}\p{N}]+/u)) {
    if (t.length >= 2 && !['ai', 'api', 'the', 'free', 'cloud'].includes(t)) tokens.add(t);
  }
  const zh = name.match(/[\u4e00-\u9fff]{2,}/);
  if (zh) {
    tokens.add(zh[0]);
    if (zh[0].length > 3) tokens.add(zh[0].slice(0, 3));
  }
  return [...tokens];
}

function titleVerdict(name, title, textSample) {
  const T = (title + ' ' + textSample).toLowerCase();
  const tokens = brandTokens(name);
  if (!tokens.length) return 'weak';
  const hitTitle = tokens.some((t) => title.toLowerCase().includes(t));
  const hitText = tokens.some((t) => T.includes(t));
  if (hitTitle) return 'brand';
  if (hitText) return 'text';
  return 'none';
}

async function timedFetch(url, opts = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, {
      redirect: 'follow',
      signal: ctrl.signal,
      headers: { 'user-agent': UA, accept: 'text/html,application/json,*/*' },
      ...opts,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function probeLanding(url) {
  const out = { http: null, finalUrl: url, title: '', textSample: '', flags: [] };
  try {
    const res = await timedFetch(url);
    out.http = res.status;
    out.finalUrl = res.url || url;
    if (res.status >= 500) {
      out.flags.push('SERVER_' + res.status);
      return out;
    }
    const ct = res.headers.get('content-type') ?? '';
    if (!ct.includes('html')) {
      // 落地即 JSON/纯文本：多为 API 根路径，无标题可比
      out.flags.push('NON_HTML_LANDING');
      return out;
    }
    const html = (await res.text()).slice(0, 200_000);
    out.title = extractTitle(html);
    out.textSample = stripTags(html);
    const low = (out.title + ' ' + out.textSample).toLowerCase();
    if (PARKED_SIGS.some((s) => low.includes(s))) out.flags.push('PARKED');
    if (NGINX_DEFAULT.test(out.title)) out.flags.push('NGINX_DEFAULT');
    if (/just a moment\.\.\.|attention required|cf-browser-verification/i.test(out.title + html.slice(0, 3000)))
      out.flags.push('SHIELDED');
    if (ERROR_TEXTS.some((s) => out.title.toLowerCase().includes(s))) out.flags.push('ERROR_TITLE');
    return out;
  } catch (e) {
    out.http = e?.name === 'AbortError' ? 'timeout' : 'net-error';
    out.flags.push('UNREACHABLE');
    return out;
  }
}

function gatewayCandidates(url) {
  const list = [];
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/+$/, '');
    if (/\/v\d+$/.test(path)) {
      list.push(u.origin + path + '/models');
    } else if (/\/(api|openai)$/i.test(path)) {
      list.push(u.origin + path + '/v1/models');
    } else if (path === '' || path === '/') {
      if (/^api\./i.test(u.host)) list.push(u.origin + '/v1/models');
    } else {
      list.push(u.origin + '/v1/models');
    }
  } catch {}
  return list;
}

async function probeGateway(gwUrl) {
  const r = { url: gwUrl, http: null, json: false, shape: '' };
  try {
    const res = await timedFetch(gwUrl, { headers: { 'user-agent': UA, accept: 'application/json' } });
    r.http = res.status;
    const ct = res.headers.get('content-type') ?? '';
    const head = (await res.text()).slice(0, 2000);
    if (ct.includes('json') || /^\s*[[{]/.test(head)) {
      r.json = true;
      r.shape = head.replace(/\s+/g, ' ').slice(0, 160);
    } else {
      r.shape = 'HTML';
    }
  } catch (e) {
    r.http = e?.name === 'AbortError' ? 'timeout' : 'net-error';
  }
  return r;
}

async function main() {
  let rows = await loadSeedResources(['id', 'name', 'url', 'subType', 'status']);
  rows = rows.filter((r) => r.status !== 'dead');
  if (onlyFilter) {
    const set = new Set(onlyFilter.split(',').map((s) => s.trim()));
    rows = rows.filter((r) => set.has(r.subType));
  }
  console.error(`[deep-verify] 待验证 ${rows.length} 条（status!=dead${onlyFilter ? '，限定 ' + onlyFilter : ''}）`);

  const results = new Array(rows.length);
  let cursor = 0;
  async function worker() {
    while (cursor < rows.length) {
      const i = cursor++;
      const row = rows[i];
      const landing = await probeLanding(row.url);
      const tv = landing.flags.includes('UNREACHABLE')
        ? 'unreachable'
        : titleVerdict(row.name, landing.title, landing.textSample);
      // 网关探测：仅当落地页可达且 URL 形似端点
      let gateways = [];
      if (!landing.flags.includes('UNREACHABLE') && !landing.flags.includes('PARKED')) {
        gateways = await Promise.all(gatewayCandidates(row.url).map(probeGateway));
      }
      results[i] = {
        id: row.id,
        name: row.name,
        subType: row.subType,
        listedStatus: row.status,
        url: row.url,
        landing: { http: landing.http, finalUrl: landing.finalUrl, title: landing.title.slice(0, 120) },
        titleMatch: tv,
        flags: landing.flags,
        gateways,
      };
      process.stderr.write(`\r[deep-verify] ${i + 1}/${rows.length}`);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, rows.length) }, worker));
  process.stderr.write('\n');

  // ---- 汇总 ----
  const by = (pred) => results.filter(pred);
  const summary = {
    checkedAt: new Date().toISOString(),
    total: results.length,
    titleBrand: by((r) => r.titleMatch === 'brand').length,
    titleTextOnly: by((r) => r.titleMatch === 'text').length,
    titleNone: by((r) => r.titleMatch === 'none').length,
    unreachable: by((r) => r.flags.includes('UNREACHABLE')).length,
    parked: by((r) => r.flags.includes('PARKED')).length,
    serverErr: by((r) => r.flags.some((f) => f.startsWith('SERVER_'))).length,
    shielded: by((r) => r.flags.includes('SHIELDED')).length,
    gatewayProbed: by((r) => r.gateways.length > 0).length,
    gatewayJsonOk: by((r) => r.gateways.some((g) => g.json)).length,
  };

  const suspicious = by(
    (r) =>
      r.titleMatch === 'none' ||
      r.flags.includes('PARKED') ||
      r.flags.includes('NGINX_DEFAULT') ||
      r.flags.includes('ERROR_TITLE'),
  );

  const report = { ...summary, suspiciousCount: suspicious.length, suspicious, results };
  const payload = JSON.stringify(report, null, 2);
  if (outFile) writeFileSync(join(ROOT, outFile), payload);
  console.log(payload);
  console.error(
    `\n[deep-verify] 品牌命中 ${summary.titleBrand} | 仅正文 ${summary.titleTextOnly} | 无匹配 ${summary.titleNone} | 可疑清单 ${suspicious.length} | 网关JSON存活 ${summary.gatewayJsonOk}/${summary.gatewayProbed}`,
  );
}

main();
