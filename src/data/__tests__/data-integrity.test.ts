import { describe, expect, it } from 'vitest';
import { seedResources, POPULARITY_BY_NAME } from '../seed';
import { sites } from '../sites';
import { curatedResources } from '../curated';
import { subTypes, scenarios } from '../taxonomy';
import { isBlacklisted } from '../blacklist';

const subTypeSlugs = new Set(subTypes.map((s) => s.slug));
const scenarioSlugs = new Set(scenarios.map((s) => s.slug));

describe('seedResources 数据完整性', () => {
  it('id 全局唯一（重复 id 会导致详情路由串资源）', () => {
    const ids = seedResources.map((r) => r.id);
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(dupes).toEqual([]);
  });

  it('每条资源的 subType 都在 taxonomy 中注册（否则分类页/场景页丢失）', () => {
    const unknown = seedResources.filter((r) => !subTypeSlugs.has(r.subType));
    expect(unknown.map((r) => `${r.id}:${r.subType}`)).toEqual([]);
  });

  it('显式声明的 scenarios 都合法', () => {
    const bad = seedResources.filter(
      (r) => r.scenarios?.some((s) => !scenarioSlugs.has(s)),
    );
    expect(bad.map((r) => `${r.id}:${r.scenarios!.join(',')}`)).toEqual([]);
  });

  it('url 必须是合法 http(s) 链接', () => {
    const bad = seedResources.filter((r) => !/^https?:\/\/[^\s]+\.[^\s]{2,}$/i.test(r.url));
    expect(bad.map((r) => `${r.id}:${r.url}`)).toEqual([]);
  });

  it('黑名单站点不得以 ok 状态出现在正式列表中', () => {
    const leaked = seedResources.filter((r) => isBlacklisted(r.url) && r.status === 'ok');
    expect(leaked.map((r) => r.id)).toEqual([]);
  });

  it('人气分表的每个键都必须命中一条真实资源名（改名失配会让热门榜静默归零）', () => {
    const names = new Set(seedResources.map((r) => r.name));
    const orphan = Object.keys(POPULARITY_BY_NAME).filter((k) => !names.has(k));
    expect(orphan).toEqual([]);
  });

  it('存活白名单不得收录 status=dead 的条目（白名单语义与数据自洽）', () => {
    const deadIncluded = sites.filter(
      (s) => s.status === 'dead' && seedResources.some((r) => r.id === s.id),
    );
    expect(deadIncluded.map((s) => s.id)).toEqual([]);
  });
});

describe('上游数据集完整性', () => {
  it('sites: id 唯一且 url 合法', () => {
    const ids = sites.map((s) => s.id);
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(dupes).toEqual([]);
    const badUrls = sites.filter((s) => !/^https?:\/\//i.test(s.url));
    expect(badUrls.map((s) => `${s.id}:${s.url}`)).toEqual([]);
  });

  it('curatedResources: id 唯一、subType 已注册', () => {
    const ids = curatedResources.map((r) => r.id);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
    const badSub = curatedResources.filter((r) => !subTypeSlugs.has(r.subType));
    expect(badSub.map((r) => `${r.id}:${r.subType}`)).toEqual([]);
  });
});
