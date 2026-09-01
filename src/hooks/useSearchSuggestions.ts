import { useState, useCallback } from 'react';
import { readJSON, writeJSON } from '@/lib/storage';
import { seedResources } from '@/data/seed';
import { subTypes } from '@/data/taxonomy';

const HISTORY_KEY = 'ob_search_history';
const MAX_HISTORY = 10;

export interface SearchSuggestion {
  type: 'history' | 'hot' | 'resource' | 'category' | 'tag';
  text: string;
  label?: string;
}

const HOT_SEARCHES = [
  'Claude', 'GPT', '免费API', '公益站', '中转',
  'DeepSeek', '绘画', 'Agent', '免费服务器', '镜像',
];

export function useSearchSuggestions() {
  const [history, setHistory] = useState<string[]>(() =>
    readJSON<string[]>(HISTORY_KEY, []),
  );
  const [activeIndex, setActiveIndex] = useState(-1);
  const [open, setOpen] = useState(false);

  // 添加搜索历史
  const addHistory = useCallback((term: string) => {
    const t = term.trim();
    if (!t) return;
    setHistory((prev) => {
      const next = [t, ...prev.filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, MAX_HISTORY);
      writeJSON(HISTORY_KEY, next);
      return next;
    });
  }, []);

  // 删除单条历史
  const removeHistory = useCallback((term: string) => {
    setHistory((prev) => {
      const next = prev.filter((x) => x !== term);
      writeJSON(HISTORY_KEY, next);
      return next;
    });
  }, []);

  // 清除全部历史
  const clearHistory = useCallback(() => {
    setHistory([]);
    writeJSON(HISTORY_KEY, []);
  }, []);

  // 根据输入计算建议
  const getSuggestions = useCallback((query: string): SearchSuggestion[] => {
    const q = query.trim().toLowerCase();
    const result: SearchSuggestion[] = [];

    if (!q) {
      // 无输入：展示历史 + 热门
      if (history.length > 0) {
        result.push(...history.map((h) => ({ type: 'history' as const, text: h })));
      }
      result.push(...HOT_SEARCHES.map((h) => ({ type: 'hot' as const, text: h })));
      return result.slice(0, 12);
    }

    // 有输入：匹配资源名、分类名、标签
    const seen = new Set<string>();

    // 1. 资源名匹配（前缀匹配优先）
    for (const r of seedResources) {
      const name = r.name.toLowerCase();
      if (name.startsWith(q) || name.includes(q)) {
        if (!seen.has(r.name)) {
          seen.add(r.name);
          result.push({ type: 'resource', text: r.name, label: r.subType });
        }
      }
      if (result.length >= 8) break;
    }

    // 2. 分类名匹配
    for (const s of subTypes) {
      const name = (s.name.zh || s.name.en || '').toLowerCase();
      if (name.includes(q) && !seen.has(s.name.zh)) {
        seen.add(s.name.zh);
        result.push({ type: 'category', text: s.name.zh, label: '分类' });
      }
      if (result.length >= 10) break;
    }

    // 3. 标签匹配
    const allTags = new Set<string>();
    for (const r of seedResources) {
      for (const tag of r.tags ?? []) {
        if (tag.toLowerCase().includes(q)) allTags.add(tag);
      }
    }
    for (const tag of allTags) {
      if (!seen.has(tag)) {
        seen.add(tag);
        result.push({ type: 'tag', text: tag, label: '标签' });
      }
      if (result.length >= 12) break;
    }

    return result;
  }, [history]);

  // 键盘导航
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, query: string, onSearch: (term: string) => void) => {
      const sugg = getSuggestions(query);
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, sugg.length - 1));
        setOpen(true);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, -1));
      } else if (e.key === 'Enter') {
        if (activeIndex >= 0 && activeIndex < sugg.length) {
          e.preventDefault();
          onSearch(sugg[activeIndex].text);
        } else {
          onSearch(query);
        }
        setOpen(false);
        setActiveIndex(-1);
      } else if (e.key === 'Escape') {
        setOpen(false);
        setActiveIndex(-1);
      }
    },
    [activeIndex, getSuggestions],
  );

  // 选中建议
  const selectSuggestion = useCallback(
    (s: SearchSuggestion, onSearch: (term: string) => void) => {
      onSearch(s.text);
      setOpen(false);
      setActiveIndex(-1);
    },
    [],
  );

  // 重置选中状态
  const resetActive = useCallback(() => {
    setActiveIndex(-1);
  }, []);

  return {
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
    resetActive,
    hotSearches: HOT_SEARCHES,
  };
}
