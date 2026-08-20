import { useT, useLocalize } from '@/i18n/useI18n';
import { getAllSubTypes } from '@/data/taxonomy';
import { navigate } from '@/hooks/useHashRoute';
import { Icon } from './Icon';

/**
 * 首页底部「分类导航栏」：横向可滚动的子类型快捷入口。
 * 由原来首页中部的「全部分类」场景树区块下沉而来（交换排行榜位置），
 * 作为轻量导航，点击直达 #/category/:slug。
 */
export function CategoryNavBar() {
  const t = useT();
  const localize = useLocalize();
  const subs = getAllSubTypes();
  return (
    <section>
      <div className="section-head mb-3">
        <span className="no">◆</span>
        <h2>{t('nav.categories')}</h2>
      </div>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2 scrollbar-none">
        {subs.map((s) => (
          <button
            key={s.slug}
            onClick={() => navigate(`/category/${s.slug}`)}
            className="chip flex shrink-0 items-center gap-1.5 whitespace-nowrap"
            style={{ color: s.color, borderColor: `${s.color}55` }}
          >
            <Icon name={s.icon} size={14} />
            {localize(s.name)}
          </button>
        ))}
      </div>
    </section>
  );
}
