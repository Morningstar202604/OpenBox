// 最近浏览记录
// 设计：纯本地 localStorage，记录用户最近查看过的资源 ID（最多 10 条，去重，最新的在前）。
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface RecentState {
  ids: string[];
  /** 记录一次浏览（已存在的会移到最前，超过上限截断） */
  push: (id: string) => void;
  /** 清空记录 */
  clear: () => void;
}

const MAX_RECENT = 10;

export const useRecentStore = create<RecentState>()(
  persist(
    (set, get) => ({
      ids: [],
      push: (id) => {
        const ids = get().ids.filter((x) => x !== id);
        set({ ids: [id, ...ids].slice(0, MAX_RECENT) });
      },
      clear: () => set({ ids: [] }),
    }),
    { name: 'ob_recent' },
  ),
);
