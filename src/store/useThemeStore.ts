import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { readRaw } from '@/lib/storage';

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  resolved: ResolvedTheme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(theme: Theme): ResolvedTheme {
  return theme === 'system' ? getSystemTheme() : theme;
}

function apply(resolved: ResolvedTheme) {
  const root = document.documentElement;
  root.classList.toggle('dark', resolved === 'dark');
  root.style.colorScheme = resolved;
}

function initial(): { theme: Theme; resolved: ResolvedTheme } {
  if (typeof window === 'undefined') return { theme: 'light', resolved: 'light' };
  // persist 写入的是 { state: { theme }, version } JSON
  const raw = readRaw('ob_theme');
  let theme: Theme = 'system'; // 默认跟随系统
  if (raw === 'light' || raw === 'dark' || raw === 'system') {
    theme = raw;
  } else if (raw) {
    try {
      const parsed = JSON.parse(raw) as { state?: { theme?: Theme } } | null;
      const t = parsed?.state?.theme;
      if (t === 'light' || t === 'dark' || t === 'system') theme = t;
    } catch {
      /* JSON 损坏按默认处理 */
    }
  }
  return { theme, resolved: resolveTheme(theme) };
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      ...initial(),
      setTheme: (t) => {
        const resolved = resolveTheme(t);
        apply(resolved);
        set({ theme: t, resolved });
      },
      toggle: () => {
        // 在 light/dark 之间切换；system 模式下切换到与当前解析结果相反的模式
        const { resolved } = get();
        const next: Theme = resolved === 'dark' ? 'light' : 'dark';
        const nextResolved = resolveTheme(next);
        apply(nextResolved);
        set({ theme: next, resolved: nextResolved });
      },
    }),
    {
      name: 'ob_theme',
      onRehydrateStorage: () => (state) => {
        if (state) {
          const resolved = resolveTheme(state.theme);
          apply(resolved);
          state.resolved = resolved;
        }
      },
    },
  ),
);

// 监听系统主题变化：仅当用户选择 system 时响应
if (typeof window !== 'undefined') {
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = () => {
    const { theme } = useThemeStore.getState();
    if (theme === 'system') {
      const resolved = getSystemTheme();
      apply(resolved);
      useThemeStore.setState({ resolved });
    }
  };
  // 兼容旧版 Safari（addListener 已废弃但仍可用）
  if (media.addEventListener) {
    media.addEventListener('change', handler);
  } else {
    media.addListener(handler);
  }
}
