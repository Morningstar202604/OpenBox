import { useThemeStore, type Theme } from '@/store/useThemeStore';
import { Icon } from './Icon';

const THEME_CONFIG: Record<Theme, { icon: string; label: string; next: Theme }> = {
  light: { icon: 'Sun', label: '亮色模式', next: 'dark' },
  dark: { icon: 'Moon', label: '暗色模式', next: 'system' },
  system: { icon: 'Monitor', label: '跟随系统', next: 'light' },
};

export function ThemeToggle() {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const config = THEME_CONFIG[theme];

  const cycle = () => {
    setTheme(config.next);
  };

  return (
    <button
      className="btn btn-ghost btn-sm relative"
      onClick={cycle}
      aria-label={`当前：${config.label}，点击切换到${THEME_CONFIG[config.next].label}`}
      title={`当前：${config.label}（点击切换到${THEME_CONFIG[config.next].label}）`}
    >
      <Icon name={config.icon} size={18} />
      {/* 模式指示器：三个小点，当前模式高亮 */}
      <span className="ml-1 hidden items-center gap-0.5 sm:flex">
        <span
          className={`h-1 w-1 rounded-full transition-colors ${
            theme === 'light' ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'
          }`}
        />
        <span
          className={`h-1 w-1 rounded-full transition-colors ${
            theme === 'dark' ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'
          }`}
        />
        <span
          className={`h-1 w-1 rounded-full transition-colors ${
            theme === 'system' ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'
          }`}
        />
      </span>
    </button>
  );
}
