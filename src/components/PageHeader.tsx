import { Icon } from './Icon';

/**
 * 页面页头卡（RankingPage / HelpPage / AboutPage 共用）。
 * 此前三处各自手写 card+h1+desc 组合且间距/对齐各异，收敛为单一组件。
 */
export function PageHeader({
  icon,
  title,
  desc,
  note,
  center = false,
  className = '',
}: {
  icon?: string;
  title: string;
  desc?: string;
  /** 弱化补充说明（比 desc 更小一号） */
  note?: string;
  center?: boolean;
  className?: string;
}) {
  return (
    <div className={`card p-6 ${center ? 'mb-5 text-center' : ''} ${className}`}>
      <h1
        className="flex items-center gap-2 text-2xl font-bold text-[var(--color-fg)]"
        style={center ? { justifyContent: 'center' } : undefined}
      >
        {icon && <Icon name={icon} size={22} className="shrink-0 text-[var(--color-primary)]" />} {title}
      </h1>
      {desc && (
        <p className={center ? 'mt-2 text-sm text-[var(--color-muted)]' : 'mt-3 leading-relaxed text-[var(--color-muted)]'}>
          {desc}
        </p>
      )}
      {note && <p className="mt-2 text-xs text-[var(--color-muted)]">{note}</p>}
    </div>
  );
}
