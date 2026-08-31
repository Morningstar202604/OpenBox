import { describe, expect, it } from 'vitest';
import { parseHiddenSlugs, subTypes, scenarios, SUBTYPE_SCENARIOS } from '../taxonomy';
import { seedResources } from '../seed';

// 测试环境未设置 VITE_HIDDEN_CATEGORIES，导出的 subTypes/scenarios 应等于全集；
// 「隐藏后」的行为由构建产物核查（DEPLOY-SCHOOL.md 校园版构建）做端到端验证。
describe('parseHiddenSlugs（VITE_HIDDEN_CATEGORIES 解析）', () => {
  it('空/undefined/null 返回空数组', () => {
    expect(parseHiddenSlugs(undefined)).toEqual([]);
    expect(parseHiddenSlugs(null)).toEqual([]);
    expect(parseHiddenSlugs('')).toEqual([]);
  });

  it('逗号分隔解析并去除空白', () => {
    expect(parseHiddenSlugs('proxy-nodes, relays ,  tools')).toEqual([
      'proxy-nodes',
      'relays',
      'tools',
    ]);
  });

  it('去重且保持首次出现顺序', () => {
    expect(parseHiddenSlugs('b,a,b,c')).toEqual(['b', 'a', 'c']);
  });

  it('连续逗号与纯空白段被忽略', () => {
    expect(parseHiddenSlugs(',a,, ,b,')).toEqual(['a', 'b']);
  });
});

describe('默认构建（未设置隐藏变量）的分类可见性不变量', () => {
  it('全部子类型可见：叶子分类都有场景映射', () => {
    const slugs = subTypes.map((s) => s.slug);
    expect(slugs).toContain('proxy-nodes');
    // 一级分类（level=1）是容器，不需要场景映射；blacklist 是特殊分类也不需要
    const leaves = subTypes.filter((s) => s.level > 1 && s.slug !== 'blacklist');
    const missing = leaves.filter((s) => !SUBTYPE_SCENARIOS[s.slug]);
    expect(missing.map((s) => s.slug)).toEqual([]);
  });

  it('非 hidden 场景全部可见，且含新增的 freshman 新生工具包', () => {
    const visible = scenarios.map((s) => s.slug);
    expect(visible).toContain('freshman');
    // invite-codes-scene 为页脚低调入口（hidden 标记），不在首页场景树展示集合中由 UI 过滤
    expect(scenarios.find((s) => s.slug === 'invite-codes')?.hidden).toBe(true);
  });

  it('种子资源的每个 subType 都属于当前可见分类（过滤闸门一致性）', () => {
    const visible = new Set(subTypes.map((s) => s.slug));
    const leaked = seedResources.filter((r) => !visible.has(r.subType));
    expect(leaked.map((r) => `${r.id}:${r.subType}`)).toEqual([]);
  });
});
