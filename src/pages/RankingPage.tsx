import { useEffect, useState } from 'react';
import type { Resource } from '@/lib/types';
import { useT } from '@/i18n/useI18n';
import { getResources } from '@/lib/data';
import { RankingBoard } from '@/components/RankingBoard';
import { Icon } from '@/components/Icon';

/** 排行榜页：复用首页的多榜单组件，默认展开全部榜单 */
export function RankingPage() {
  const t = useT();
  const [resources, setResources] = useState<Resource[]>([]);

  useEffect(() => {
    let m = true;
    getResources({ sort: 'default' }).then((list) => { if (m) setResources(list); });
    return () => { m = false; };
  }, []);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="card p-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-[var(--color-fg)]">
          <Icon name="BarChart3" size={22} className="text-[var(--color-primary)]" /> {t('ranking.boardTitle')}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">{t('ranking.boardDesc')}</p>
        <p className="mt-2 text-xs text-[var(--color-muted)]">{t('ranking.methodNote')}</p>
      </div>

      {resources.length === 0 ? (
        <p className="py-10 text-center text-sm text-[var(--color-muted)]">{t('common.loading')}</p>
      ) : (
        <RankingBoard resources={resources} expanded />
      )}
    </div>
  );
}
