import { useMemo } from 'react';
import type { Resource } from '@/lib/types';
import { useT, useLocalize } from '@/i18n/useI18n';
import { getScenario, getSubType } from '@/data/taxonomy';
import { useHashRoute, navigate } from '@/hooks/useHashRoute';
import { useResources } from '@/hooks/useResources';
import { ResourceList } from '@/components/ResourceList';
import { EmptyState } from '@/components/EmptyState';
import { SoftIcon } from '@/components/SoftIcon';
import { Icon } from '@/components/Icon';

export function ScenarioPage() {
  const t = useT();
  const localize = useLocalize();
  const route = useHashRoute();
  const slug = route.slug ?? '';
  const scenario = getScenario(slug);

  const { resources: all, loading } = useResources({ scenario: slug });

  const groups = useMemo(() => {
    const map = new Map<string, Resource[]>();
    for (const r of all) {
      if (!map.has(r.subType)) map.set(r.subType, []);
      map.get(r.subType)!.push(r);
    }
    return [...map.entries()]
      .map(([st, items]) => ({ subType: getSubType(st), items }))
      .filter((g) => g.subType)
      .sort((a, b) => (a.subType!.sort - b.subType!.sort));
  }, [all]);

  if (!scenario) return <EmptyState icon="Search" title={t('common.empty')} />;

  return (
    <div className="space-y-7">
      <button className="btn btn-ghost btn-sm" onClick={() => navigate('/home')}>
        <Icon name="ArrowLeft" size={16} /> {t('common.back')}
      </button>

      <div className="flex items-center gap-3">
        <SoftIcon icon={scenario.icon} color={scenario.color} size={22} className="h-11 w-11" />
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-fg)]">{localize(scenario.name)}</h1>
          <p className="text-sm text-[var(--color-muted)]">{localize(scenario.description)}</p>
        </div>
      </div>

      {loading ? (
        <p className="text-[var(--color-muted)]">{t('common.loading')}</p>
      ) : groups.length === 0 ? (
        <EmptyState icon="Search" title={t('scenario.empty')} />
      ) : (
        groups.map((g) => (
          <section key={g.subType!.slug} className="space-y-3">
            <div className="flex items-center gap-2">
              <Icon name={g.subType!.icon} size={16} style={{ color: g.subType!.color }} />
              <h2 className="font-semibold text-[var(--color-fg)]">{localize(g.subType!.name)}</h2>
              <span className="text-sm text-[var(--color-muted)]">{g.items.length}</span>
            </div>
            <ResourceList resources={g.items} />
          </section>
        ))
      )}
    </div>
  );
}
