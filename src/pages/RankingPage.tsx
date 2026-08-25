import { useT } from '@/i18n/useI18n';
import { useResources } from '@/hooks/useResources';
import { RankingBoard } from '@/components/RankingBoard';
import { PageHeader } from '@/components/PageHeader';

/** 排行榜页：复用首页的多榜单组件，默认展开全部榜单 */
export function RankingPage() {
  const t = useT();
  const { resources } = useResources({ sort: 'default' });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        icon="BarChart3"
        title={t('ranking.boardTitle')}
        desc={t('ranking.boardDesc')}
        note={t('ranking.methodNote')}
      />

      {resources.length === 0 ? (
        <p className="py-10 text-center text-sm text-[var(--color-muted)]">{t('common.loading')}</p>
      ) : (
        // 页头卡已展示标题，组件内 section 标题不再重复
        <RankingBoard resources={resources} expanded hideHeader />
      )}
    </div>
  );
}
