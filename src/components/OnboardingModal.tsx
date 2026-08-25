import { useState } from 'react';
import { useT } from '@/i18n/useI18n';
import { navigate } from '@/hooks/useHashRoute';
import { Modal } from './Modal';
import { readRaw, writeRaw } from '@/lib/storage';
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
  const [show, setShow] = useState(() => !readRaw(FLAG));

  const finish = (goHome: boolean) => {
    writeRaw(FLAG, '1'); // 存储不可用时写失败，下次仍弹（可接受）
    setShow(false);
    if (goHome) navigate('/home');
  };

  return (
    <Modal open={show} onClose={() => finish(false)} ariaLabel={t('onboard.title')} panelClass="max-w-md">
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
    </Modal>
  );
}
