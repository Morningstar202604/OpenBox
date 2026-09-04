import { useEffect, useMemo, useState } from 'react';
import type { Resource } from '@/lib/types';
import { useT, useLocalize } from '@/i18n/useI18n';
import { navigate } from '@/hooks/useHashRoute';
import { getAllSubTypes } from '@/data/taxonomy';
import { Icon } from './Icon';
import { scoreResource } from '@/lib/ranking';
import { getVerificationStatsBatch } from '@/lib/data';
import { needsOverseas } from '@/lib/resourceFlags';

interface BoardRow {
  r: Resource;
  total: number;
  ok: number;
  dead: number;
}

/**
 * 多榜单切换：横向子类型 tab，每个 tab 是一个竖向榜单。
 * - 榜单按「混合多维评分」排序。
 * - 默认展示前 5，可「展开全部 / 收起」查看完整榜单。
 * - 首页与排行榜页复用同一组件（home 模式默认折叠，page 模式默认展开 + hideHeader 去重复页头）。
 */
export function RankingBoard({ resources, expanded = false, hideHeader = false }: { resources: Resource[]; expanded?: boolean; hideHeader?: boolean }) {
  const t = useT();
  const localize = useLocalize();

  // 按子类型分组（仅含确有资源的子类型，按 taxonomy sort 顺序）
  const groups = useMemo(() => {
    const bySub: Record<string, Resource[]> = {};
    for (const r of resources) (bySub[r.subType] ??= []).push(r);
    return getAllSubTypes()
      .filter((st) => bySub[st.slug]?.length)
      .map((st) => ({ subType: st, items: bySub[st.slug] }));
  }, [resources]);

  const [active, setActive] = useState<string | null>(null);
  const [stats, setStats] = useState<Record<string, { ok: number; dead: number }>>({});
  const [isExpanded, setExpanded] = useState(expanded);

  // 派生生效 tab：用户未选或所选子类型在 groups 中不存在时回退到第一个
  const activeSlug =
    active && groups.some((g) => g.subType.slug === active) ? active : (groups[0]?.subType.slug ?? '');

  // 取当前榜单资源的社区验证统计
  const current = groups.find((g) => g.subType.slug === activeSlug);
  useEffect(() => {
    if (!current) return;
    let m = true;
    getVerificationStatsBatch(current.items.map((r) => r.id))
      .then((map) => {
        if (m) setStats(map);
      })
      .catch(() => {});
    return () => { m = false; };
  }, [current]);

  const rows: BoardRow[] = useMemo(() => {
    if (!current) return [];
    return current.items
      .map((r) => ({
        r,
        ...(() => {
          const s = stats[r.id];
          return {
            total: scoreResource(r, s ? { verifyOk: s.ok, verifyDead: s.dead } : undefined).total,
            ok: s?.ok ?? 0,
            dead: s?.dead ?? 0,
          };
        })(),
      }))
      .sort((a, b) => b.total - a.total);
  }, [current, stats]);

  if (!groups.length) return null;
  const visible = isExpanded ? rows : rows.slice(0, 5);

  return (
    <section>
      {!hideHeader && (
        <div className="mb-4 flex items-center gap-2">
          <Icon name="BarChart3" size={18} className="text-[var(--color-primary)]" />
          <h2 className="text-lg font-semibold text-[var(--color-fg)]">{t('ranking.boardTitle')}</h2>
          <span className="text-xs text-[var(--color-muted)]">{t('ranking.boardHint')}</span>
        </div>
      )}

      {/* 横向子类型 tab */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1.5 [scrollbar-width:thin]" role="tablist" aria-label={t('ranking.boardTitle')}>
        {groups.map((g) => {
          const st = g.subType;
          const on = st.slug === activeSlug;
          return (
            <button
              key={st.slug}
              role="tab"
              aria-selected={on}
              onClick={() => { setActive(st.slug); setExpanded(true); }}
              className="chip shrink-0 transition-colors"
              data-active={on}
              style={on ? undefined : { borderColor: st.color + '55', color: st.color }}
            >
              {localize(st.name)}
              <span className="ml-1 text-[11px] opacity-70">{g.items.length}</span>
            </button>
          );
        })}
      </div>

      {/* 当前子类型榜单 */}
      {current && (
        <>
          <div className="mb-3 flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-[var(--color-fg)]">{t('ranking.subTypeTitle')}</span>
              <span className="tag shrink-0">{localize(current.subType.name)}</span>
              <span className="text-xs text-[var(--color-muted)]">· {current.items.length}</span>
            </div>
            <button onClick={() => setExpanded((v) => !v)} className="btn btn-ghost btn-sm text-xs">
              <Icon name={isExpanded ? 'ChevronUp' : 'ChevronDown'} size={14} />
              {isExpanded ? t('ranking.collapse') : t('ranking.expandAll')}
            </button>
          </div>

          <div className="space-y-2">
            {visible.map((row, i) => {
              const { r } = row;
              const official = r.official;
              const overseas = needsOverseas(r);
              // 生成展示标签：免费度 + 官方/社区 + 海外/国内（最多3个）
              const tagList: string[] = [];
              if (r.type === 'free') tagList.push(t('common.free'));
              else if (r.type === 'freemium') tagList.push(t('common.freemium'));
              if (official) tagList.push(t('filter.official'));
              else tagList.push(t('filter.community'));
              if (overseas) tagList.push(t('filter.overseas'));
              else tagList.push(t('filter.domestic'));
              const displayTags = tagList.slice(0, 3);

              return (
                <button
                  key={row.r.id}
                  onClick={() => navigate(`/resource/${row.r.id}`)}
                  className="card card-hover flex w-full items-center gap-3 p-3 text-left sm:p-4"
                >
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold"
                    style={{ background: i < 3 ? 'var(--color-primary-soft)' : 'var(--color-border)', color: i < 3 ? 'var(--color-primary)' : 'var(--color-muted)' }}
                  >
                    {i + 1}
                  </span>
                  {i < 3 && <Icon name="Flame" size={15} className="shrink-0 text-[var(--color-warning)]" />}
                  <span className="min-w-0 flex-1 truncate font-medium leading-snug text-[var(--color-fg)]">{row.r.name}</span>
                  <div className="flex shrink-0 items-center gap-1.5 flex-wrap justify-end">
                    {displayTags.map((tag, ti) => (
                      <span
                        key={ti}
                        className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                          official
                            ? 'bg-[var(--color-border)] text-[var(--color-muted)]'
                            : 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                        }`}
                      >
                        {tag}
                      </span>
                    ))}
                    {!official && (
                      <span className="shrink-0 rounded-lg bg-[var(--color-primary)] px-2 py-0.5 text-sm font-bold text-[var(--color-primary-fg)]">
                        {row.total}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {rows.length > 5 && (
            <button className="btn btn-ghost btn-sm mt-3 w-full justify-center" onClick={() => setExpanded((v) => !v)}>
              <Icon name={isExpanded ? 'ChevronUp' : 'ChevronDown'} size={15} />
              {isExpanded ? t('ranking.collapse') : t('ranking.expandAll')} ({rows.length})
            </button>
          )}
        </>
      )}
    </section>
  );
}
