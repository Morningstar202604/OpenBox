import { useEffect, useState } from 'react';
import type { Resource } from '@/lib/types';
import { useT } from '@/i18n/useI18n';
import { getResource, getRelatedResources } from '@/lib/data';
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

  const [res, setRes] = useState<Resource | null>(null);
  const [related, setRelated] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let m = true;
    setLoading(true);
    setRelated([]);
    getResource(id).then(async (r) => {
      if (!m) return;
      setRes(r);
      setLoading(false);
      // 记录最近浏览
      if (r) pushRecent(r.id);
      // 加载相关推荐
      if (r) {
        const rel = await getRelatedResources(r.id, 4);
        if (m) setRelated(rel);
      }
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
