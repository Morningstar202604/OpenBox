import { useEffect, useMemo, useState } from 'react';
import type { Resource } from '@/lib/types';
import { useT, useLocalize } from '@/i18n/useI18n';
import { navigate } from '@/hooks/useHashRoute';
import { getAllSubTypes, getSubType } from '@/data/taxonomy';
import { Icon } from './Icon';
import { scoreResource } from '@/lib/ranking';
import { getVerificationStats } from '@/lib/data';

const MEDALS = ['🥇', '🥈', '🥉'];

interface BoardRow {
  r: Resource;
  total: number;
  ok: number;
  dead: number;
}

/**
 * 多榜单切换（网易云式）：横向子类型 tab，每个 tab 是一个竖向榜单。
 * - 榜单按「混合多维评分」(scoreResource) 排序，官方内容一并参与、以徽标区分（排行榜 ≠ 精选推荐，不排除官方）。
 * - 默认展示前 5，可「展开全部 / 收起」查看完整榜单。
 * - 首页与排行榜页复用同一组件（home 模式默认折叠，page 模式默认展开）。
 */
export function RankingBoard({ resources, expanded = false }: { resources: Resource[]; expanded?: boolean }) {
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

  // 派生生效 tab：用户未选或所选子类型在 groups 中不存在时回退到第一个，
  // 无需 effect 同步 setState（消除级联渲染警告）
  const activeSlug =
    active && groups.some((g) => g.subType.slug === active) ? active : (groups[0]?.subType.slug ?? '');

  // 取当前榜单资源的社区验证统计（真实信号，用于混合评分 + 展示）
  const current = groups.find((g) => g.subType.slug === activeSlug);
  useEffect(() => {
    if (!current) return;
    let m = true;
    Promise.all(
      current.items.map((r) =>
        getVerificationStats(r.id)
          .then((s) => [r.id, { ok: s.ok, dead: s.dead }] as const)
          .catch(() => [r.id, { ok: 0, dead: 0 }] as const),
      ),
    ).then((entries) => {
      if (m) setStats(Object.fromEntries(entries));
    });
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
      <div className="mb-4 flex items-center gap-2">
        <Icon name="BarChart3" size={18} className="text-[var(--color-primary)]" />
        <h2 className="text-lg font-semibold text-[var(--color-fg)]">{t('ranking.boardTitle')}</h2>
        <span className="text-xs text-[var(--color-muted)]">{t('ranking.boardHint')}</span>
      </div>

      {/* 横向子类型 tab（可滚动切换） */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1.5 [scrollbar-width:thin]">
        {groups.map((g) => {
          const st = g.subType;
          const on = g.subType.slug === activeSlug;
          return (
            <button
              key={st.slug}
              onClick={() => { setActive(st.slug); setExpanded(expanded); }}
              className="chip shrink-0 transition-colors"
              data-active={on}
              style={on ? { background: st.color, color: '#fff', borderColor: st.color } : { borderColor: st.color + '55', color: st.color }}
            >
              {localize(st.name)}
              <span className="ml-1 text-[11px] opacity-70">{g.items.length}</span>
            </button>
          );
        })}
      </div>

      {/* 竖向榜单 */}
      <div className="space-y-2">
        {visible.map((row, i) => {
          const st = getSubType(row.r.subType);
          const verified = row.ok + row.dead > 0;
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
                {MEDALS[i] ?? i + 1}
              </span>
              {i < 3 && <Icon name="Flame" size={15} className="shrink-0 text-orange-500" />}
              <span className="min-w-0 flex-1 font-medium leading-snug text-[var(--color-fg)]">{row.r.name}</span>
              {st && <span className="chip shrink-0" data-active={false}>{localize(st.name)}</span>}
              {verified && (
                <span className="hidden shrink-0 items-center gap-1 text-xs text-[var(--color-muted)] sm:inline-flex">
                  <Icon name="Users" size={12} /> {row.ok + row.dead}
                </span>
              )}
              <span className="shrink-0 rounded-lg bg-[var(--color-primary)] px-2 py-0.5 text-sm font-bold text-[var(--color-primary-fg)]">{row.total}</span>
            </button>
          );
        })}
      </div>

      {/* 展开 / 收起 */}
      {rows.length > 5 && (
        <button className="btn btn-ghost btn-sm mt-3 w-full justify-center" onClick={() => setExpanded((v) => !v)}>
          <Icon name={isExpanded ? 'ChevronUp' : 'ChevronDown'} size={15} />
          {isExpanded ? t('ranking.collapse') : t('ranking.expandAll')} ({rows.length})
        </button>
      )}
    </section>
  );
}
