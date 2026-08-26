import type { ResourceStatus, ResourceType } from '@/lib/types';
import { useT } from '@/i18n/useI18n';
import { ALL_STATUSES, ALL_TYPES, STATUS_META, TYPE_META } from '@/lib/format';

export function FilterBar({
  type,
  status,
  domestic = false,
  communityOnly = false,
  onType,
  onStatus,
  onDomestic,
  onCommunityOnly,
}: {
  type: ResourceType | 'all';
  status: ResourceStatus | 'all';
  /** 只看国内可直连（默认关，仅调用方传入 setter 时显示） */
  domestic?: boolean;
  /** 只看社区公益（非官方）资源（默认关，仅调用方传入 setter 时显示） */
  communityOnly?: boolean;
  onType: (t: ResourceType | 'all') => void;
  onStatus: (s: ResourceStatus | 'all') => void;
  onDomestic?: (v: boolean) => void;
  onCommunityOnly?: (v: boolean) => void;
}) {
  const t = useT();
  return (
    <div className="filter-bar flex flex-nowrap items-center gap-2 overflow-x-auto scrollbar-none sm:flex-wrap">
      <button className="chip" data-active={type === 'all'} aria-pressed={type === 'all'} onClick={() => onType('all')}>
        {t('common.all')}
      </button>
      {ALL_TYPES.map((tp) => (
        <button key={tp} className="chip" data-active={type === tp} aria-pressed={type === tp} onClick={() => onType(tp)}>
          {TYPE_META[tp].label}
        </button>
      ))}
      <span className="mx-1 hidden h-4 w-px bg-[var(--color-border)] sm:block" />
      {ALL_STATUSES.map((st) => (
        <button key={st} className="chip" data-active={status === st} aria-pressed={status === st} onClick={() => onStatus(st)}>
          {STATUS_META[st].label}
        </button>
      ))}
      {(onDomestic || onCommunityOnly) && <span className="mx-1 hidden h-4 w-px bg-[var(--color-border)] sm:block" />}
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
    </div>
  );
}
