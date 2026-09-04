import { useT } from '@/i18n/useI18n';

/**
 * 健康检查状态展示组件
 * 显示最后检查时间和检查结果统计
 */
export function HealthCheckStatus({
  lastCheckTime,
  okCount,
  unstableCount,
  deadCount,
  total,
}: {
  lastCheckTime: string;
  okCount: number;
  unstableCount: number;
  deadCount: number;
  total: number;
}) {
  const t = useT();

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
      <div className="flex items-center justify-between text-xs text-[var(--color-muted)]">
        <span>{t('status.lastUpdated')} {lastCheckTime}</span>
        <span className="font-mono">
          {okCount} {t('status.ok')} · {unstableCount} {t('status.unstable')} · {deadCount} {t('status.dead')} · {total} {t('common.all')}
        </span>
      </div>
    </div>
  );
}
