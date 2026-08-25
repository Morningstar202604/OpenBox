#!/usr/bin/env node
/**
 * 共享数据装载器：rolldown 打包 src/data/seed 后在 Node 内执行，
 * 返回与线上渲染同源的 seedResources（含 id/name/url/status/subType 全量元数据）。
 * audit-data.mjs 与 monitor.mjs 共用，消除各自手写的打包样板。
 */
import { rolldown } from 'rolldown';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** 打包并执行 seed 入口，返回 JSON.parse 后的数组。pick 字段名列表可裁剪产物体积。 */
export async function loadSeedResources(pick) {
  const cacheDir = join(ROOT, 'node_modules/.cache');
  await mkdir(cacheDir, { recursive: true });
  const entryTs = join(cacheDir, `seed-entry-${Date.now()}.ts`);
  const projection = pick && pick.length
    ? `{ ${pick.map((f) => `${f}: r.${f}`)} }`
    : 'r';
  await writeFile(
    entryTs,
    `import { seedResources } from '${join(ROOT, 'src/data/seed').replace(/\\/g, '/')}';\n` +
      `console.log(JSON.stringify(seedResources.map(r => (${projection}))));`,
  );

  const bundle = await rolldown({ input: entryTs, platform: 'node' });
  const { output } = await bundle.generate({ format: 'cjs' });
  await bundle.close();
  if (!output?.[0]?.code) throw new Error('bundle failed');

  const tmpFile = join(cacheDir, `seed-run-${Date.now()}.cjs`);
  await writeFile(tmpFile, output[0].code);
  let json = '';
  const origLog = console.log;
  console.log = (...a) => (json += a.join(' '));
  try {
    await import(pathToFileURL(tmpFile));
  } finally {
    console.log = origLog;
    rm(tmpFile, { force: true }).catch(() => {});
  }
  return JSON.parse(json.trim());
}
