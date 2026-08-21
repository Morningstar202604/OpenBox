import { describe, expect, it } from 'vitest';
import { scoreResource, type ResourceSignals } from '../ranking';
import type { Resource } from '@/lib/types';

function makeResource(overrides: Partial<Resource> = {}): Resource {
  return {
    id: 'r1',
    subType: 'free-api',
    scenarios: [],
    name: 'Test Resource',
    url: 'https://example.com',
    type: 'free',
    status: 'ok',
    summary: 'a test resource',
    description: '',
    tags: ['tag1'],
    models: [],
    protocols: [],
    pros: [],
    cons: [],
    featured: false,
    official: false,
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('scoreResource', () => {
  it('total stays within 0-100 for any input', () => {
    const cases = [
      makeResource({ type: 'paid', status: 'dead', popularity: 100 }),
      makeResource({ type: 'free', status: 'ok', official: true, featured: true }),
      makeResource({ updatedAt: undefined }),
      makeResource({ updatedAt: 'not-a-date' as unknown as string }),
    ];
    for (const r of cases) {
      const b = scoreResource(r);
      expect(b.total).toBeGreaterThanOrEqual(0);
      expect(b.total).toBeLessThanOrEqual(100);
    }
  });

  it('rewards free+official+ok over paid+dead', () => {
    const good = scoreResource(makeResource());
    const bad = scoreResource(makeResource({ type: 'paid', status: 'dead' }));
    expect(good.total).toBeGreaterThan(bad.total);
  });

  it('community dead-votes push score down (signal can be negative)', () => {
    const base = scoreResource(makeResource());
    const signals: ResourceSignals = { verifyOk: 0, verifyDead: 10 };
    const voted = scoreResource(makeResource(), signals);
    expect(voted.signal).toBeLessThan(0);
    expect(voted.total).toBeLessThan(base.total);
  });

  it('community ok-votes push score up but signal caps at +30', () => {
    const s: ResourceSignals = { verifyOk: 999, commentCount: 999, favoriteCount: 999, ratingAvg: 1 };
    const b = scoreResource(makeResource(), s);
    expect(b.signal).toBe(30);
    expect(b.total).toBeLessThanOrEqual(100);
  });

  it('fresh resources outscore stale ones', () => {
    const now = scoreResource(makeResource({ updatedAt: new Date().toISOString() }));
    const old = scoreResource(makeResource({ updatedAt: new Date(Date.now() - 365 * 86_400_000).toISOString() }));
    expect(now.total).toBeGreaterThan(old.total);
  });

  it('breakdown parts sum to static+signal totals', () => {
    const b = scoreResource(makeResource(), { verifyOk: 3 });
    const sum = b.parts.reduce((a, p) => a + p.score, 0);
    expect(sum).toBe(b.static + b.signal);
  });
});
