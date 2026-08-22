#!/usr/bin/env node
/**
 * OpenBox 数据质量审计：分类/标签/状态一致性体检。
 *   npm run audit:data
 *
 * 检查项：
 *   1) type / status 字段分布（应无 undefined）
 *   2) summary 自夸「稳定/可靠/高可用」但 status 非 ok 的矛盾项
 *   3) free-api / charity 中混入付费相关 tag 的错位项
 *   4) 标签体系噪音：不同 tag 总数、仅出现一次的长尾 tag
 *   5) 空 summary / 空 tags
 *
 * 原理与 gen-sitemap 相同：rolldown 打包 seed 数据后在 Node 内执行分析，
 * 与线上渲染同源，零手工同步成本。发现的问题按 id 定位到 curated.ts /
 * sites.ts 修复后重跑本脚本复查。
 */
import { rolldown } from 'rolldown';
import { writeFile, mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const cacheDir = join(ROOT, 'node_modules/.cache');

const entryTs = join(cacheDir, 'audit-entry.ts');
await mkdir(cacheDir, { recursive: true });
await writeFile(
  entryTs,
  `import { seedResources } from '${join(ROOT, 'src/data/seed').replace(/\\/g, '/')}';\nconsole.log(JSON.stringify(seedResources.map(r => ({ id: r.id, subType: r.subType, name: r.name, url: r.url, tags: r.tags ?? [], type: r.type, status: r.status, summary: r.summary }))));`,
);

const bundle = await rolldown({ input: entryTs, platform: 'node' });
const { output } = await bundle.generate({ format: 'cjs' });
await bundle.close();
if (!output?.[0]?.code) throw new Error('bundle failed');
const tmpFile = join(cacheDir, `audit-run-${Date.now()}.cjs`);
await writeFile(tmpFile, output[0].code);

let json = '';
const origLog = console.log;
console.log = (...a) => (json += a.join(' '));
try {
  await import(pathToFileURL(tmpFile));
} finally {
  console.log = origLog;
}
const rs = JSON.parse(json.trim());

const out = (...a) => process.stdout.write(a.join(' ') + '\n');
out(`[audit] total=${rs.length}`);
out('\n== type 分布 ==');
for (const [k, v] of Object.entries(rs.reduce((m, r) => ((m[String(r.type)] = (m[String(r.type)] ?? 0) + 1), m), {})))
  out(`  ${k}: ${v}`);
out('\n== status 分布 ==');
for (const [k, v] of Object.entries(rs.reduce((m, r) => ((m[String(r.status)] = (m[String(r.status)] ?? 0) + 1), m), {})))
  out(`  ${k}: ${v}`);

let problems = 0;

out('\n== 矛盾：summary 含「稳定/可靠/高可用」但 status 非 ok（人工复核，措辞如实者可忽略）==');
const boast = /(高可用|稳定可靠|99\.\d%可用)/;
const honest = /(存疑|不稳|已关停|已失效|稳定性差)/;
for (const r of rs)
  if (r.status !== 'ok' && boast.test(r.summary || '') && !honest.test(r.summary || '')) {
    problems++;
    out(`  [${r.status}] ${r.id} | ${r.summary}`);
  }

out('\n== 错位：free-api / charity 带「付费」相关 tag ==');
for (const r of rs)
  if ((r.subType === 'free-api' || r.subType === 'charity') && (r.tags || []).some((t) => /付费|按量计费/.test(t))) {
    problems++;
    out(`  ${r.id} [${r.subType}] tags:${(r.tags || []).join(',')}`);
  }

out('\n== 数值型伪 tag（评分X / 可用率X% 应放描述而非 tags）==');
for (const r of rs) {
  const bad = (r.tags || []).filter((t) => /^(评分[\d.]+|可用率[\d.,%]+)$/.test(t));
  if (bad.length) {
    problems++;
    out(`  ${r.id}: ${bad.join(',')}`);
  }
}

const tf = {};
for (const r of rs) for (const t of r.tags) tf[t] = (tf[t] ?? 0) + 1;
const kinds = Object.keys(tf).length;
const once = Object.values(tf).filter((n) => n === 1).length;
out(`\n== 标签体量 ==\n  不同 tag ${kinds} 个，其中长尾(仅1次) ${once} 个`);

const noSummary = rs.filter((r) => !r.summary?.trim());
const noTags = rs.filter((r) => !(r.tags?.length > 0));
if (noSummary.length) {
  problems += noSummary.length;
  out(`\n== 空 summary ==\n  ${noSummary.map((r) => r.id).join(', ')}`);
}
if (noTags.length) {
  problems += noTags.length;
  out(`\n== 空 tags ==\n  ${noTags.map((r) => r.id).join(', ')}`);
}

out(`\n[audit] 完成：${problems === 0 ? '未发现待处理问题' : `${problems} 处待人工复核`}`);
process.exit(problems > 0 ? 1 : 0);
