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

/**
 * 列表行形态（信息密集行）：横向图标 + 标题/徽章/标签/摘要 + 底部操作。
 * 与 ResourceCard（网格卡）并存，由 ResourceList 的「网格/列表」视图切换使用。
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
          {/* 标题行：名称 + 官方标 + 状态/类型徽章 */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              className="text-left font-semibold leading-snug text-[var(--color-fg)] hover:text-[var(--color-primary)]"
              onClick={() => navigate(`/resource/${resource.id}`)}
            >
              {resource.name}
            </button>
            {resource.official && <Icon name="Check" size={14} className="shrink-0 text-[var(--color-primary)]" />}
            <ResourceFlags resource={resource} />
            <span className="hidden sm:inline-flex">
              <StatusBadge status={resource.status} />
            </span>
            <span className="hidden md:inline-flex">
              <TypeBadge type={resource.type} />
            </span>
          </div>
          {/* 标签 chips：剔除自报评分/可用率噪声标签 */}
          {displayTags(resource.tags).length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {displayTags(resource.tags).slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-md border border-[var(--color-border)] px-1.5 py-0.5 text-[0.7rem] text-[var(--color-muted)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          {/* 摘要：列表行单行截断，信息优先 */}
          <p className="mt-1.5 truncate text-sm text-[var(--color-muted)]">{resource.summary || resource.description}</p>
          {/* 底部 meta：更新 + 验证 + 收藏/反馈 */}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--color-muted)]">
            {resource.updatedAt && (
              <span className="inline-flex items-center gap-1">
                <Icon name="Clock" size={12} />
                {t('card.updated')} {fmtDate(resource.updatedAt)}
              </span>
            )}
            <span className="flex items-center gap-2">
              <button
                onClick={() => toggleFav(resource.id)}
                className="inline-flex items-center gap-1 transition-colors hover:text-[var(--color-primary)]"
                aria-label={t('detail.favorite')}
              >
                <Icon name="Heart" size={13} fill={fav ? 'var(--color-primary)' : 'none'} color={fav ? 'var(--color-primary)' : undefined} />
                {fav ? t('detail.unfavorite') : t('detail.favorite')}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); report.open(); }}
                className="inline-flex items-center gap-1 transition-colors hover:text-orange-500"
                aria-label={t('report.button')}
              >
                <Icon name="AlertTriangle" size={13} />
                {t('report.button')}
              </button>
            </span>
          </div>
        </div>
      </div>

      {/* 操作行：验证投票 + 详情/访问 */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <VerifyWidget resourceId={resource.id} />
        <div className="ml-auto flex items-center gap-2">
          <button className="btn btn-primary btn-sm flex-1 sm:flex-none" onClick={() => navigate(`/resource/${resource.id}`)}>
            {t('common.viewDetail')}
          </button>
          <a className="btn btn-ghost btn-sm flex-1 sm:flex-none" href={resource.url} target="_blank" rel="noreferrer">
            <Icon name="ExternalLink" size={14} />
            {t('common.visit')}
          </a>
        </div>
      </div>

      {report.node}
    </div>
  );
});
