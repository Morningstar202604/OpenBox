#!/usr/bin/env node
/**
 * OpenBox 资源自动巡检引擎（每日定时，CI 驱动）。
 *
 *   node scripts/monitor.mjs                 # 全量巡检并更新 public/resource-status.json
 *   node scripts/monitor.mjs --fail-on-dead  # 存在「新判死」资源时退出码 1（CI 拦截用）
 *   node scripts/monitor.mjs --limit 20      # 只测前 N 条（调试）
 *
 * 与一次性 check-links 的区别：这是「带记忆」的监测——
 *   1) 连续失败计数（scripts/monitor-state.json）：连续 2 次判死才标记 dead，
 *      单次网络抖动只标 suspect，防止误杀活站；
 *   2) DNS 解析前置检查：域名解析失败一票判死（服务器关了但域名还在的情况不算）；
 *   3) 与种子数据交叉比对：数据标 ok 但机器判死 → 矛盾清单（该改数据了）；
 *      数据标 dead 但机器可达 → 死而复生清单（可考虑恢复收录）；
 *   4) 产出 public/resource-status.json 供前端运行时展示「机器巡检」状态。
 *
 * 探测引擎复用 check-links.mjs（HEAD→GET 降级/超时/重试/并发），单一实现。
 */
import { writeFile, readFile } from 'node:fs/promises';
import { lookup } from 'node:dns/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { probe, classify } from './check-links.mjs';
import { loadSeedResources } from './lib-bundle-data.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const STATE_FILE = join(ROOT, 'scripts/monitor-state.json');
const STATUS_JSON = join(ROOT, 'public/resource-status.json');
const CONSECUTIVE_FAILS_TO_DEAD = 2;

const args = process.argv.slice(2);
const failOnDead = args.includes('--fail-on-dead');
const limitIdx = args.indexOf('--limit');
const limit = limitIdx > -1 ? Number(args[limitIdx + 1]) : Infinity;

const out = (...a) => process.stdout.write(a.join(' ') + '\n');
const err = (...a) => process.stderr.write(a.join(' ') + '\n');

/** DNS 解析检查：域名层死亡（NXDOMAIN/无记录）返回 false */
async function dnsAlive(url) {
  try {
    const host = new URL(url).hostname;
    await lookup(host);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const resources = await loadSeedResources(['id', 'name', 'url', 'status', 'subType']);
  // 同 URL 可能对应多条（理论上已被 seed 去重，防御性按 url 去重）
  const byUrl = new Map();
  for (const r of resources) {
    if (r.url && /^https?:\/\//.test(r.url) && !byUrl.has(r.url)) byUrl.set(r.url, r);
  }
  const targets = [...byUrl.entries()].slice(0, limit);
  err(`[monitor] 待检资源 ${targets.length} 个，开始巡检…`);

  let state = {};
  try {
    state = JSON.parse(await readFile(STATE_FILE, 'utf8'));
  } catch {
    /* 首次运行无状态文件 */
  }

  const now = new Date().toISOString();
  const results = new Array(targets.length);
  let cursor = 0;
  async function worker() {
    while (cursor < targets.length) {
      const i = cursor++;
      const [url, meta] = targets[i];
      const started = Date.now();
      const status = await probe(url);
      const ms = Date.now() - started;
      let verdict = classify(status);

      // HTTP 层不可达时下探 DNS 层：域名都没了才是真死（区别于服务器临时故障）
      let reason;
      if (verdict === 'dead' || verdict === 'unreachable' || verdict === 'server-error') {
        if (!(await dnsAlive(url))) {
          verdict = 'dead';
          reason = 'dns';
        }
      }

      const prev = state[url] ?? { fails: 0 };
      const failing = verdict === 'dead' || verdict === 'unreachable' || verdict === 'server-error';
      const fails = failing ? prev.fails + 1 : 0;
      state[url] = {
        fails,
        lastOk: failing ? prev.lastOk ?? null : now,
        lastFail: failing ? now : prev.lastFail ?? null,
        lastReason: failing ? reason ?? verdict : undefined,
      };
      // 防抖：连续 2 次失败才机器判死；首次失败标 suspect
      const machine = fails >= CONSECUTIVE_FAILS_TO_DEAD ? 'dead' : fails === 1 ? 'suspect' : 'ok';
      results[i] = { url, id: meta.id, name: meta.name, seedStatus: meta.status, http: status, verdict, machine, fails, ms, reason };
      err(`[monitor] ${i + 1}/${targets.length}`);
    }
  }
  await Promise.all(Array.from({ length: Math.min(8, targets.length) }, worker));
  err('');

  // ---- 产出 1：前端消费的机器状态（只含机器有发言权的字段，控制体积）----
  const statusPayload = {
    checkedAt: now,
    resources: Object.fromEntries(
      results.map((r) => [r.url, { v: r.machine, at: now, ms: r.ms, fails: r.fails }]),
    ),
  };
  await writeFile(STATUS_JSON, JSON.stringify(statusPayload, null, 2));
  await writeFile(STATE_FILE, JSON.stringify(state, null, 2));

  // ---- 产出 2：控制台摘要 + 交叉比对清单 ----
  const newlyDead = results.filter((r) => r.machine === 'dead' && r.seedStatus !== 'dead');
  const contradictions = results.filter((r) => r.seedStatus === 'ok' && r.machine === 'dead');
  const revived = results.filter((r) => r.seedStatus === 'dead' && r.machine === 'ok');
  const suspects = results.filter((r) => r.machine === 'suspect');
  const deadCount = results.filter((r) => r.machine === 'dead').length;

  out(`[monitor] 巡检完成 ${now}`);
  out(`  机器判死: ${deadCount}（其中新死链 ${newlyDead.length}）`);
  out(`  存疑（首次失败，下轮复核）: ${suspects.length}`);
  out(`  数据矛盾（seed=ok 但机器判死，建议改数据）: ${contradictions.length}`);
  for (const r of contradictions) out(`    - ${r.name} ${r.url} (http=${r.http}${r.reason ? ` ${r.reason}` : ''})`);
  out(`  死而复生（seed=dead 但可达，可考虑恢复）: ${revived.length}`);
  for (const r of revived) out(`    - ${r.name} ${r.url}`);
  if (newlyDead.length) {
    out('  新死链清单:');
    for (const r of newlyDead) out(`    - ${r.name} ${r.url} (http=${r.http}${r.reason ? ` ${r.reason}` : ''})`);
  }
  out(`[monitor] 已写入 ${join(ROOT, 'public/resource-status.json').replace(ROOT, '')}`);

  if (failOnDead && newlyDead.length) process.exit(1);
}

main();
