import { useState } from 'react';
import { useT } from '@/i18n/useI18n';
import { navigate } from '@/hooks/useHashRoute';
import { Icon } from './Icon';

export function SearchBox({
  initial = '',
  autoFocus = false,
  big = false,
}: {
  initial?: string;
  autoFocus?: boolean;
  big?: boolean;
}) {
  const t = useT();
  const [q, setQ] = useState(initial);
  // 移动端（粗指针设备）不自动聚焦：否则一进搜索页键盘就弹出，遮住半个结果区。
  // 桌面精确指针（鼠标/触控板）保留自动聚焦的顺手体验。
  const [canAutoFocus] = useState(
    () => typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: fine)').matches,
  );

  const submit = () => {
    const term = q.trim();
    navigate(term ? `/search?q=${encodeURIComponent(term)}` : '/search');
  };

  return (
    <form
      className={big ? 'card flex flex-col gap-2 p-2 sm:flex-row sm:items-center' : 'flex items-center gap-2'}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="relative flex-1">
        {big ? (
          <span className="term-prompt pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm" />
        ) : (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]">
            <Icon name="Search" size={18} />
          </span>
        )}
        <input
          className={big ? 'input pl-9' : 'input pl-9'}
          placeholder={t('home.searchPlaceholder')}
          value={q}
          autoFocus={autoFocus && canAutoFocus}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <button className="btn btn-primary btn-sm w-full sm:w-auto" type="submit">
        {t('common.search')}
      </button>
    </form>
  );
}
