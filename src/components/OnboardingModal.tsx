import { useState } from 'react';
import { useT } from '@/i18n/useI18n';
import { navigate } from '@/hooks/useHashRoute';
import { Icon } from './Icon';

const FLAG = 'ob_onboarded';

const STEPS = [
  { icon: 'Search', titleKey: 'onboard.s1t', descKey: 'onboard.s1d' },
  { icon: 'BarChart3', titleKey: 'onboard.s2t', descKey: 'onboard.s2d' },
  { icon: 'Star', titleKey: 'onboard.s3t', descKey: 'onboard.s3d' },
];

/** 首次访问引导（解决「拿到不会用」）。localStorage 标记只弹一次。 */
export function OnboardingModal() {
  const t = useT();
  // 直接在惰性初始化器读 localStorage：首次渲染即定结果，无需 effect 二次 setState
  const [show, setShow] = useState(() => {
    try {
      return !localStorage.getItem(FLAG);
    } catch {
      /* 隐私模式不可用时静默不弹 */
      return false;
    }
  });

  const finish = (goHome: boolean) => {
    try { localStorage.setItem(FLAG, '1'); } catch { /* ignore */ }
    setShow(false);
    if (goHome) navigate('/home');
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => finish(false)}>
      <div className="w-full max-w-md rounded-t-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)] sm:rounded-2xl sm:max-h-[90dvh] sm:overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
            <Icon name="Compass" size={20} />
          </span>
          <h2 className="text-xl font-bold text-[var(--color-fg)]">{t('onboard.title')}</h2>
        </div>

        <ol className="space-y-3">
          {STEPS.map((s, i) => (
            <li key={s.titleKey} className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary-soft)] text-sm font-bold text-[var(--color-primary)]">{i + 1}</span>
              <div>
                <p className="font-semibold text-[var(--color-fg)]">{t(s.titleKey)}</p>
                <p className="text-sm text-[var(--color-muted)]">{t(s.descKey)}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-6 flex gap-2">
          <button className="btn btn-ghost btn-sm flex-1" onClick={() => finish(false)}>{t('onboard.skip')}</button>
          <button className="btn btn-primary btn-sm flex-1" onClick={() => finish(true)}>{t('onboard.start')}</button>
        </div>
      </div>
    </div>
  );
}
