import type { ReactNode } from 'react';
import { useT } from '@/i18n/useI18n';
import { navigate, routeHref } from '@/hooks/useHashRoute';
import { Icon } from '@/components/Icon';
import { PageHeader } from '@/components/PageHeader';

function Section({ id, title, icon, children }: { id: string; title: string; icon: string; children: ReactNode }) {
  return (
    <section id={id} className="card scroll-mt-24 p-5 sm:p-6">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-[var(--color-fg)]">
        <Icon name={icon} size={18} className="text-[var(--color-primary)]" /> {title}
      </h2>
      <div className="space-y-2 text-base leading-7 text-[var(--color-fg)]">{children}</div>
    </section>
  );
}

/** 帮助中心：详细使用教程、术语表与常见问题（解决「拿到不会用」的问题） */
export function HelpPage() {
  const t = useT();
  const TOC = [
    { id: 'start', icon: 'Rocket', title: t('help.start') },
    { id: 'free-api', icon: 'Server', title: t('help.freeApi') },
    { id: 'relay', icon: 'Network', title: t('help.relay') },
    { id: 'models', icon: 'Brain', title: t('help.models') },
    { id: 'account', icon: 'User', title: t('help.account') },
    { id: 'glossary', icon: 'BookOpen', title: t('help.glossary') },
    { id: 'faq', icon: 'HelpCircle', title: t('help.faq') },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader icon="LifeBuoy" title={t('nav.help')} desc={t('help.subtitle')} center />

      <div className="lg:grid lg:grid-cols-[13rem_1fr] lg:gap-6">
        {/* 目录（桌面端置顶吸附，移动端横向滚动） */}
        <nav className="card mb-5 flex gap-2 overflow-x-auto p-4 lg:mb-0 lg:sticky lg:top-20 lg:flex-col lg:self-start lg:overflow-visible">
          {TOC.map((x) => (
            <a key={x.id} href={`${routeHref('/help')}#${x.id}`} className="chip shrink-0" onClick={(e) => { e.preventDefault(); document.getElementById(x.id)?.scrollIntoView({ behavior: 'smooth' }); }}>
              <Icon name={x.icon} size={14} /> {x.title}
            </a>
          ))}
        </nav>

        <div className="space-y-5">
          <Section id="start" title={t('help.start')} icon="Rocket">
        <p>{t('help.startP1')}</p>
        <ol className="list-decimal space-y-1 pl-5 text-[var(--color-muted)]">
          <li>{t('help.startStep1')}</li>
          <li>{t('help.startStep2')}</li>
          <li>{t('help.startStep3')}</li>
          <li>{t('help.startStep4')}</li>
        </ol>
        <p className="text-[var(--color-muted)]">{t('help.startP2')}</p>
      </Section>

      <Section id="free-api" title={t('help.freeApi')} icon="Server">
        <p>{t('help.freeApiP1')}</p>
        <ul className="list-disc space-y-1 pl-5 text-[var(--color-muted)]">
          <li>{t('help.freeApiLi1')}</li>
          <li>{t('help.freeApiLi2')}</li>
          <li>{t('help.freeApiLi3')}</li>
        </ul>
      </Section>

      <Section id="relay" title={t('help.relay')} icon="Network">
        <p>{t('help.relayP1')}</p>
        <p className="text-[var(--color-muted)]">{t('help.relayP2')}</p>
      </Section>

      <Section id="models" title={t('help.models')} icon="Brain">
        <p>{t('help.modelsP1')}</p>
        <p className="text-[var(--color-muted)]">{t('help.modelsP2')}</p>
      </Section>

      <Section id="account" title={t('help.account')} icon="User">
        <p>{t('help.accountP1')}</p>
        <ul className="list-disc space-y-1 pl-5 text-[var(--color-muted)]">
          <li>{t('help.accountLi1')}</li>
          <li>{t('help.accountLi2')}</li>
          <li>{t('help.accountLi3')}</li>
        </ul>
        <button className="btn btn-primary btn-sm mt-2" onClick={() => navigate('/my')}>{t('my.title')}</button>
      </Section>

      <Section id="glossary" title={t('help.glossary')} icon="BookOpen">
        <dl className="space-y-2">
          <div><dt className="font-semibold text-[var(--color-fg)]">{t('help.g1t')}</dt><dd className="text-[var(--color-muted)]">{t('help.g1d')}</dd></div>
          <div><dt className="font-semibold text-[var(--color-fg)]">{t('help.g2t')}</dt><dd className="text-[var(--color-muted)]">{t('help.g2d')}</dd></div>
          <div><dt className="font-semibold text-[var(--color-fg)]">{t('help.g3t')}</dt><dd className="text-[var(--color-muted)]">{t('help.g3d')}</dd></div>
          <div><dt className="font-semibold text-[var(--color-fg)]">{t('help.g4t')}</dt><dd className="text-[var(--color-muted)]">{t('help.g4d')}</dd></div>
        </dl>
      </Section>

      <Section id="faq" title={t('help.faq')} icon="HelpCircle">
        <dl className="space-y-3">
          <div><dt className="font-semibold text-[var(--color-fg)]">Q：{t('help.faq1q')}</dt><dd className="text-[var(--color-muted)]">A：{t('help.faq1a')}</dd></div>
          <div><dt className="font-semibold text-[var(--color-fg)]">Q：{t('help.faq2q')}</dt><dd className="text-[var(--color-muted)]">A：{t('help.faq2a')}</dd></div>
          <div><dt className="font-semibold text-[var(--color-fg)]">Q：{t('help.faq3q')}</dt><dd className="text-[var(--color-muted)]">A：{t('help.faq3a')}</dd></div>
        </dl>
      </Section>
        </div>
      </div>
    </div>
  );
}
