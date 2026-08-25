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
import { VisitDetailButtons } from './VisitDetailButtons';

/**
 * 网格卡（4 层信息架构）：
 *   L1 身份：图标 + 标题（官方标记由 ResourceFlags 统一展示，不再重复画 ✓）
 *   L2 钩子：一句话摘要
 *   L3 信号：类型/状态徽章 + 至多 3 枚标签（.tag 纯展示）
 *   L4 操作：更新时间 ··· 访问(主) + 详情(次) + 复制
 * 收藏/举报为 36px 命中区图标钮。
 */
export const ResourceCard = memo(function ResourceCard({ resource, index = 0 }: { resource: Resource; index?: number }) {
  const t = useT();
  const localize = useLocalize();
  const cat = getSubType(resource.subType);
  const fav = useFavoritesStore((s) => s.ids.includes(resource.id));
  const toggleFav = useFavoritesStore((s) => s.toggle);
  const report = useReport(resource);
  const push = useToastStore((s) => s.push);

  const copyUrl = async () => {
    if (await copyText(resource.url)) push(t('detail.copied'), 'success');
    else push(resource.url, 'info');
  };

  return (
    <div
      className="card card-hover ink-hover card-in flex flex-col p-4"
      style={{ ['--i' as string]: index } as CSSProperties}
    >
      {/* L1 身份 */}
      <div className="flex items-start gap-3">
        <SoftIcon icon={cat?.icon} color={cat?.color} size={20} className="h-10 w-10" />
        <div className="min-w-0 flex-1">
          <button
            className="text-left font-semibold leading-snug text-[var(--color-fg)] hover:text-[var(--color-primary)]"
            onClick={() => navigate(`/resource/${resource.id}`)}
          >
            {resource.name}
          </button>
          <p className="text-xs leading-snug text-[var(--color-muted)]">{cat ? localize(cat.name) : ''}</p>
        </div>
        <button
          onClick={() => toggleFav(resource.id)}
          aria-label={t('detail.favorite')}
          aria-pressed={fav}
          className="flex h-9 w-9 shrink-0 items-center justify-center text-[var(--color-muted)] transition-colors hover:text-[var(--color-primary)]"
        >
          <Icon name="Heart" size={18} fill={fav ? 'var(--color-primary)' : 'none'} color={fav ? 'var(--color-primary)' : undefined} />
        </button>
        <button
          onClick={() => report.open()}
          aria-label={t('report.button')}
          title={t('report.button')}
          className="flex h-9 w-9 shrink-0 items-center justify-center text-[var(--color-muted)] transition-colors hover:text-[var(--color-warning)]"
        >
          <Icon name="AlertTriangle" size={17} />
        </button>
      </div>

      {/* L2 钩子：一句话定位，全尺寸可见、强对比 */}
      <p className="mt-3 line-clamp-2 text-sm font-medium leading-relaxed text-[var(--color-fg)]">
        {resource.summary || resource.description}
      </p>

      {/* L3 信号：标记徽章（官方/非免费/需代理）+ 类型/状态 + 标签 */}
      <div className="mt-2.5">
        <ResourceFlags resource={resource} />
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <TypeBadge type={resource.type} />
        <StatusBadge status={resource.status} />
        {displayTags(resource.tags).slice(0, 3).map((tag) => (
          <span key={`d-${tag}`} className="tag">
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-3">
        <VerifyWidget resourceId={resource.id} />
      </div>

      {/* L4 操作：出站访问是导航站的首要动作（主按钮），详情为次 */}
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
        <VisitDetailButtons resource={resource} />
        <button className="btn btn-ghost btn-sm hidden sm:inline-flex" onClick={copyUrl} title={t('detail.copy')} aria-label={t('detail.copy')}>
          <Icon name="Copy" size={15} />
        </button>
      </div>

      {report.node}
    </div>
  );
});
