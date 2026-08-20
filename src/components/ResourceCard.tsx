import { type CSSProperties, useState, memo } from 'react';
import type { Resource } from '@/lib/types';
import { useT, useLocalize } from '@/i18n/useI18n';
import { navigate } from '@/hooks/useHashRoute';
import { getSubType } from '@/data/taxonomy';
import { useFavoritesStore } from '@/store/useFavoritesStore';
import { useToastStore } from '@/store/useToastStore';
import { submitReport } from '@/lib/data';
import { displayTags } from '@/lib/tags';
import { Icon } from './Icon';
import { StatusBadge, TypeBadge } from './Badge';
import { ResourceFlags } from './ResourceFlags';
import { ReportModal } from './ReportModal';
import { VerifyWidget } from './VerifyWidget';

/** 把 ISO 日期或短日期统一显示为 MM-DD（「更新 08-04」） */
function fmtUpdatedAt(s?: string): string {
  if (!s) return '';
  const m = s.match(/^\d{4}-(\d{2}-\d{2})/);
  return m ? m[1] : s.slice(0, 5);
}

export const ResourceCard = memo(function ResourceCard({ resource, index = 0 }: { resource: Resource; index?: number }) {
  const t = useT();
  const localize = useLocalize();
  const cat = getSubType(resource.subType);
  const fav = useFavoritesStore((s) => s.ids.includes(resource.id));
  const toggleFav = useFavoritesStore((s) => s.toggle);
  const [showReport, setShowReport] = useState(false);
  const push = useToastStore((s) => s.push);

  const copyUrl = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(resource.url);
      push(t('detail.copied'), 'success');
    } catch {
      push(resource.url, 'info');
    }
  };

  return (
    <div
      className="card card-hover ink-hover card-in flex flex-col p-4"
      style={{ ['--i' as string]: index } as CSSProperties}
    >
      <div className="flex items-start gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ background: `${cat?.color ?? '#888'}1a`, color: cat?.color }}
        >
          <Icon name={cat?.icon ?? 'Globe'} size={20} />
        </span>
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
          onClick={(e) => { e.stopPropagation(); setShowReport(true); }}
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
            {t('card.updated')} {fmtUpdatedAt(resource.updatedAt)}
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

      {showReport && (
        <ReportModal
          resourceName={resource.name}
          resourceId={resource.id}
          onClose={() => setShowReport(false)}
          onSubmit={async (id, reason, note) => {
            const res = await submitReport(id, reason, note);
            return res.ok;
          }}
        />
      )}
    </div>
  );
});
