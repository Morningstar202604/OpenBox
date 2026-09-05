import type { ResourceStatus, ResourceType } from '@/lib/types';
import { useT } from '@/i18n/useI18n';
import { ALL_TYPES, TYPE_META } from '@/lib/format';

export function FilterBar({
  type,
  status,
  domestic = false,
  communityOnly = false,
  overseasOnly = false,
  sort = 'default',
  onType,
  onStatus,
  onDomestic,
  onCommunityOnly,
  onOverseasOnly,
  onSort,
}: {
  type: ResourceType | 'all';
  status: ResourceStatus | 'all';
  /** 只看国内可直连（默认关，仅调用方传入 setter 时显示） */
  domestic?: boolean;
  /** 只看社区公益（非官方）资源（默认关，仅调用方传入 setter 时显示） */
  communityOnly?: boolean;
  /** 只看需代理/海外的资源（默认关，仅调用方传入 setter 时显示） */
  overseasOnly?: boolean;
  sort?: string;
  onType: (t: ResourceType | 'all') => void;
  onStatus: (s: ResourceStatus | 'all') => void;
  onDomestic?: (v: boolean) => void;
  onCommunityOnly?: (v: boolean) => void;
  onOverseasOnly?: (v: boolean) => void;
  onSort?: (s: string) => void;
}) {
  const t = useT();
  const SORT_OPTIONS = [
    { value: 'default', labelKey: 'filter.sort.default' },
    { value: 'name', labelKey: 'filter.sort.name' },
    { value: 'updated', labelKey: 'filter.sort.updated' },
    { value: 'popularity', labelKey: 'filter.sort.popularity' },
    { value: 'score', labelKey: 'filter.sort.score' },
  ] as const;

  const STATUS_QUICK_TABS: { value: ResourceStatus | 'all'; labelKey: string }[] = [
    { value: 'all', labelKey: 'status.quick.all' },
    { value: 'ok', labelKey: 'status.quick.working' },
    { value: 'unstable', labelKey: 'status.quick.unstable' },
    { value: 'dead', labelKey: 'status.quick.dead' },
  ];

  return (
    <div className="space-y-3">
      {/* 状态快捷筛选 Tab */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-[var(--color-muted)] self-center mr-1">{t('common.status')}:</span>
        {STATUS_QUICK_TABS.map((tab) => (
          <button
            key={tab.value}
            className={`chip ${status === tab.value ? 'chip-active' : ''}`}
            data-active={status === tab.value}
            aria-pressed={status === tab.value}
            onClick={() => onStatus(tab.value)}
          >
            {t(tab.labelKey)}
          </button>
        ))}
      </div>
      <div className="filter-bar flex flex-nowrap items-center gap-2 overflow-x-auto scrollbar-none sm:flex-wrap">
        <button className="chip" data-active={type === 'all'} aria-pressed={type === 'all'} onClick={() => onType('all')}>
          {t('common.all')}
        </button>
        {ALL_TYPES.map((tp) => (
          <button key={tp} className="chip" data-active={type === tp} aria-pressed={type === tp} onClick={() => onType(tp)}>
            {TYPE_META[tp].label}
          </button>
        ))}
        {(onDomestic || onCommunityOnly || onOverseasOnly) && <span className="mx-1 hidden h-4 w-px bg-[var(--color-border)] sm:block" />}
        {onDomestic && (
          <button
            className="chip"
            data-active={domestic}
            aria-pressed={domestic}
            onClick={() => onDomestic(!domestic)}
          >
            {t('filter.domestic')}
          </button>
        )}
        {onOverseasOnly && (
          <button
            className="chip"
            data-active={overseasOnly}
            aria-pressed={overseasOnly}
            onClick={() => onOverseasOnly(!overseasOnly)}
          >
            {t('filter.overseas')}
          </button>
        )}
        {onCommunityOnly && (
          <button
            className="chip"
            data-active={communityOnly}
            aria-pressed={communityOnly}
            onClick={() => onCommunityOnly(!communityOnly)}
          >
            {t('filter.community')}
          </button>
        )}
        {onSort && (
          <>
            <span className="mx-1 hidden h-4 w-px bg-[var(--color-border)] sm:block" />
            <span className="text-xs text-[var(--color-muted)] hidden sm:inline">排序:</span>
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`chip ${sort === opt.value ? 'chip-active' : ''}`}
                data-active={sort === opt.value}
                aria-pressed={sort === opt.value}
                onClick={() => onSort(opt.value)}
              >
                {t(opt.labelKey)}
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
