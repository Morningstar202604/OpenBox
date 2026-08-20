import { useT, useLocalize } from '@/i18n/useI18n';
import { weeklyUpdates } from '@/data/weekly';
import { Icon } from './Icon';

// 每周更新 / 账号动态：完全由 src/data/weekly.ts 配置驱动，新增条目只改数据。
export function WeeklyUpdates() {
  const t = useT();
  const localize = useLocalize();

  return (
    <section>
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[var(--color-fg)]">
        <Icon name="Newspaper" size={18} className="text-[var(--color-primary)]" /> {t('weekly.title')}
      </h2>
      {weeklyUpdates.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">{t('weekly.empty')}</p>
      ) : (
        <div className="space-y-2">
          {weeklyUpdates.map((u) => (
            <div key={u.id} className="card card-hover flex items-start gap-3 p-3 sm:p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: 'var(--color-primary-soft)' }}>
                <Icon
                  name={u.kind === 'account' ? 'Users' : 'RefreshCw'}
                  size={16}
                  className="text-[var(--color-primary)]"
                />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <p className="font-medium leading-snug text-[var(--color-fg)]">{localize(u.title)}</p>
                  <span className="ml-auto shrink-0 text-xs text-[var(--color-muted)]">{u.date}</span>
                </div>
                {u.desc && <p className="mt-1 text-sm leading-relaxed text-[var(--color-muted)]">{localize(u.desc)}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
