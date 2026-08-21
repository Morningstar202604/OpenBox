import { useT } from '@/i18n/useI18n';
import { useHashRoute } from '@/hooks/useHashRoute';
import { SearchBox } from '@/components/SearchBox';
import { FilterablePage } from '@/components/FilterablePage';

export function SearchPage() {
  const t = useT();
  const route = useHashRoute();
  const q = route.q ?? '';

  return (
    <FilterablePage
      query={{ q }}
      countLabel={t('common.results')}
      header={<SearchBox initial={q} autoFocus big />}
    />
  );
}
