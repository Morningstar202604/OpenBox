import { describe, expect, it } from 'vitest';
import { routeFromPath } from '../useHashRoute';

/** 全路由回归：history 迁移（issue #15）后解析语义与旧 hash 路由逐段一致 */
describe('routeFromPath', () => {
  it('根路径进入引导页', () => {
    expect(routeFromPath('/', '')).toEqual({ name: 'landing' });
    expect(routeFromPath('', '')).toEqual({ name: 'landing' });
  });

  it('静态页路由', () => {
    expect(routeFromPath('/home', '')).toEqual({ name: 'home' });
    expect(routeFromPath('/submit', '')).toEqual({ name: 'submit' });
    expect(routeFromPath('/about', '')).toEqual({ name: 'about' });
    expect(routeFromPath('/favorites', '')).toEqual({ name: 'favorites' });
    expect(routeFromPath('/my', '')).toEqual({ name: 'my' });
    expect(routeFromPath('/ranking', '')).toEqual({ name: 'ranking' });
    expect(routeFromPath('/help', '')).toEqual({ name: 'help' });
    expect(routeFromPath('/admin', '')).toEqual({ name: 'admin' });
  });

  it('带参数的路由', () => {
    expect(routeFromPath('/category/free-api', '')).toEqual({ name: 'category', slug: 'free-api' });
    expect(routeFromPath('/scenario/invite-codes', '')).toEqual({ name: 'scenario', slug: 'invite-codes' });
    expect(routeFromPath('/resource/ob-relay-yunwu', '')).toEqual({ name: 'resource', id: 'ob-relay-yunwu' });
  });

  it('搜索查询参数解析（含百分号编码）', () => {
    expect(routeFromPath('/search', 'q=claude')).toEqual({ name: 'search', q: 'claude' });
    expect(routeFromPath('/search', 'q=%E4%B8%AD%E8%BD%AC')).toEqual({ name: 'search', q: '中转' });
    expect(routeFromPath('/search', '')).toEqual({ name: 'search', q: '' });
  });

  it('缺段回退与未知路径判 notfound（与旧版语义一致）', () => {
    expect(routeFromPath('/category', '')).toEqual({ name: 'home' });
    expect(routeFromPath('/scenario', '')).toEqual({ name: 'home' });
    expect(routeFromPath('/resource', '')).toEqual({ name: 'home' });
    expect(routeFromPath('/no-such-page', '')).toEqual({ name: 'notfound' });
  });

  it('兼容旧 hash 内嵌查询串的拆分形式', () => {
    // rewriteLegacyHash 前的首次渲染会走 hash 分支：raw = '/search?q=x'
    const [p, q] = '/search?q=%E5%85%8D%E8%B4%B9'.split('?');
    expect(routeFromPath(p, q)).toEqual({ name: 'search', q: '免费' });
  });

  it('页内锚不参与路由匹配', () => {
    // /help#intro 的 pathname 是 /help、hash 不传入
    expect(routeFromPath('/help', '')).toEqual({ name: 'help' });
  });
});
