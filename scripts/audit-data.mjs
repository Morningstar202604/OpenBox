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
 *   6) 时效性数值承诺：summary/description/pricing/pros 中无时点限定的
 *      具体倍率、价格、额度数字（变动频繁，极易过时）
 *   7) 价格最高级营销话术：「全球最低价/最实惠」等绝对化承诺（引号内引用除外）
 *
 * 原理与 gen-sitemap 相同：rolldown 打包 seed 数据后在 Node 内执行分析，
 * 与线上渲染同源，零手工同步成本。发现的问题按 id 定位到 curated.ts /
 * sites.ts 修复后重跑本脚本复查。
 */
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSeedResources } from './lib-bundle-data.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const raw = await loadSeedResources();
const rs = raw.map((r) => ({
  id: r.id,
  subType: r.subType,
  name: r.name,
  url: r.url,
  tags: r.tags ?? [],
  type: r.type,
  status: r.status,
  summary: r.summary,
  description: r.description,
  pricing: r.pricing,
  pros: r.pros ?? [],
}));

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

// ---- 描述文本质量：时效性数值承诺 ----
// 倍率/价格/额度类具体数字变动频繁，无时点限定的硬承诺极易过时。
// 扫描用户可见的承诺面（summary/description/pricing/pros）；tips 按惯例自带日期戳，不扫。
const claimFields = (r) =>
  [r.summary, r.description, r.pricing, ...(Array.isArray(r.pros) ? r.pros : [])]
    .filter(Boolean)
    .map((s) => String(s));
// 时点/模糊限定词：命中其一即视为已做防过时处理（含显式日期戳，如「2026-07 起」）
const QUALIFIER = /(约|左右|快照|时点|截至|动态倍率|分时段|时段性|随.{0,8}(调整|浮动|变化)|仅供参考|以官网为准|以站内为准|历史|20\d{2}\s*[-年./])/;
// 具体倍率/比例：0.45x 倍率、0.2 倍、低至 0.08 倍、官方 1:1
const RATE = /[0-9]+(?:\.[0-9]+)?\s*[x×]?\s*倍[率数]?|[0-9]+\s*[:：]\s*1(?![0-9])/;
// 具体价格/额度：$5、$0.01/M、1 元/M token、0.1 元/M
const PRICE = /\$\s?[0-9]+(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?\s*(?:元|RMB|CNY|USD|刀)\s*(?:\/\s*M\b|M\s*token|\/\s*百万)?/i;

out('\n== 时效性数值承诺：无时点限定的具体倍率/价格（建议加「约」或移入带日期 tips）==');
for (const r of rs) {
  const hits = [];
  for (const raw of claimFields(r)) {
    // 去掉资源名自身（品牌名含数字不算承诺，如「7倍算力」）与引号内引用
    let text = raw;
    if (r.name) text = text.split(String(r.name)).join('');
    text = text.replace(/「[^」]*」/g, '');
    if (!QUALIFIER.test(text) && (RATE.test(text) || PRICE.test(text))) {
      hits.push(raw.length > 90 ? `${raw.slice(0, 90)}…` : raw);
    }
  }
  if (hits.length) {
    problems++;
    out(`  ${r.id} [${r.subType}] ${hits.join(' | ')}`);
  }
}

out('\n== 价格最高级营销话术（绝对化承诺易被打脸；引号内引用除外）==');
const SUPERLATIVE = /(全球最低价|全网最低|最便宜|最实惠|价格最低)/;
for (const r of rs) {
  const hits = claimFields(r)
    .map((t) => t.replace(/「[^」]*」/g, ''))
    .filter((t) => SUPERLATIVE.test(t));
  if (hits.length) {
    problems++;
    out(`  ${r.id} [${r.subType}] ${hits.join(' | ')}`);
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
