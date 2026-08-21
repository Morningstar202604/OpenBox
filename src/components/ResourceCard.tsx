import { type CSSProperties, memo } from 'react';
import type { Resource } from '@/lib/types';
import { useT, useLocalize } from '@/i18n/useI18n';
import { navigate } from '@/hooks/useHashRoute';
import { getSubType } from '@/data/taxonomy';
import { useFavoritesStore } from '@/store/useFavoritesStore';
import { useToastStore } from '@/store/useToastStore';
import { displayTags } from '@/lib/tags';
import { fmtDate } from '@/lib/format';
import { copyText } from '@/lib/clipboard';
import { useReport } from '@/hooks/useReport';
import { Icon } from './Icon';
import { SoftIcon } from './SoftIcon';
import { StatusBadge, TypeBadge } from './Badge';
import { ResourceFlags } from './ResourceFlags';
import { VerifyWidget } from './VerifyWidget';

export const ResourceCard = memo(function ResourceCard({ resource, index = 0 }: { resource: Resource; index?: number }) {
  const t = useT();
  const localize = useLocalize();
  const cat = getSubType(resource.subType);
  const fav = useFavoritesStore((s) => s.ids.includes(resource.id));
  const toggleFav = useFavoritesStore((s) => s.toggle);
  const report = useReport(resource);
  const push = useToastStore((s) => s.push);

  const copyUrl = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (await copyText(resource.url)) push(t('detail.copied'), 'success');
    else push(resource.url, 'info');
  };

  return (
    <div
      className="card card-hover ink-hover card-in flex flex-col p-4"
      style={{ ['--i' as string]: index } as CSSProperties}
    >
      <div className="flex items-start gap-3">
        <SoftIcon icon={cat?.icon} color={cat?.color} size={20} className="h-10 w-10" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <button
              className="text-left font-semibold leading-snug text-[var(--color-fg)] hover:text-[var(--color-primary)]"
              onClick={() => navigate(`/resource/${resource.id}`)}
            >
              {resource.name}
            </button>
            {resource.official && (
              <Icon name="Check" size={14} className="shrink-0 text-[var(--color-primary)]" />
            )}
          </div>
          <p className="text-xs leading-snug text-[var(--color-muted)]">{cat ? localize(cat.name) : ''}</p>
        </div>
        <button
          onClick={() => toggleFav(resource.id)}
          aria-label={t('detail.favorite')}
          className="shrink-0 text-[var(--color-muted)] transition-colors hover:text-[var(--color-primary)]"
        >
          <Icon name="Heart" size={18} fill={fav ? 'var(--color-primary)' : 'none'} color={fav ? 'var(--color-primary)' : undefined} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); report.open(); }}
          aria-label={t('report.button')}
          className="shrink-0 text-[var(--color-muted)] transition-colors hover:text-orange-500"
          title={t('report.button')}
        >
          <Icon name="AlertTriangle" size={17} />
        </button>
      </div>

      {/* 一句话定位（名称｜定位）作为卡片核心钩子，全尺寸可见、强对比 */}
      <p className="mt-3 line-clamp-2 text-sm font-medium leading-relaxed text-[var(--color-fg)]">
        {resource.summary || resource.description}
      </p>

      {/* 官方 / 非免费 / 需代理 标记：免费类板块一眼甄别 */}
      <ResourceFlags resource={resource} />

      {/* 类型/状态/标签：全尺寸可见，不再在移动端隐藏 */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <TypeBadge type={resource.type} />
        <StatusBadge status={resource.status} />
        {displayTags(resource.tags).slice(0, 3).map((tag) => (
          <span key={`d-${tag}`} className="chip" data-active={false}>
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-3">
        <VerifyWidget resourceId={resource.id} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {resource.updatedAt && (
          <span
            className="mr-auto inline-flex items-center gap-1 text-xs text-[var(--color-muted)]"
            title={resource.updatedAt}
          >
            <Icon name="Clock" size={13} />
            {t('card.updated')} {fmtDate(resource.updatedAt)}
          </span>
        )}
        <button className="btn btn-primary btn-sm flex-1" onClick={() => navigate(`/resource/${resource.id}`)}>
          {t('common.viewDetail')}
        </button>
        <a className="btn btn-ghost btn-sm hidden sm:inline-flex" href={resource.url} target="_blank" rel="noreferrer">
          <Icon name="ExternalLink" size={15} />
          {t('common.visit')}
        </a>
        <button className="btn btn-ghost btn-sm hidden sm:inline-flex" onClick={copyUrl} title={t('detail.copy')}>
          <Icon name="Copy" size={15} />
        </button>
      </div>

      {report.node}
    </div>
  );
});
