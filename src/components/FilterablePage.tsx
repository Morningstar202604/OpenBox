import { useMemo, useState, type ReactNode } from 'react';
import type { ResourceStatus, ResourceType } from '@/lib/types';
import { useResources } from '@/hooks/useResources';
import type { ResourceQuery } from '@/lib/data';
import { isNonFree, needsOverseas } from '@/lib/resourceFlags';
import { FilterBar } from './FilterBar';
import { ResourceList } from './ResourceList';

/**
 * 可筛选资源页骨架：加载 + 计费类型/状态双过滤 + FilterBar + 结果计数 + 资源列表。
 * CategoryPage / SearchPage 复用，消除「加载 + 过滤 + 计数 + 列表」的整段重复。
 */
export function FilterablePage({
  query,
  countLabel,
  header,
  nonFreeHint,
  emptyHint,
  overseasOnly: overseasOnlyProp,
}: {
  query: ResourceQuery;
  countLabel: string;
  header?: ReactNode;
  /** 有非免费资源时展示的提示（如分类页「含付费项目」说明） */
  nonFreeHint?: ReactNode;
  /** 空结果时的引导内容（如搜索页热门关键词） */
  emptyHint?: ReactNode;
  /** 是否显示「需代理/海外」过滤按钮（default: false，仅在 free-api 等需要多级导航的分类开启） */
  overseasOnly?: boolean;
}) {
  const [type, setType] = useState<ResourceType | 'all'>('all');
  const [status, setStatus] = useState<ResourceStatus | 'all'>('all');
  const [domestic, setDomestic] = useState(false);
  const [communityOnly, setCommunityOnly] = useState(false);
  const [overseasOnly, setOverseasOnly] = useState(false);
  const [sort, setSort] = useState<string>(query.sort ?? 'default');

  const filteredQuery = {
    ...query,
    type: type === 'all' ? undefined : type,
    status: status === 'all' ? undefined : status,
    domestic,
    communityOnly,
    overseasOnly: overseasOnlyProp || overseasOnly,
    sort: sort as ResourceQuery['sort'],
  };

  const { resources: all, loading } = useResources(filteredQuery);

  const filtered = useMemo(
    () =>
      all.filter(
        (r) =>
          (type === 'all' || r.type === type) &&
          (status === 'all' || r.status === status) &&
          (!domestic || !needsOverseas(r)) &&
          (!communityOnly || !r.official),
      ),
    [all, type, status, domestic, communityOnly],
  );
  const hasNonFree = all.some((r) => isNonFree(r));

  return (
    <div className="space-y-5">
      {header}
      {nonFreeHint && hasNonFree && nonFreeHint}
      <FilterBar
        type={type}
        status={status}
        domestic={domestic}
        communityOnly={communityOnly}
        overseasOnly={overseasOnly}
        sort={sort}
        onType={setType}
        onStatus={setStatus}
        onDomestic={setDomestic}
        onCommunityOnly={setCommunityOnly}
        onOverseasOnly={overseasOnlyProp ? setOverseasOnly : undefined}
        onSort={setSort}
      />
      <p className="text-sm text-[var(--color-muted)]">
        {filtered.length} {countLabel}
      </p>
      <ResourceList resources={filtered} loading={loading} emptyHint={emptyHint} />
    </div>
  );
}
