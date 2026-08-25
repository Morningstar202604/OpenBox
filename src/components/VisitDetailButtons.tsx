import { useT } from '@/i18n/useI18n';
import { navigate } from '@/hooks/useHashRoute';
import { safeHref } from '@/lib/url';
import type { Resource } from '@/lib/types';
import { Icon } from './Icon';

/**
 * 资源卡/列表行共用的操作按钮对：访问（主）+ 查看详情（次）。
 * 此前 ResourceCard 与 ResourceRow 各写一份且主次关系曾不一致，已收敛于此。
 */
export function VisitDetailButtons({ resource }: { resource: Resource }) {
  const t = useT();
  return (
    <>
      <a
        className="btn btn-primary btn-sm flex-1 sm:flex-none"
        href={safeHref(resource.url)}
        target="_blank"
        rel="noreferrer"
      >
        <Icon name="ExternalLink" size={15} />
        {t('common.visit')}
      </a>
      <button
        className="btn btn-ghost btn-sm flex-1 sm:flex-none"
        onClick={() => navigate(`/resource/${resource.id}`)}
      >
        {t('common.viewDetail')}
      </button>
    </>
  );
}
