import { useT, useLocalize } from '@/i18n/useI18n';
import { useHashRoute } from '@/hooks/useHashRoute';
import { getSubType } from '@/data/taxonomy';
import { FilterablePage } from '@/components/FilterablePage';
import { EmptyState } from '@/components/EmptyState';
import { SoftIcon } from '@/components/SoftIcon';
import { Icon } from '@/components/Icon';

export function CategoryPage() {
  const t = useT();
  const localize = useLocalize();
  const route = useHashRoute();
  const slug = route.slug ?? '';
  const cat = getSubType(slug);

  if (!cat) return <EmptyState icon="Search" title={t('common.empty')} />;

  return (
    <FilterablePage
      query={{ subType: slug }}
      countLabel={t('category.resources')}
      header={
        <div className="flex items-center gap-3">
          <SoftIcon icon={cat.icon} color={cat.color} size={22} className="h-11 w-11" />
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-fg)]">{localize(cat.name)}</h1>
            <p className="text-sm text-[var(--color-muted)]">{localize(cat.description)}</p>
          </div>
        </div>
      }
      nonFreeHint={
        <p className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-muted)]">
          <Icon name="AlertTriangle" size={14} className="shrink-0 text-[var(--color-warning)]" />
          {t('category.nonFreeHint')}
        </p>
      }
    />
  );
}
