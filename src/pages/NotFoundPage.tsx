import { useT } from '@/i18n/useI18n';
import { navigate } from '@/hooks/useHashRoute';
import { Icon } from '@/components/Icon';

/** 404 页面：路由未匹配时展示 */
export function NotFoundPage() {
  const t = useT();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
      <div
        className="flex h-20 w-20 items-center justify-center rounded-2xl text-4xl font-black"
        style={{
          background: 'var(--color-primary-soft)',
          color: 'var(--color-primary)',
        }}
      >
        404
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-bold text-[var(--color-fg)]">{t('notfound.title')}</h2>
        <p className="text-sm text-[var(--color-muted)]">{t('notfound.desc')}</p>
      </div>

      <button
        className="btn btn-primary"
        onClick={() => navigate('/home')}
      >
        <Icon name="Home" size={16} />
        {t('nav.home')}
      </button>
    </div>
  );
}
