import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { readRaw } from '@/lib/storage';

export type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
}

function apply(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
}

function initial(): Theme {
  if (typeof window === 'undefined') return 'light';
  // persist 写入的是 { state: { theme }, version } JSON——直接读裸值永远匹配不上，
  // 导致暗色用户每次首帧闪白后再被 onRehydrateStorage 掰回
  const raw = readRaw('ob_theme');
  if (raw === 'light' || raw === 'dark') return raw; // 兼容历史裸值写法
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as { state?: { theme?: Theme } } | null;
      const t = parsed?.state?.theme;
      if (t === 'light' || t === 'dark') return t;
    } catch {
      /* JSON 损坏按默认处理 */
    }
  }
  // 默认亮色：不跟随系统偏好，暗色仅由用户手动切换（ob_theme 持久化）
  return 'light';
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: initial(),
      setTheme: (t) => {
        apply(t);
        set({ theme: t });
      },
      toggle: () => {
        const next: Theme = get().theme === 'dark' ? 'light' : 'dark';
        apply(next);
        set({ theme: next });
      },
    }),
    {
      name: 'ob_theme',
      onRehydrateStorage: () => (state) => {
        if (state) apply(state.theme);
      },
    },
  ),
);
