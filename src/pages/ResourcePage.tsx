import { useEffect, useState } from 'react';
import type { Resource } from '@/lib/types';
import { useT } from '@/i18n/useI18n';
import { getResource, getRelatedResources } from '@/lib/data';
import { setSEO, setJsonLd } from '@/lib/seo';
import { useHashRoute, navigate } from '@/hooks/useHashRoute';
import { useRecentStore } from '@/store/useRecentStore';
import { ResourceDetail } from '@/components/DetailView';
import { ResourceCard } from '@/components/ResourceCard';
import { EmptyState } from '@/components/EmptyState';
import { Icon } from '@/components/Icon';

export function ResourcePage() {
  const t = useT();
  const route = useHashRoute();
  const id = route.id ?? '';
  const pushRecent = useRecentStore((s) => s.push);

  // 派生 loading：state 记录所属资源 id，id 变化即视为加载中，无需在 effect 里手动重置
  const [data, setData] = useState<{ id: string; res: Resource | null; related: Resource[] } | null>(null);
  const loading = data?.id !== id;
  const res = loading ? null : data!.res;
  const related = loading ? [] : data!.related;

  useEffect(() => {
    let m = true;
    getResource(id).then(async (r) => {
      if (!m) return;
      setData({ id, res: r, related: [] });
      // 资源级 SEO：标题/描述/OG 用资源自身信息（覆盖 App 层的通用值）
      if (r) {
        setSEO({ title: r.name, description: r.summary || r.description.slice(0, 150), path: `/resource/${r.id}` });
        setJsonLd({
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: r.name,
          url: r.url,
          description: r.summary || r.description.slice(0, 300),
          applicationCategory: 'AI Resource Directory Entry',
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'CNY' },
        });
        pushRecent(r.id);
      }
      // 加载相关推荐
      const related = r ? await getRelatedResources(r.id, 4) : [];
      if (!m) return;
      setData((prev) => (prev && prev.id === id ? { ...prev, related } : prev));
    });
    return () => {
      m = false;
    };
  }, [id, pushRecent]);

  return (
    <div className="mx-auto max-w-2xl">
      <button className="btn btn-ghost btn-sm mb-4" onClick={() => navigate('/home')}>
        <Icon name="ArrowLeft" size={16} /> {t('common.back')}
      </button>
      {loading ? (
        <p className="text-[var(--color-muted)]">{t('common.loading')}</p>
      ) : res ? (
        <>
          <div className="card p-6">
            <ResourceDetail resource={res} />
          </div>
          {related.length > 0 && (
            <section className="mt-8">
              <h3 className="mb-4 text-lg font-semibold text-[var(--color-fg)]">
                {t('detail.related')}
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {related.map((r, i) => (
                  <ResourceCard key={r.id} resource={r} index={i} />
                ))}
              </div>
            </section>
          )}
        </>
      ) : (
        <EmptyState icon="Search" title={t('common.empty')} />
      )}
    </div>
  );
}
