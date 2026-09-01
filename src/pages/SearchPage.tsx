import { useT } from '@/i18n/useI18n';
import { useHashRoute, navigate } from '@/hooks/useHashRoute';
import { SearchBox } from '@/components/SearchBox';
import { FilterablePage } from '@/components/FilterablePage';
import { Icon } from '@/components/Icon';

/** 空结果时的热门探索词：把死胡同变成发现入口 */
const HOT = ['Claude', 'GPT', '免费API', '公益站', '中转', 'DeepSeek', '绘画', 'Agent'];

export function SearchPage() {
  const t = useT();
  const route = useHashRoute();
  const q = route.q ?? '';

  const emptyHint = (
    <div className="space-y-4 text-center">
      <div className="flex flex-col items-center gap-2">
        <Icon name="SearchX" size={40} className="text-[var(--color-muted)]" />
        <p className="text-[var(--color-muted)]">
          没有找到与「<span className="font-medium text-[var(--color-fg)]">{q}</span>」相关的资源
        </p>
        <p className="text-sm text-[var(--color-muted)]">试试更短的关键词，或浏览以下热门分类</p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {HOT.map((k) => (
          <button
            key={k}
            className="chip"
            onClick={() => navigate(`/search?q=${encodeURIComponent(k)}`)}
          >
            {k}
          </button>
        ))}
      </div>
      <button
        className="btn btn-ghost btn-sm"
        onClick={() => navigate('/')}
      >
        <Icon name="Home" size={14} />
        返回首页
      </button>
    </div>
  );

  return (
    <div className="space-y-5">
      <FilterablePage
        query={{ q }}
        countLabel={t('common.results')}
        header={
          <div className="space-y-3">
            <SearchBox initial={q} autoFocus big />
            {q && (
              <p className="text-sm text-[var(--color-muted)]">
                搜索「<span className="font-medium text-[var(--color-fg)]">{q}</span>」
              </p>
            )}
          </div>
        }
        emptyHint={emptyHint}
      />
    </div>
  );
}
