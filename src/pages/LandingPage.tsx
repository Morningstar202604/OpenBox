import { useT } from '@/i18n/useI18n';
import { navigate } from '@/hooks/useHashRoute';
import { LangSwitcher } from '@/components/LangSwitcher';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Icon } from '@/components/Icon';

/**
 * 装饰性「资源网络」主视觉：节点 + 连线 + 流动光点。
 * 不映射真实数据，纯视觉背景；节点呼吸、连线光点流动，呼应「开源 AI 资源导航」。
 */
function NetworkField() {
  const nodes: [number, number][] = [
    [180, 140], [340, 90], [520, 150], [700, 100], [860, 180],
    [120, 320], [300, 360], [500, 320], [690, 380], [880, 340],
    [220, 540], [430, 560], [640, 520], [820, 580],
  ];
  const edges: [number, number][] = [
    [0, 1], [1, 2], [2, 3], [3, 4],
    [0, 5], [1, 6], [2, 7], [3, 8], [4, 9],
    [5, 6], [6, 7], [7, 8], [8, 9],
    [5, 10], [6, 11], [7, 12], [8, 13], [10, 11], [11, 12], [12, 13],
    [6, 2], [7, 3], [10, 6],
  ];
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 h-full w-full"
      viewBox="0 0 1000 700"
      preserveAspectRatio="xMidYMid slice"
    >
      <g stroke="var(--color-primary)" strokeOpacity="0.16" strokeWidth="1">
        {edges.map(([a, b], i) => (
          <line
            key={i}
            x1={nodes[a][0]}
            y1={nodes[a][1]}
            x2={nodes[b][0]}
            y2={nodes[b][1]}
            className={i % 4 === 0 ? 'net-line' : undefined}
          />
        ))}
      </g>
      <g fill="var(--color-primary)">
        {nodes.map(([x, y], i) => (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={i % 5 === 0 ? 5 : 3.2}
            className="net-node"
            style={{ animationDelay: `${(i % 7) * 0.45}s`, fillOpacity: 0.55 }}
          />
        ))}
      </g>
    </svg>
  );
}

export function LandingPage() {
  const t = useT();
  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-6 text-center">
      {/* 资源网络动态主视觉（装饰）；全局 BackgroundFX 另提供光晕与坐标纸网格 */}
      <NetworkField />

      {/* 右上角极简控件 */}
      <div className="absolute right-4 top-4 z-10 flex items-center gap-1.5">
        <LangSwitcher />
        <ThemeToggle />
      </div>

      <div className="route-fade relative z-10 flex flex-col items-center">
        {/* 标记：墨色方块 + 衬线 O */}
        <span className="mb-7 flex h-16 w-16 items-center justify-center rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-fg)] shadow-[var(--shadow-card)]">
          <span className="font-display text-3xl font-black">O</span>
        </span>

        {/* 品牌名：衬线大标题（杂志刊头感） */}
        <h1 className="font-display text-5xl font-black tracking-tight text-[var(--color-fg)] sm:text-7xl">
          OpenBox
        </h1>

        <p className="mx-auto mt-4 max-w-md text-base text-[var(--color-muted)] sm:text-lg">{t('landing.slogan')}</p>

        {/* 终端提示符：$ openbox --enter */}
        <div className="mt-8 flex items-center gap-1 font-mono text-sm text-[var(--color-muted)]">
          <span className="term-prompt" />
          <span>openbox --enter</span>
          <span className="term-cursor" />
        </div>

        <button
          className="btn btn-primary mt-8 px-10 py-3 text-base"
          onClick={() => navigate('/home')}
        >
          {t('landing.enter')}
          <Icon name="ChevronRight" size={18} />
        </button>

        <p className="mt-5 text-xs text-[var(--color-muted)]">{t('landing.hint')}</p>
      </div>

      <footer className="absolute bottom-5 z-10 text-xs text-[var(--color-muted)]">{t('footer.tagline')}</footer>
    </div>
  );
}
