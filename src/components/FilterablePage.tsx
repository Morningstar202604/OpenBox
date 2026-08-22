import { useMemo, useState, type ReactNode } from 'react';
import type { ResourceStatus, ResourceType } from '@/lib/types';
import { useResources } from '@/hooks/useResources';
import type { ResourceQuery } from '@/lib/data';
import { isNonFree } from '@/lib/resourceFlags';
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
}: {
  query: ResourceQuery;
  countLabel: string;
  header?: ReactNode;
  /** 有非免费资源时展示的提示（如分类页「含付费项目」说明） */
  nonFreeHint?: ReactNode;
  /** 空结果时的引导内容（如搜索页热门关键词） */
  emptyHint?: ReactNode;
}) {
  const { resources: all, loading } = useResources(query);
  const [type, setType] = useState<ResourceType | 'all'>('all');
  const [status, setStatus] = useState<ResourceStatus | 'all'>('all');

  const filtered = useMemo(
    () => all.filter((r) => (type === 'all' || r.type === type) && (status === 'all' || r.status === status)),
    [all, type, status],
  );
  const hasNonFree = all.some((r) => isNonFree(r));

  return (
    <div className="space-y-5">
      {header}
      {nonFreeHint && hasNonFree && nonFreeHint}
      <FilterBar type={type} status={status} onType={setType} onStatus={setStatus} />
      <p className="text-sm text-[var(--color-muted)]">
        {filtered.length} {countLabel}
      </p>
      <ResourceList resources={filtered} loading={loading} emptyHint={emptyHint} />
    </div>
  );
}
