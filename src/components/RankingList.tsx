import type { Resource } from '@/lib/types';
import { useT, useLocalize } from '@/i18n/useI18n';
import { navigate } from '@/hooks/useHashRoute';
import { getSubType } from '@/data/taxonomy';
import { Icon } from './Icon';

// 热度评分：编辑人气(0-100) 为主信号，辅以编辑精选、更新新鲜度与标签丰富度。
// 三者均为静态、全局、可解释；后续接入后端（Supabase）可平滑替换为收藏数/点击量等真实信号。
function daysSince(iso?: string): number {
  if (!iso) return 999;
  const d = Date.parse(iso);
  if (Number.isNaN(d)) return 999;
  return Math.max(0, (Date.now() - d) / 86_400_000);
}
export function hotScore(r: Resource): number {
  const featured = r.featured ? 40 : 0;
  const fresh = Math.max(0, 30 - daysSince(r.updatedAt));
  const tagBoost = Math.min(r.tags?.length ?? 0, 5);
  const popularity = Math.max(0, Math.min(r.popularity ?? 0, 100));
  return popularity + featured + fresh + tagBoost;
}

export function RankingList({ resources, limit = 8, excludeOfficial = true }: { resources: Resource[]; limit?: number; excludeOfficial?: boolean }) {
  const t = useT();
  const localize = useLocalize();
  // 热门榜默认去官方内容（官方类默认非免费，避免与社区免费资源混淆）
  const top = resources
    .filter((r) => !excludeOfficial || !r.official)
    .sort((a, b) => hotScore(b) - hotScore(a))
    .slice(0, limit);
  if (!top.length) return null;

  return (
    <section>
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[var(--color-fg)]">
        <Icon name="TrendingUp" size={18} className="text-[var(--color-primary)]" /> {t('ranking.title')}
      </h2>
      {/* 纵向列表行：行宽充足，标题/分类完整展示 */}
      <div className="space-y-2">
        {top.map((r, i) => {
          const st = getSubType(r.subType);
          return (
            <button
              key={r.id}
              onClick={() => navigate(`/resource/${r.id}`)}
              className="card card-hover flex w-full items-center gap-3 p-3 text-left sm:p-4"
              style={{ ['--i' as string]: i }}
            >
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold"
                style={{ background: i < 3 ? 'var(--color-primary-soft)' : 'var(--color-border)', color: i < 3 ? 'var(--color-primary)' : 'var(--color-muted)' }}
              >
                {i + 1}
              </span>
              {i < 3 && <Icon name="Flame" size={15} className="shrink-0 text-orange-500" />}
              <span className="min-w-0 flex-1 font-medium leading-snug text-[var(--color-fg)]">{r.name}</span>
              {st && <span className="chip shrink-0" data-active={false}>{localize(st.name)}</span>}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-[var(--color-muted)]">{t('ranking.basedOn')}</p>
    </section>
  );
}
