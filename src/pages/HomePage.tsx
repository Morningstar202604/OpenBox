import { useEffect, useMemo, useState } from 'react';
import type { Resource } from '@/lib/types';
import { useT } from '@/i18n/useI18n';
import { getResourcesByIds } from '@/lib/data';
import { fmtDate } from '@/lib/format';
import { buildScenarioTree } from '@/data/taxonomy';
import { useResources } from '@/hooks/useResources';
import { ResourceRow } from '@/components/ResourceRow';
import { Icon } from '@/components/Icon';
import { useRecentStore } from '@/store/useRecentStore';
import { scoreResource } from '@/lib/ranking';
import { needsOverseas } from '@/lib/resourceFlags';
import { RankingBoard } from '@/components/RankingBoard';
import { TagCloud } from '@/components/TagCloud';
import { WeeklyUpdates } from '@/components/WeeklyUpdates';
import { FeaturedCard } from '@/components/FeaturedCard';
import { CategoryNavBar } from '@/components/CategoryNavBar';

// 精选推荐优先的子类型：中转站 / 免费 API / 免费资源操作类（服务器·域名·公益站）。
// 官方内容一律不进精选（避免与社区免费资源混淆）。
const FEATURED_SUBTYPES = ['relays', 'free-api', 'free-server', 'free-domain', 'charity', 'freechat', 'proxy-nodes'];

export function HomePage() {
  const t = useT();
  const { resources, loading } = useResources({ sort: 'default' });

  const tree = useMemo(() => buildScenarioTree(resources), [resources]);

  // 精选推荐：非官方；公益站 > 国内可直连 > 评分，官方内容一律不进精选
  const featured = useMemo(() => {
    const flagged = resources.filter((r) => r.featured && !r.official);
    const pool = resources
      .filter((r) => !r.official && FEATURED_SUBTYPES.includes(r.subType));
    // 评分只算一次存 Map；此前在 sort 比较器里重复计算，O(n log n) 次全量评分浪费明显
    const scoreById = new Map(pool.map((r) => [r.id, scoreResource(r).total]));
    // 站长口径：精选尽量推公益站（社区维护、签到领额度），其次国内可直连的，再按评分
    const pri = (r: Resource) =>
      Number(r.subType !== 'charity') * 2 + Number(needsOverseas(r));
    const pool2 = [...pool].sort(
      (a, b) =>
        pri(a) - pri(b) || (scoreById.get(b.id) ?? 0) - (scoreById.get(a.id) ?? 0),
    );
    const merged: Resource[] = [];
    for (const r of [...flagged, ...pool2]) {
      if (!merged.find((x) => x.id === r.id)) merged.push(r);
      if (merged.length >= 6) break;
    }
    return merged;
  }, [resources]);

  // 最近浏览
  const recentIds = useRecentStore((s) => s.ids);
  // 派生空态：无浏览记录直接给空数组，不进 effect 分支
  const [loadedRecent, setLoadedRecent] = useState<{ ids: string[]; list: Resource[] } | null>(null);
  useEffect(() => {
    if (recentIds.length === 0) return;
    let m = true;
    getResourcesByIds(recentIds.slice(0, 4)).then((list) => {
      if (m) setLoadedRecent({ ids: recentIds, list });
    });
    return () => { m = false; };
  }, [recentIds]);
  const recentResources: Resource[] =
    recentIds.length === 0 ? [] : (loadedRecent?.ids === recentIds ? loadedRecent.list : []);

  // 状态聚合（「现在还能不能薅」的全局一眼观感）
  const statusCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of resources) m[r.status] = (m[r.status] ?? 0) + 1;
    return m;
  }, [resources]);

  // 全库最近更新时间（原 StatusMonitor 卡片的独有信息，并入 hero 统计行）
  const lastUpdated = useMemo(
    () => resources.reduce((max, r) => (r.updatedAt && r.updatedAt > max ? r.updatedAt : max), ''),
    [resources],
  );

  return (
    <div className="space-y-10 sm:space-y-14">
      {/* 紧凑头部：标题 + 搜索 + 统计 */}
      <section className="relative rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-8 text-center sm:px-12 sm:py-10">
        <div
          className="hero-glow pointer-events-none absolute inset-x-0 top-0 -z-10 opacity-60"
          style={{ background: 'radial-gradient(40rem 18rem at 50% -30%, var(--color-primary-soft), transparent 70%)' }}
        />
        <h1 className="font-display text-3xl font-black tracking-tight text-[var(--color-fg)] sm:text-4xl">{t('home.title')}</h1>
        <p className="mx-auto mt-3 max-w-xl text-[var(--color-muted)]">{t('home.subtitle')}</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1.5 text-sm text-[var(--color-muted)]">
          <span className="term-prompt" />
          <span className="font-mono">{t('home.stats')}：</span>
          <span className="font-mono font-semibold text-[var(--color-primary)]">{loading ? '—' : resources.length}</span>
          <span>·</span>
          <span className="font-mono">
            {tree.length} {t('nav.categories')}
          </span>
          {lastUpdated && (
            <>
              <span>·</span>
              <span className="font-mono">
                {t('status.lastUpdated')} {fmtDate(lastUpdated)}
              </span>
            </>
          )}
        </div>

        {/* 状态聚合：全站唯一健康度展示（信号灯式「现在还能不能薅」）。
            此前的健康度条形与 StatusMonitor 卡片重复展示同一份计数，已收敛删除。 */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm">
          <span className="signal" data-status="ok">{loading ? '—' : statusCounts.ok ?? 0} {t('status.ok')}</span>
          <span className="signal" data-status="unstable">{loading ? '—' : statusCounts.unstable ?? 0} {t('status.unstable')}</span>
          <span className="signal" data-status="dead">{loading ? '—' : statusCounts.dead ?? 0} {t('status.dead')}</span>
          <span className="signal" data-status="unknown">{loading ? '—' : statusCounts.unknown ?? 0} {t('status.unknown')}</span>
        </div>
      </section>

      {/* 多榜单：网易云式横向切换，置于精选推荐之前 */}
      <RankingBoard resources={resources} />

      {/* 精选推荐：非官方，中转站/免费API/免费资源优先，进首页「从哪看起」 */}
      {featured.length > 0 && (
        <section>
          <div className="section-head mb-4">
            <span className="no flex items-center">
              <Icon name="Sparkles" size={16} />
            </span>
            <h2>{t('home.featured')}</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {featured.map((r) => (
              <FeaturedCard key={r.id} resource={r} />
            ))}
          </div>
        </section>
      )}

      {/* 最近浏览 */}
      {recentResources.length > 0 && (
        <section>
          <div className="section-head mb-4">
            <span className="no">01</span>
            <h2>{t('home.recentBrowsing')}</h2>
          </div>
          <div className="space-y-2">
            {recentResources.map((r, i) => (
              <ResourceRow key={r.id} resource={r} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* 增强模块（状态监测已并入 hero，不再重复展示） */}
      <TagCloud resources={resources} />
      <WeeklyUpdates />

      {/* 全部分类导航栏：下沉到底部（原排行榜位置），横向快捷入口 */}
      <CategoryNavBar />
    </div>
  );
}
