import { useEffect, useMemo, useState } from 'react';
import { useT, useLocalize, useI18nStore, LANGS } from '@/i18n/useI18n';
import { getMyRatings, type MyRating } from '@/lib/ratings';
import { getMyComments, type CommentItem } from '@/lib/data';
import { getRatingDimensions } from '@/lib/ratingDimensions';
import { useResources } from '@/hooks/useResources';
import { useAuthStore } from '@/store/useAuthStore';
import { useFavoritesStore } from '@/store/useFavoritesStore';
import { ResourceList } from '@/components/ResourceList';
import { SubmitForm } from '@/components/SubmitForm';
import { EmptyState } from '@/components/EmptyState';
import { navigate } from '@/hooks/useHashRoute';
import { fmtDate } from '@/lib/format';
import { Icon } from '@/components/Icon';

const LANG_LABEL: Record<string, string> = { zh: '中文', en: 'English', ja: '日本語' };

/**
 * 「我的」页：注册前（未登录）仅可浏览本地收藏 + 看到登录引导；
 * 注册后（已登录）解锁云端收藏同步、投稿、我的评分、我的评论。
 * 打分 / 评论 / 投稿均为注册后功能（未登录引导去登录）。
 */
export function MyPage() {
  const t = useT();
  const localize = useLocalize();
  const lang = useI18nStore((s) => s.lang);
  const setLang = useI18nStore((s) => s.setLang);
  const user = useAuthStore((s) => s.user);
  const openAuth = useAuthStore((s) => s.openAuth);
  const signOut = useAuthStore((s) => s.signOut);
  const ids = useFavoritesStore((s) => s.ids);

  const { resources: all } = useResources({ sort: 'default' });
  // 派生登出态：未登录直接空数组，登录后由 effect 异步拉取「我的评分 / 我的评论」
  const [mine, setMine] = useState<{ uid: string; ratings: MyRating[]; comments: CommentItem[] } | null>(null);
  useEffect(() => {
    if (!user) return;
    let m = true;
    Promise.all([getMyRatings(user.id), getMyComments(user.id)]).then(([r, c]) => {
      if (m) setMine({ uid: user.id, ratings: r, comments: c });
    });
    return () => { m = false; };
  }, [user]);
  const myRatings: MyRating[] = useMemo(
    () => (user && mine?.uid === user.id ? mine.ratings : []),
    [user, mine],
  );
  const myComments: CommentItem[] = useMemo(
    () => (user && mine?.uid === user.id ? mine.comments : []),
    [user, mine],
  );

  const favs = useMemo(() => all.filter((r) => ids.includes(r.id)), [all, ids]);
  const byId = useMemo(() => new Map(all.map((r) => [r.id, r])), [all]);

  // 我的评分按资源聚合
  const ratingsByRes = useMemo(() => {
    const m = new Map<string, MyRating[]>();
    for (const r of myRatings) {
      if (!m.has(r.resourceId)) m.set(r.resourceId, []);
      m.get(r.resourceId)!.push(r);
    }
    return m;
  }, [myRatings]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
            <Icon name="User" size={22} />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-fg)]">{t('my.title')}</h1>
            {user && <p className="text-xs text-[var(--color-muted)]">{user.email}</p>}
          </div>
        </div>
        {user && (
          <button className="btn btn-ghost btn-sm" onClick={() => void signOut()}>
            <Icon name="LogOut" size={15} /> {t('my.logout')}
          </button>
        )}
      </div>

      {/* 未登录：引导注册/登录 */}
      {!user && (
        <div className="card flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-[var(--color-fg)]">{t('my.loginBenefitTitle')}</p>
            <p className="mt-1 text-sm text-[var(--color-muted)]">{t('my.loginBenefitDesc')}</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button className="btn btn-primary btn-sm" onClick={() => openAuth('signin')}>{t('auth.signIn')}</button>
            <button className="btn btn-ghost btn-sm" onClick={() => openAuth('signup')}>{t('auth.signUp')}</button>
          </div>
        </div>
      )}

      {/* 我的收藏（未登录=本地；登录=云端同步） */}
      <section>
        <div className="section-head mb-3">
          <span className="no">01</span>
          <h2>{t('my.favorites')}</h2>
        </div>
        {favs.length === 0 ? (
          <EmptyState icon="Heart" title={t('my.favoritesEmpty')} hint={
            <button className="btn btn-primary btn-sm mt-3" onClick={() => navigate('/home')}>{t('home.browseCategories')}</button>
          } />
        ) : (
          <ResourceList resources={favs} />
        )}
      </section>

      {/* 投稿资源（注册后功能） */}
      <section>
        <div className="section-head mb-3">
          <span className="no">02</span>
          <h2>{t('my.submit')}</h2>
        </div>
        {user ? <SubmitForm /> : <LockedHint onClick={() => openAuth('signin')} text={t('my.submitLocked')} />}
      </section>

      {/* 我的评分（注册后） */}
      {user && (
        <section>
          <div className="section-head mb-3">
            <span className="no">03</span>
            <h2>{t('my.myRatings')}</h2>
          </div>
          {myRatings.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">{t('my.myRatingsEmpty')}</p>
          ) : (
            <div className="space-y-3">
              {[...ratingsByRes.entries()].map(([rid, list]) => {
                const res = byId.get(rid);
                const dims = getRatingDimensions(res?.subType ?? '');
                return (
                  <div key={rid} className="card p-4">
                    <button className="mb-2 text-left font-semibold text-[var(--color-fg)] hover:text-[var(--color-primary)]" onClick={() => res && navigate(`/resource/${rid}`)}>
                      {res?.name ?? rid}
                    </button>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--color-muted)]">
                      {list.map((rt) => {
                        const d = dims.find((x) => x.key === rt.dimension);
                        return (
                          <span key={rt.dimension}>
                            {d ? localize(d.label) : rt.dimension}：<span className="text-amber-500">{'★'.repeat(rt.score)}</span>{'☆'.repeat(5 - rt.score)}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* 我的评论（注册后） */}
      {user && (
        <section>
          <div className="section-head mb-3">
            <span className="no">04</span>
            <h2>{t('my.myComments')}</h2>
          </div>
          {myComments.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">{t('my.myCommentsEmpty')}</p>
          ) : (
            <ul className="space-y-3">
              {myComments.map((c) => {
                const res = byId.get(c.resourceId);
                return (
                  <li key={c.id} className="card p-4">
                    <div className="mb-1 flex items-center gap-2 text-xs text-[var(--color-muted)]">
                      <button className="font-semibold text-[var(--color-fg)] hover:text-[var(--color-primary)]" onClick={() => res && navigate(`/resource/${c.resourceId}`)}>
                        {res?.name ?? c.resourceId}
                      </button>
                      <span>·</span>
                      <span>{fmtDate(c.createdAt, true)}</span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-fg)]">{c.content}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {/* 语言设置（手机端 NavBar 隐藏 LangSwitcher，这里提供唯一移动端入口） */}
      <section>
        <div className="section-head mb-3">
          <span className="no">{user ? '05' : '03'}</span>
          <h2>{t('my.language')}</h2>
        </div>
        <div className="flex gap-2">
          {LANGS.map((l) => (
            <button
              key={l}
              className={`btn btn-sm flex-1 ${lang === l ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setLang(l)}
            >
              {LANG_LABEL[l]}
            </button>
          ))}
        </div>
      </section>

      {/* 关于入口 */}
      <section>
        <div className="section-head mb-3">
          <span className="no">{user ? '06' : '04'}</span>
          <h2>{t('my.about')}</h2>
        </div>
        <button className="btn btn-ghost w-full justify-start" onClick={() => navigate('/about')}>
          <Icon name="Info" size={16} />
          {t('nav.about')}
        </button>
        <button className="btn btn-ghost mt-2 w-full justify-start" onClick={() => navigate('/help')}>
          <Icon name="BookOpen" size={16} />
          {t('nav.help')}
        </button>
      </section>
    </div>
  );
}

/** 未登录时的锁定提示（点击去登录） */
function LockedHint({ onClick, text }: { onClick: () => void; text: string }) {
  return (
    <button className="card flex w-full items-center gap-3 p-4 text-left text-[var(--color-muted)] hover:text-[var(--color-fg)]" onClick={onClick}>
      <Icon name="Lock" size={18} />
      <span className="text-sm">{text}</span>
    </button>
  );
}
