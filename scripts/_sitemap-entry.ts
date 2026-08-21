// 临时入口：由 gen-sitemap.mjs 经 esbuild 打包后在 Node 中执行，输出站点数据 JSON。
// 不参与前端构建（放 scripts/ 下，vite 不会打包）。
import { seedResources } from '../src/data/seed';
import { subTypes } from '../src/data/taxonomy';

const seen = new Set<string>();
const ids = seedResources.map((r) => r.id).filter((id) => (seen.has(id) ? false : (seen.add(id), true)));

console.log(
  JSON.stringify({
    ids,
    subs: subTypes.map((s) => s.slug),
    updatedAt: new Date().toISOString().slice(0, 10),
  }),
);
