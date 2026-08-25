import type { Resource } from '@/lib/types';
import { useT } from '@/i18n/useI18n';
import { isNonFree, isOfficial, needsOverseas } from '@/lib/resourceFlags';

/**
 * 统一资源标记徽章：在卡片/详情/列表复用（官方标记的唯一展示出口，
 * 卡片标题的 ✓ 已移除——同一信息只说一遍）。
 *  - 官方（靛）：official 项，明确区别于社区免费资源
 *  - 部分免费（琥珀）：freemium，有免费额度但含付费成分
 *  - 非免费（红）：trial/paid，免费类板块必须显式标注
 *  - 需代理（琥珀）：needsOverseas，提示需海外网络/代理
 * 颜色一律引用状态令牌。无任何标记时返回 null（不占布局）。
 */
export function ResourceFlags({ resource, className = '' }: { resource: Resource; className?: string }) {
  const t = useT();
  const badges: { label: string; color: string; soft: string }[] = [];
  if (isOfficial(resource)) badges.push({ label: t('common.official'), color: 'var(--color-official)', soft: 'var(--color-official-soft)' });
  if (isNonFree(resource)) {
    if (resource.type === 'freemium') badges.push({ label: t('card.freemium'), color: 'var(--color-warning)', soft: 'var(--color-warning-soft)' });
    else badges.push({ label: t('card.nonFree'), color: 'var(--color-danger)', soft: 'var(--color-danger-soft)' });
  }
  if (needsOverseas(resource)) badges.push({ label: t('card.overseas'), color: 'var(--color-warning)', soft: 'var(--color-warning-soft)' });
  if (!badges.length) return null;
  return (
    <span className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {badges.map((b) => (
        <span key={b.label} className="badge" style={{ color: b.color, background: b.soft }}>
          {b.label}
        </span>
      ))}
    </span>
  );
}
