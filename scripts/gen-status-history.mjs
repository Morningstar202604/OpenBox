// 生成近30天机器巡检历史数据（模拟）
// 基于当前 resource-status.json 的状态，生成合理的历史趋势：
// - ok 资源：大部分时间 ok，偶尔 1-2 天 suspect（模拟波动）
// - suspect 资源：最近几天不稳定，之前可能 ok
// - dead 资源：最近几天才 dead，之前可能 ok/suspect
// 后续 CI 可每日追加真实数据，替换模拟数据

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// 读取当前状态
const current = JSON.parse(readFileSync(join(ROOT, 'public/resource-status.json'), 'utf-8'));
const resources = current.resources || {};

// 生成近30天日期
const today = new Date();
const days = [];
for (let i = 29; i >= 0; i--) {
  const d = new Date(today);
  d.setDate(d.getDate() - i);
  days.push(d.toISOString().slice(0, 10));
}

// 简单的伪随机数生成器（基于种子，保证可复现）
function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const history = {
  generatedAt: today.toISOString(),
  days,
  resources: {},
};

for (const [url, status] of Object.entries(resources)) {
  const rand = seededRandom(url.split('').reduce((a, c) => a + c.charCodeAt(0), 0));
  const series = [];
  const currentV = status.v;
  const currentMs = status.ms || 300;

  for (let i = 0; i < days.length; i++) {
    const date = days[i];
    const isRecent = i >= days.length - 3; // 最近3天
    const isLastDay = i === days.length - 1;

    let v = 'ok';
    let ms = Math.round(currentMs * (0.7 + rand() * 0.6));

    if (isLastDay) {
      // 最后一天必须等于当前状态
      v = currentV;
      ms = currentMs;
    } else if (currentV === 'dead') {
      // dead 资源：最近3天开始 dead，之前可能 suspect 或 ok
      if (isRecent) {
        v = rand() > 0.3 ? 'dead' : 'suspect';
      } else {
        v = rand() > 0.15 ? 'ok' : 'suspect';
      }
    } else if (currentV === 'suspect') {
      // suspect 资源：最近几天不稳定
      if (isRecent) {
        v = rand() > 0.4 ? 'suspect' : 'ok';
      } else {
        v = rand() > 0.1 ? 'ok' : 'suspect';
      }
    } else {
      // ok 资源：大部分时间 ok，偶尔波动
      v = rand() > 0.08 ? 'ok' : 'suspect';
    }

    series.push({ date, v, ms });
  }

  history.resources[url] = series;
}

writeFileSync(join(ROOT, 'public/status-history.json'), JSON.stringify(history, null, 2));
console.log(`Generated history for ${Object.keys(resources).length} resources, ${days.length} days`);
