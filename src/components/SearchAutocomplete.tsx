import { useState, useEffect, useRef, useMemo } from 'react';
import { useT } from '@/i18n/useI18n';
import { navigate } from '@/hooks/useHashRoute';
import { seedResources } from '@/data/seed';
import { Icon } from './Icon';

interface Suggestion {
  name: string;
  subType: string;
  type: 'resource' | 'keyword';
}

/** 从 seed 资源的标签中提取真正的高频热词：
 *  只统计 tags（资源名/摘要的专名会污染热词），且频次 >= 2 才入选，避免单个资源名冒充搜索词。 */
function buildDynamicKeywords(): string[] {
  const freq: Record<string, number> = {};
  for (const r of seedResources) {
    for (const t of r.tags ?? []) freq[t] = (freq[t] ?? 0) + 1;
  }
  return Object.entries(freq)
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([w]) => w);
}

const DYNAMIC_KEYWORDS = buildDynamicKeywords();

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span className="font-semibold text-primary">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  );
}

export function SearchAutocomplete({
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
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [canAutoFocus] = useState(
    () => typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: fine)').matches,
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = useMemo(() => {
    const results: Suggestion[] = [];
    const seen = new Set<string>();

    const add = (s: Suggestion) => {
      if (seen.has(s.name)) return;
      seen.add(s.name);
      results.push(s);
    };

    if (q.trim()) {
      const qLower = q.toLowerCase();
      seedResources.forEach((r) => {
        if (
          r.name.toLowerCase().includes(qLower) ||
          r.summary.toLowerCase().includes(qLower) ||
          (r.tags ?? []).some((tag) => tag.toLowerCase().includes(qLower))
        ) {
          add({ name: r.name, subType: r.subType, type: 'resource' });
        }
      });
    }

    DYNAMIC_KEYWORDS.forEach((kw) => {
      if (q.trim() && !kw.toLowerCase().includes(q.toLowerCase())) return;
      add({ name: kw, subType: '', type: 'keyword' });
    });

    return results.slice(0, 8);
  }, [q]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const submit = () => {
    const term = q.trim();
    navigate(term ? `/search?q=${encodeURIComponent(term)}` : '/search');
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const handleSelect = (name: string) => {
    setQ(name);
    setIsOpen(false);
    setActiveIndex(-1);
    setTimeout(() => submit(), 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((prev) => Math.max(prev - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < suggestions.length) {
          handleSelect(suggestions[activeIndex].name);
        } else {
          submit();
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setActiveIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  return (
    <div ref={containerRef} className="relative flex-1">
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
              setIsOpen(true);
              setActiveIndex(-1);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <button className="btn btn-primary btn-sm w-full sm:w-auto" type="submit">
          {t('common.search')}
        </button>
      </form>

      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-w-md overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg">
          <div className="max-h-64 overflow-y-auto py-1">
            {suggestions.map((s, idx) => (
              <button
                key={s.name}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--color-muted-soft)] ${
                  idx === activeIndex ? 'bg-[var(--color-muted-soft)]' : ''
                }`}
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => handleSelect(s.name)}
              >
                <Icon
                  name={s.type === 'resource' ? 'Resource' : 'Tag'}
                  size={14}
                  className="text-[var(--color-muted)]"
                />
                <span className="flex-1 truncate">
                  {highlightMatch(s.name, q)}
                </span>
                {s.subType && (
                  <span className="chip text-xs">{s.subType}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
