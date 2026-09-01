import { useEffect, useState } from 'react';
import type { Resource } from '@/lib/types';
import { weeklyPicks, getLatestPick, PICK_TAG_META, type WeeklyPick, type WeeklyPickItem } from '@/data/weeklyPicks';
import { getResource } from '@/lib/data';
import { navigate } from '@/hooks/useHashRoute';
import { safeHref } from '@/lib/url';
import { Icon } from '@/components/Icon';
import { StatusBadge, TypeBadge } from '@/components/Badge';
import { ResourceFlags } from '@/components/ResourceFlags';
import { fmtDate } from '@/lib/format';

/** 精选资源卡片：大卡片展示推荐理由 */
function PickCard({ item, resource, index }: { item: WeeklyPickItem; resource: Resource | null; index: number }) {
  if (!resource) return null;
  const tagMeta = item.tag ? PICK_TAG_META[item.tag] : null;

  return (
    <div
      className="card card-hover ink-hover relative overflow-hidden p-5"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* 推荐标签角标 */}
      {tagMeta && (
        <span
          className="absolute right-4 top-4 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
          style={{ backgroundColor: `${tagMeta.color}1a`, color: tagMeta.color }}
        >
          {tagMeta.label}
        </span>
      )}

      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary-soft)]">
          <Icon name="Sparkles" size={20} className="text-[var(--color-primary)]" />
        </div>
        <div className="min-w-0 flex-1 pr-16">
          <h3 className="text-base font-bold text-[var(--color-fg)]">{resource.name}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <TypeBadge type={resource.type} />
            <StatusBadge status={resource.status} />
            <ResourceFlags resource={resource} />
          </div>
        </div>
      </div>

      {/* 推荐理由 */}
      <div className="mt-3 rounded-lg bg-[var(--color-primary-soft)] p-3">
        <p className="flex items-start gap-2 text-sm leading-relaxed text-[var(--color-fg)]">
          <Icon name="Quote" size={14} className="mt-0.5 shrink-0 text-[var(--color-primary)]" />
          <span>{item.reason}</span>
        </p>
      </div>

      {/* 简介 */}
      <p className="mt-3 line-clamp-2 text-sm text-[var(--color-muted)]">{resource.summary}</p>

      {/* 操作按钮 */}
      <div className="mt-4 flex gap-2">
        <a
          className="btn btn-primary btn-sm flex-1"
          href={safeHref(resource.url)}
          target="_blank"
          rel="noreferrer"
        >
          <Icon name="ExternalLink" size={14} /> 立即访问
        </a>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => navigate(`/resource/${resource.id}`)}
        >
          <Icon name="Info" size={14} /> 详情
        </button>
      </div>
    </div>
  );
}

export function WeeklyPicksPage() {
  const [currentIssue, setCurrentIssue] = useState(getLatestPick().issue);
  const [resources, setResources] = useState<Record<string, Resource | null>>({});
  const [loadedIssue, setLoadedIssue] = useState<string>('');

  const currentPick: WeeklyPick = weeklyPicks.find((p) => p.issue === currentIssue) ?? getLatestPick();
  const loading = loadedIssue !== currentIssue;

  useEffect(() => {
    let m = true;
    const load = async () => {
      const res = await Promise.all(currentPick.items.map((item) => getResource(item.resourceId)));
      if (!m) return;
      const map: Record<string, Resource | null> = {};
      currentPick.items.forEach((item, i) => {
        map[item.resourceId] = res[i];
      });
      setResources(map);
      setLoadedIssue(currentIssue);
    };
    load();
    return () => {
      m = false;
    };
  }, [currentIssue, currentPick, currentPick.items]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* 页头 */}
      <div className="card p-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-[var(--color-fg)]">
          <Icon name="Sparkles" size={22} className="text-[var(--color-primary)]" />
          每周精选
        </h1>
        <p className="mt-3 leading-relaxed text-[var(--color-muted)]">
          每周精选高质量免费 AI 资源，编辑亲测推荐，帮你发现真正好用的工具。
        </p>
      </div>

      {/* 期数选择器 */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {weeklyPicks.map((p) => (
          <button
            key={p.issue}
            onClick={() => setCurrentIssue(p.issue)}
            className={`shrink-0 rounded-xl border px-4 py-2.5 text-left transition-all ${
              currentIssue === p.issue
                ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)]'
                : 'border-[var(--color-border)] hover:border-[var(--color-primary)]'
            }`}
          >
            <p className={`text-sm font-semibold ${currentIssue === p.issue ? 'text-[var(--color-primary)]' : 'text-[var(--color-fg)]'}`}>
              {p.title}
            </p>
            <p className="mt-0.5 text-xs text-[var(--color-muted)]">{fmtDate(p.date)}</p>
          </button>
        ))}
      </div>

      {/* 本期导语 */}
      <div className="rounded-xl border border-[var(--color-primary)] bg-[var(--color-primary-soft)] p-4">
        <p className="text-sm leading-relaxed text-[var(--color-fg)]">{currentPick.intro}</p>
      </div>

      {/* 精选列表 */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card h-48 animate-pulse p-5">
              <div className="h-6 w-1/3 rounded bg-[var(--color-border)]" />
              <div className="mt-4 h-4 w-2/3 rounded bg-[var(--color-border)]" />
              <div className="mt-2 h-4 w-1/2 rounded bg-[var(--color-border)]" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {currentPick.items.map((item, i) => (
            <PickCard
              key={item.resourceId}
              item={item}
              resource={resources[item.resourceId] ?? null}
              index={i}
            />
          ))}
        </div>
      )}

      {/* 底部说明 */}
      <div className="text-center text-xs text-[var(--color-muted)]">
        共 {weeklyPicks.length} 期精选 · 每周一更新 · 资源状态以实际访问为准
      </div>
    </div>
  );
}
