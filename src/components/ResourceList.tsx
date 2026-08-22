import { useState, type ReactNode } from 'react';
import type { Resource } from '@/lib/types';
import { useT } from '@/i18n/useI18n';
import { ResourceCard } from './ResourceCard';
import { ResourceRow } from './ResourceRow';
import { ResourceCardSkeleton } from './Skeleton';
import { EmptyState } from './EmptyState';
import { Icon } from './Icon';

const PAGE_SIZE = 24;

type ViewMode = 'grid' | 'list';

/** 读取/保存视图偏好（localStorage 记忆，默认列表） */
function loadView(): ViewMode {
  try {
    return localStorage.getItem('ob_view') === 'grid' ? 'grid' : 'list';
  } catch {
    return 'list';
  }
}

/**
 * 资源列表：支持「网格卡 / 信息密集列表行」两种形态（差异化），
 * 视图偏好本地记忆；移动端网格单列、列表行自然纵向，不做强制压缩。
 */
export function ResourceList({ resources, loading = false, allowViewSwitch = true, emptyHint }: { resources: Resource[]; loading?: boolean; allowViewSwitch?: boolean; emptyHint?: ReactNode }) {
  const t = useT();
  const [view, setView] = useState<ViewMode>(loadView);
  // 派生分页：记录页码对应的列表长度，列表变化（搜索/筛选）时自动回到第 1 页，无需 effect 重置
  const [pager, setPager] = useState<{ key: number; page: number }>({ key: resources.length, page: 1 });
  const page = pager.key === resources.length ? pager.page : 1;

  const switchView = (v: ViewMode) => {
    setView(v);
    try {
      localStorage.setItem('ob_view', v);
    } catch { /* ignore */ }
  };

  const toggleBtn = (v: ViewMode, icon: string, label: string) => (
    <button
      className={`flex h-8 w-8 items-center justify-center rounded-md border transition-colors ${
        view === v ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]' : 'border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-fg)]'
      }`}
      onClick={() => switchView(v)}
      aria-label={label}
      title={label}
    >
      <Icon name={icon} size={16} />
    </button>
  );

  const Toggle = (
    <div className="mb-3 flex items-center justify-end gap-1">
      {toggleBtn('grid', 'LayoutGrid', t('view.grid'))}
      {toggleBtn('list', 'List', t('view.list'))}
    </div>
  );

  const sliced = resources.slice(0, page * PAGE_SIZE);
  const hasMore = resources.length > page * PAGE_SIZE;
  const LoadMore = hasMore ? (
    <button className="btn btn-ghost mx-auto mt-4 block" onClick={() => setPager({ key: resources.length, page: page + 1 })}>
      {t('common.loadMore') ?? '加载更多'} ({resources.length - page * PAGE_SIZE} 条)
    </button>
  ) : null;

  if (loading) {
    return (
      <div>
        {allowViewSwitch && Toggle}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <ResourceCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (!resources.length) {
    return (
      <EmptyState
        icon="Search"
        title={t('common.empty')}
        hint={emptyHint ?? (loading ? '—' : undefined)}
      />
    );
  }

  return (
    <div>
      {allowViewSwitch && Toggle}
      {view === 'list' ? (
        <div className="space-y-3">
          {sliced.map((r, i) => (
            <ResourceRow key={r.id} resource={r} index={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sliced.map((r, i) => (
            <ResourceCard key={r.id} resource={r} index={i} />
          ))}
        </div>
      )}
      {LoadMore}
    </div>
  );
}
