import { Icon } from './Icon';

/**
 * 彩色软底图标块：分类/场景图标的标准展示形态（底色 = color + 10% 透明度）。
 * 卡片、列表行、精选横幅、详情页、分类页头部等复用，避免各处重复写
 * `<span style={{ background: `${color}1a`, color }}><Icon/></span>`。
 */
export function SoftIcon({
  icon,
  color,
  size = 20,
  className = '',
  rounded = 'rounded-xl',
}: {
  icon?: string;
  color?: string;
  size?: number;
  className?: string;
  rounded?: string;
}) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center ${rounded} ${className}`}
      style={{ background: `color-mix(in srgb, ${color ?? 'var(--color-muted)'} 10%, transparent)`, color }}
    >
      <Icon name={icon ?? 'Globe'} size={size} />
    </span>
  );
}
