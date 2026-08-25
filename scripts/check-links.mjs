#!/usr/bin/env node
/**
 * OpenBox 链接巡检：从 src/data/*.ts 提取全部资源 URL，并发探测可达性。
 *
 * 用法：
 *   node scripts/check-links.mjs                    # 输出报告到 stdout
 *   node scripts/check-links.mjs --out report.json  # 写入文件
 *   node scripts/check-links.mjs --fail-on-dead     # 有死链时退出码 1
 *
 * 设计：
 *   - 全文扫描引号内的 http(s) 字面量——同时覆盖三种书写形态：
 *     sites.ts 的 `url: '...'`、curated.ts 的 JSON `"url": "..."`、
 *     seed.ts 的 mk() 位置参数，避免只巡检到其中一个文件；
 *   - HEAD 优先，405/501 显式降级 GET（独立 AbortController）；
 *   - 每条 12s 超时、并发 8、失败重试 1 次——把网络抖动误报压到最低；
 *   - HTTP 999/403（部分站点反爬）视为「存疑」而非死链，单独归类。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA_FILES = ['src/data/sites.ts', 'src/data/curated.ts', 'src/data/seed.ts'];
export const TIMEOUT_MS = 12_000;
export const CONCURRENCY = 8;
const RETRIES = 1;
const UA = { 'user-agent': 'Mozilla/5.0 (compatible; OpenBox-LinkPatrol/1.0)' };

export function extractUrls() {
  const found = new Map(); // url -> [来源位置]
  for (const rel of DATA_FILES) {
    const text = readFileSync(join(ROOT, rel), 'utf8');
    const re = /https?:\/\/[^\s'"`\\)\]}>,]+/g;
    let m;
    while ((m = re.exec(text))) {
      // tips 等说明散文里常出现「…/v1——存活，不判死」「…/v1，OpenAI 兼容」这类
      // 粘连中文备注的裸链接字面量：在首个 CJK 字符/全角标点处截断，避免整段被当 URL 探测
      const cut = m[0].search(/[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef—…·“”‘’《》【】]/);
      const candidate = cut === -1 ? m[0] : m[0].slice(0, cut);
      // 去掉行尾注释粘连与尾随标点
      const url = candidate.replace(/[.,;:]+$/, '');
      if (!/^https?:\/\//.test(url)) continue;
      const line = text.slice(0, m.index).split('\n').length;
      const loc = `${rel}:${line}`;
      if (found.has(url)) found.get(url).push(loc);
      else found.set(url, [loc]);
    }
  }
  return found;
}

export async function fetchStatus(url, method) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { method, redirect: 'follow', signal: ctrl.signal, headers: UA });
    if (method === 'GET') await res.body?.cancel(); // 只读状态码，立即断开
    return res.status;
  } finally {
    clearTimeout(timer);
  }
}

export async function probe(url) {
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    try {
      const status = await fetchStatus(url, 'HEAD');
      if (status === 405 || status === 501) {
        // 不支持 HEAD：用全新的控制器显式降级 GET（旧实现复用已 abort 的
        // 控制器，GET 发出即中止，降级从未真正生效）
        return await fetchStatus(url, 'GET');
      }
      return status;
    } catch (e) {
      if (e?.name === 'AbortError') {
        if (attempt === RETRIES) return 'timeout';
      } else if (attempt === RETRIES) {
        return 'network-error';
      }
    }
  }
  return 'unknown';
}

export function classify(status) {
  if (status === 200 || status === 206 || status === 301 || status === 302 || status === 303 || status === 307 || status === 308 || status === 401 || status === 402) return 'alive';
  if (status === 403 || status === 429 || status === 999) return 'blocked'; // 反爬/限流，站点大概率活着
  if (status === 404 || status === 410) return 'dead';
  if (typeof status === 'number' && status >= 500) return 'server-error';
  return 'unreachable'; // timeout / network-error / unknown
}

async function main() {
  const args = process.argv.slice(2);
  const outFile = args.includes('--out') ? args[args.indexOf('--out') + 1] : null;
  const failOnDead = args.includes('--fail-on-dead');

  const urls = extractUrls();
  console.error(`[check-links] 共提取 ${urls.size} 个 URL，开始探测…`);

  const entries = [...urls.entries()];
  const results = new Array(entries.length);
  let cursor = 0;
  async function worker() {
    while (cursor < entries.length) {
      const i = cursor++;
      const [url] = entries[i];
      const status = await probe(url);
      results[i] = { url, sources: entries[i][1], status, verdict: classify(status) };
      process.stderr.write(`\r[check-links] ${i + 1}/${entries.length}`);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, entries.length) }, worker));
  process.stderr.write('\n');

  const report = { checkedAt: new Date().toISOString(), total: results.length };
  for (const v of ['dead', 'server-error', 'unreachable', 'blocked', 'alive']) {
    report[v] = results.filter((r) => r.verdict === v);
  }

  const summary = `alive=${report.alive.length} blocked=${report.blocked.length} dead=${report.dead.length} server-error=${report['server-error'].length} unreachable=${report.unreachable.length}`;
  console.log(JSON.stringify(report, null, 2));
  console.error(`[check-links] ${summary}`);

  if (outFile) writeFileSync(outFile, JSON.stringify(report, null, 2));
  if (failOnDead && (report.dead.length > 0)) process.exit(1);
}

// 被 monitor.mjs 复用时只导入函数，不执行 CLI 入口
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main();
}
