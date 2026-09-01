import { useState, useRef, useEffect } from 'react';
import { useT } from '@/i18n/useI18n';
import { navigate } from '@/hooks/useHashRoute';
import { useSearchSuggestions, type SearchSuggestion } from '@/hooks/useSearchSuggestions';
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
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    history,
    addHistory,
    removeHistory,
    clearHistory,
    getSuggestions,
    handleKeyDown,
    selectSuggestion,
    activeIndex,
    setActiveIndex,
    open,
    setOpen,
    hotSearches,
  } = useSearchSuggestions();

  const suggestions = getSuggestions(q);

  // 移动端（粗指针设备）不自动聚焦：否则一进搜索页键盘就弹出，遮住半个结果区。
  const [canAutoFocus] = useState(
    () => typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: fine)').matches,
  );

  // 点击外部关闭下拉
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [setOpen, setActiveIndex]);

  const doSearch = (term: string) => {
    const trimmed = term.trim();
    if (trimmed) addHistory(trimmed);
    navigate(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : '/search');
    setOpen(false);
  };

  const submit = () => doSearch(q);

  const typeIcon: Record<SearchSuggestion['type'], string> = {
    history: 'Clock',
    hot: 'TrendingUp',
    resource: 'Globe',
    category: 'Folder',
    tag: 'Tag',
  };

  const typeLabel: Record<SearchSuggestion['type'], string> = {
    history: '历史',
    hot: '热门',
    resource: '资源',
    category: '分类',
    tag: '标签',
  };

  // 分组展示：有输入时不分组，无输入时分历史/热门
  const showGroups = !q.trim();

  return (
    <div ref={containerRef} className="relative">
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
            ref={inputRef}
            className={big ? 'input pl-9' : 'input pl-9'}
            placeholder={t('home.searchPlaceholder')}
            value={q}
            autoFocus={autoFocus && canAutoFocus}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
              setActiveIndex(-1);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => handleKeyDown(e, q, doSearch)}
          />
          {q && (
            <button
              type="button"
              onClick={() => {
                setQ('');
                inputRef.current?.focus();
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-muted)] hover:text-[var(--color-fg)]"
              aria-label="清除"
            >
              <Icon name="X" size={16} />
            </button>
          )}
        </div>
        <button className="btn btn-primary btn-sm w-full sm:w-auto" type="submit">
          {t('common.search')}
        </button>
      </form>

      {/* 下拉面板 */}
      {open && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-elevated)] shadow-xl">
          {showGroups ? (
            <>
              {/* 搜索历史 */}
              {history.length > 0 && (
                <div className="border-b border-[var(--color-border)] p-2">
                  <div className="mb-1 flex items-center justify-between px-2">
                    <span className="text-xs font-medium text-[var(--color-muted)]">搜索历史</span>
                    <button
                      onClick={clearHistory}
                      className="text-xs text-[var(--color-muted)] hover:text-[var(--color-danger)]"
                    >
                      清除
                    </button>
                  </div>
                  {history.slice(0, 5).map((h, i) => (
                    <div
                      key={h}
                      className={`group flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${
                        activeIndex === i ? 'bg-[var(--color-primary-soft)]' : 'hover:bg-[var(--color-bg-soft)]'
                      }`}
                      onClick={() => selectSuggestion({ type: 'history', text: h }, doSearch)}
                      onMouseEnter={() => setActiveIndex(i)}
                    >
                      <Icon name="Clock" size={14} className="shrink-0 text-[var(--color-muted)]" />
                      <span className="flex-1 truncate">{h}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeHistory(h);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-[var(--color-muted)] hover:text-[var(--color-danger)]"
                        aria-label="删除"
                      >
                        <Icon name="X" size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {/* 热门搜索 */}
              <div className="p-2">
                <div className="mb-1 px-2 text-xs font-medium text-[var(--color-muted)]">热门搜索</div>
                <div className="flex flex-wrap gap-1.5 px-1 pb-1">
                  {hotSearches.map((h) => (
                    <button
                      key={h}
                      onClick={() => selectSuggestion({ type: 'hot', text: h }, doSearch)}
                      className="rounded-full border border-[var(--color-border)] px-2.5 py-1 text-xs text-[var(--color-muted)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            /* 实时建议列表 */
            <div className="max-h-80 overflow-y-auto p-1">
              {suggestions.map((s, i) => (
                <div
                  key={`${s.type}-${s.text}`}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                    activeIndex === i ? 'bg-[var(--color-primary-soft)]' : 'hover:bg-[var(--color-bg-soft)]'
                  }`}
                  onClick={() => selectSuggestion(s, doSearch)}
                  onMouseEnter={() => setActiveIndex(i)}
                >
                  <Icon name={typeIcon[s.type]} size={14} className="shrink-0 text-[var(--color-muted)]" />
                  <span className="flex-1 truncate">
                    {q && (
                      <span
                        dangerouslySetInnerHTML={{
                          __html: s.text.replace(
                            new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'),
                            '<strong class="text-[var(--color-primary)]">$1</strong>',
                          ),
                        }}
                      />
                    )}
                    {!q && s.text}
                  </span>
                  {s.label && (
                    <span className="shrink-0 rounded bg-[var(--color-bg-soft)] px-1.5 py-0.5 text-[10px] text-[var(--color-muted)]">
                      {typeLabel[s.type]}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
