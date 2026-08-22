import { useEffect, useState } from 'react';
import { useT } from '@/i18n/useI18n';
import { useHashRoute, navigate, routeHref, type RouteName } from '@/hooks/useHashRoute';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { LangSwitcher } from './LangSwitcher';
import { Icon } from './Icon';
import { AUTH_ENABLED, hasSupabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';

const GITHUB = 'https://github.com/weed33834/OpenBox';

export function NavBar() {
  const t = useT();
  const route = useHashRoute();
  const authOn = AUTH_ENABLED && hasSupabase;
  const user = useAuthStore((s) => s.user);
  const openAuth = useAuthStore((s) => s.openAuth);
  const signOut = useAuthStore((s) => s.signOut);

  // 滚动时增强导航栏底部分隔与阴影，强化吸顶质感
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const links: { name: RouteName; label: string; href: string }[] = [
    { name: 'home', label: t('nav.home'), href: '/home' },
    { name: 'ranking', label: t('nav.ranking'), href: '/ranking' },
    { name: 'help', label: t('nav.help'), href: '/help' },
    { name: 'my', label: t('nav.my'), href: '/my' },
  ];

  return (
    <header
      className={`sticky top-0 z-40 border-b glass transition-[border-color,box-shadow] ${
        scrolled ? 'border-[var(--color-border)] shadow-[0_1px_0_rgba(0,0,0,0.05)]' : 'border-transparent'
      }`}
    >
      <div className="container flex h-14 items-center gap-3">
        <Logo />
        <nav className="ml-2 hidden items-center gap-1 sm:flex">
          {links.map((l) => {
            const active = route.name === l.name;
            return (
              <a
                key={l.name}
                href={routeHref(l.href)}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(l.href);
                }}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                    : 'text-[var(--color-muted)] hover:text-[var(--color-fg)]'
                }`}
              >
                {l.label}
              </a>
            );
          })}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => navigate('/search')}
            aria-label={t('nav.search')}
          >
            <Icon name="Search" size={18} />
          </button>
          <span className="hidden sm:inline-flex">
            <LangSwitcher />
          </span>
          <ThemeToggle />
          {authOn && (
            user ? (
              <div className="hidden items-center gap-2 sm:flex">
                <span
                  className="hidden max-w-[140px] truncate text-sm text-[var(--color-muted)] sm:inline"
                  title={user.email ?? ''}
                >
                  {user.email}
                </span>
                <button className="btn btn-ghost btn-sm" onClick={() => signOut()}>
                  {t('auth.logout')}
                </button>
              </div>
            ) : (
              <button className="btn btn-primary btn-sm hidden sm:inline-flex" onClick={() => openAuth('signin')}>
                {t('auth.login')}
              </button>
            )
          )}
          <a
            className="btn btn-ghost btn-sm hidden sm:inline-flex"
            href={GITHUB}
            target="_blank"
            rel="noreferrer"
            aria-label={t('nav.github')}
          >
            <Icon name="Code" size={18} />
          </a>
        </div>
      </div>

      {/* 移动端导航已由 MobileTabBar（底部 Tab）承担，顶部仅保留 Logo 与控件 */}
    </header>
  );
}
