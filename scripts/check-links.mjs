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
 *   - 正则提取（url: 'https://...'），与 TS 编译解耦，CI 零构建成本；
 *   - HEAD 优先、405/501 时降级 GET（只读响应头即断开）；
 *   - 每条 12s 超时、并发 8、失败重试 1 次——把网络抖动误报压到最低；
 *   - HTTP 999/403（部分站点反爬）视为「存疑」而非死链，单独归类。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA_FILES = ['src/data/sites.ts', 'src/data/curated.ts', 'src/data/seed.ts'];
const TIMEOUT_MS = 12_000;
const CONCURRENCY = 8;
const RETRIES = 1;

function extractUrls() {
  const found = new Map(); // url -> [来源位置]
  for (const rel of DATA_FILES) {
    const text = readFileSync(join(ROOT, rel), 'utf8');
    const re = /url:\s*['"`](https?:\/\/[^'"`\s]+)['"`]/g;
    let m;
    while ((m = re.exec(text))) {
      const line = text.slice(0, m.index).split('\n').length;
      const loc = `${rel}:${line}`;
      if (found.has(m[1])) found.get(m[1]).push(loc);
      else found.set(m[1], [loc]);
    }
  }
  return found;
}

async function probe(url) {
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method: 'HEAD',
        redirect: 'follow',
        signal: ctrl.signal,
        headers: { 'user-agent': 'Mozilla/5.0 (compatible; OpenBox-LinkPatrol/1.0)' },
      });
      clearTimeout(timer);
      if (res.status === 405 || res.status === 501) continue; // 不支持 HEAD，降级 GET 重试
      return res.status;
    } catch (e) {
      clearTimeout(timer);
      if (e?.name === 'AbortError') {
        if (attempt === RETRIES) return 'timeout';
      } else if (attempt === RETRIES) {
        return 'network-error';
      }
      // 支持 GET 降级的重试路径
      try {
        const res = await fetch(url, {
          method: 'GET',
          redirect: 'follow',
          signal: ctrl.signal,
          headers: { 'user-agent': 'Mozilla/5.0 (compatible; OpenBox-LinkPatrol/1.0)' },
        });
        await res.body?.cancel();
        if (res.status === 405 || res.status === 501) return res.status;
        return res.status;
      } catch {
        /* 进入下一次 attempt */
      }
    }
  }
  return 'unknown';
}

function classify(status) {
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

main();
