import type { Resource } from '@/lib/types';
import { useT } from '@/i18n/useI18n';
import { isNonFree, isOfficial, needsOverseas } from '@/lib/resourceFlags';

/**
 * 统一资源标记徽章：在卡片/详情/列表复用。
 *  - 官方（紫）：official 项，明确区别于社区免费资源
 *  - 非免费（红）：type !== free，免费类板块必须显式标注
 *  - 需代理（橙）：needsOverseas，提示需海外网络/代理
 * 无任何标记时返回 null（不占布局）。
 */
export function ResourceFlags({ resource, className = '' }: { resource: Resource; className?: string }) {
  const t = useT();
  const badges: { label: string; color: string }[] = [];
  if (isOfficial(resource)) badges.push({ label: t('common.official'), color: '#6366f1' });
  if (isNonFree(resource)) badges.push({ label: t('card.nonFree'), color: '#ef4444' });
  if (needsOverseas(resource)) badges.push({ label: t('card.overseas'), color: '#f59e0b' });
  if (!badges.length) return null;
  return (
    <span className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {badges.map((b) => (
        <span key={b.label} className="badge" style={{ color: b.color, background: `${b.color}1a` }}>
          {b.label}
        </span>
      ))}
    </span>
  );
}
