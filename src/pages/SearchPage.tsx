import { useT } from '@/i18n/useI18n';
import { useHashRoute, navigate } from '@/hooks/useHashRoute';
import { SearchBox } from '@/components/SearchBox';
import { FilterablePage } from '@/components/FilterablePage';

/** 空结果时的热门探索词：把死胡同变成发现入口 */
const HOT = ['claude', '公益站', '中转', '免费API', '绘画'];

export function SearchPage() {
  const t = useT();
  const route = useHashRoute();
  const q = route.q ?? '';

  const emptyHint = (
    <span className="flex flex-wrap items-center justify-center gap-1.5">
      <span className="mr-1">{t('search.try')}</span>
      {HOT.map((k) => (
        <button
          key={k}
          className="chip"
          onClick={() => navigate(`/search?q=${encodeURIComponent(k)}`)}
        >
          {k}
        </button>
      ))}
    </span>
  );

  return (
    <div className="space-y-5">
      <FilterablePage
        query={{ q }}
        countLabel={t('common.results')}
        header={<SearchBox initial={q} autoFocus big />}
        emptyHint={emptyHint}
        overseasOnly
      />
    </div>
  );
}