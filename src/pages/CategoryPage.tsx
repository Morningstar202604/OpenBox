import { useEffect, useMemo, useState } from 'react';
import type { Resource, ResourceStatus, ResourceType } from '@/lib/types';
import { useT, useLocalize } from '@/i18n/useI18n';
import { getResources } from '@/lib/data';
import { getSubType } from '@/data/taxonomy';
import { isNonFree } from '@/lib/resourceFlags';
import { useHashRoute } from '@/hooks/useHashRoute';
import { ResourceList } from '@/components/ResourceList';
import { FilterBar } from '@/components/FilterBar';
import { EmptyState } from '@/components/EmptyState';
import { Icon } from '@/components/Icon';

export function CategoryPage() {
  const t = useT();
  const localize = useLocalize();
  const route = useHashRoute();
  const slug = route.slug ?? '';
  const cat = getSubType(slug);

  const [all, setAll] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<ResourceType | 'all'>('all');
  const [status, setStatus] = useState<ResourceStatus | 'all'>('all');

  useEffect(() => {
    let m = true;
    setLoading(true);
    getResources({ subType: slug }).then((list) => {
      if (m) {
        setAll(list);
        setLoading(false);
      }
    });
    return () => {
      m = false;
    };
  }, [slug]);

  const filtered = useMemo(
    () => all.filter((r) => (type === 'all' || r.type === type) && (status === 'all' || r.status === status)),
    [all, type, status],
  );

  // 免费类板块提示：含非免费项目时明确标注，避免与社区免费资源混淆
  const hasNonFree = all.some((r) => isNonFree(r));

  if (!cat) return <EmptyState icon="Search" title={t('common.empty')} />;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span
          className="flex h-11 w-11 items-center justify-center rounded-xl"
          style={{ background: `${cat.color}1a`, color: cat.color }}
        >
          <Icon name={cat.icon} size={22} />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-fg)]">{localize(cat.name)}</h1>
          <p className="text-sm text-[var(--color-muted)]">{localize(cat.description)}</p>
        </div>
      </div>

      <FilterBar type={type} status={status} onType={setType} onStatus={setStatus} />
      {hasNonFree && (
        <p className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-muted)]">
          <Icon name="AlertTriangle" size={14} className="shrink-0 text-[#f59e0b]" />
          {t('category.nonFreeHint')}
        </p>
      )}
      <p className="text-sm text-[var(--color-muted)]">
        {filtered.length} {t('category.resources')}
      </p>
      <ResourceList resources={filtered} loading={loading} />
    </div>
  );
}
