import type { CSSProperties } from 'react';
import { memo } from 'react';
import type { Resource } from '@/lib/types';
import { useT } from '@/i18n/useI18n';
import { navigate } from '@/hooks/useHashRoute';
import { getSubType } from '@/data/taxonomy';
import { useFavoritesStore } from '@/store/useFavoritesStore';
import { displayTags } from '@/lib/tags';
import { fmtDate } from '@/lib/format';
import { useReport } from '@/hooks/useReport';
import { Icon } from './Icon';
import { SoftIcon } from './SoftIcon';
import { StatusBadge, TypeBadge } from './Badge';
import { ResourceFlags } from './ResourceFlags';
import { VerifyWidget } from './VerifyWidget';
import { VisitDetailButtons } from './VisitDetailButtons';

/**
 * 列表行形态（信息密集行，3 层结构）：
 *   L1 图标 + 标题 + 标记徽章 + 状态/类型（官方 ✓ 不再重复画，ResourceFlags 唯一出口）
 *   L2 标签（.tag 统一皮肤）+ 摘要单行 + meta（更新/收藏/反馈）
 *   L3 操作行：验证投票 + 访问(主)/详情(次)
 */
export const ResourceRow = memo(function ResourceRow({ resource, index = 0 }: { resource: Resource; index?: number }) {
  const t = useT();
  const cat = getSubType(resource.subType);
  const fav = useFavoritesStore((s) => s.ids.includes(resource.id));
  const toggleFav = useFavoritesStore((s) => s.toggle);
  const report = useReport(resource);

  return (
    <div className="card card-hover card-in p-4" style={{ ['--i' as string]: index } as CSSProperties}>
      <div className="flex items-start gap-3">
        <SoftIcon icon={cat?.icon} color={cat?.color} size={19} className="h-10 w-10" rounded="rounded-lg" />
        <div className="min-w-0 flex-1">
          {/* L1 标题行：名称 + 标记徽章 + 状态/类型徽章 */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              className="text-left font-semibold leading-snug text-[var(--color-fg)] hover:text-[var(--color-primary)]"
              onClick={() => navigate(`/resource/${resource.id}`)}
            >
              {resource.name}
            </button>
            <ResourceFlags resource={resource} />
            <span className="hidden sm:inline-flex">
              <StatusBadge status={resource.status} />
            </span>
            <span className="hidden md:inline-flex">
              <TypeBadge type={resource.type} />
            </span>
          </div>
          {/* L2 标签（统一 .tag 皮肤）+ 摘要 + meta */}
          {displayTags(resource.tags).length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {displayTags(resource.tags).slice(0, 4).map((tag) => (
                <span key={tag} className="tag">
                  {tag}
                </span>
              ))}
            </div>
          )}
          <p className="mt-1.5 truncate text-sm text-[var(--color-muted)]">{resource.summary || resource.description}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--color-muted)]">
            {resource.updatedAt && (
              <span className="inline-flex items-center gap-1">
                <Icon name="Clock" size={12} />
                {t('card.updated')} {fmtDate(resource.updatedAt)}
              </span>
            )}
            <span className="flex items-center gap-3">
              <button
                onClick={() => toggleFav(resource.id)}
                className="inline-flex min-h-[36px] items-center gap-1 transition-colors hover:text-[var(--color-primary)]"
                aria-label={t('detail.favorite')}
                aria-pressed={fav}
              >
                <Icon name="Heart" size={13} fill={fav ? 'var(--color-primary)' : 'none'} color={fav ? 'var(--color-primary)' : undefined} />
                {fav ? t('detail.unfavorite') : t('detail.favorite')}
              </button>
              <button
                onClick={() => report.open()}
                className="inline-flex min-h-[36px] items-center gap-1 transition-colors hover:text-[var(--color-warning)]"
                aria-label={t('report.button')}
              >
                <Icon name="AlertTriangle" size={13} />
                {t('report.button')}
              </button>
            </span>
          </div>
        </div>
      </div>

      {/* L3 操作行：出站访问是首要动作（主按钮），详情为次 */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <VerifyWidget resourceId={resource.id} />
        <div className="ml-auto flex items-center gap-2">
          <VisitDetailButtons resource={resource} />
        </div>
      </div>

      {report.node}
    </div>
  );
});
