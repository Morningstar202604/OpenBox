import { useState, useMemo } from 'react';

export interface StatusPoint {
  date: string;
  v: 'ok' | 'suspect' | 'dead';
  ms?: number;
}

interface StatusChartProps {
  data: StatusPoint[];
  height?: number;
}

/**
 * 可用率趋势图组件
 * 纯 SVG 实现，零依赖，轻量可控
 * 展示近30天可用率趋势，dead 日期红色标记
 */
export function StatusChart({ data, height = 160 }: StatusChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const width = 600; // viewBox 宽度，实际响应式缩放
  const padding = { top: 16, right: 12, bottom: 24, left: 32 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // 计算每天的可用率（ok=100%, suspect=50%, dead=0%）
  const points = useMemo(() => {
    return data.map((d) => ({
      ...d,
      rate: d.v === 'ok' ? 100 : d.v === 'suspect' ? 50 : 0,
    }));
  }, [data]);

  // 计算路径
  const { linePath, areaPath } = useMemo(() => {
    if (points.length === 0) return { linePath: '', areaPath: '' };
    const stepX = chartW / Math.max(points.length - 1, 1);
    const toY = (rate: number) => padding.top + chartH - (rate / 100) * chartH;

    const linePoints = points.map((p, i) => ({
      x: padding.left + i * stepX,
      y: toY(p.rate),
    }));

    const linePath = linePoints
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(' ');

    const areaPath = `${linePath} L ${linePoints[linePoints.length - 1].x.toFixed(1)} ${padding.top + chartH} L ${linePoints[0].x.toFixed(1)} ${padding.top + chartH} Z`;

    return { linePath, areaPath };
  }, [points, chartW, chartH, padding.left, padding.top]);

  // 统计
  const stats = useMemo(() => {
    const ok = points.filter((p) => p.v === 'ok').length;
    const suspect = points.filter((p) => p.v === 'suspect').length;
    const dead = points.filter((p) => p.v === 'dead').length;
    const avgRate = points.length ? Math.round((ok * 100 + suspect * 50) / points.length) : 0;
    const avgMs = points.filter((p) => p.ms).reduce((a, p) => a + (p.ms || 0), 0) / Math.max(points.filter((p) => p.ms).length, 1);
    return { ok, suspect, dead, avgRate, avgMs: Math.round(avgMs) };
  }, [points]);

  const stepX = chartW / Math.max(points.length - 1, 1);
  const hoverPoint = hoverIndex !== null ? points[hoverIndex] : null;

  return (
    <div className="w-full">
      {/* 统计概览 */}
      <div className="mb-3 flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[var(--color-success)]" />
          <span className="text-[var(--color-muted)]">可用 {stats.ok}天</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[var(--color-warning)]" />
          <span className="text-[var(--color-muted)]">波动 {stats.suspect}天</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[var(--color-danger)]" />
          <span className="text-[var(--color-muted)]">失效 {stats.dead}天</span>
        </div>
        <div className="ml-auto font-mono text-[var(--color-fg)]">
          平均可用率 <span className="font-bold text-[var(--color-primary)]">{stats.avgRate}%</span>
          {stats.avgMs > 0 && <span className="ml-3 text-[var(--color-muted)]">平均延迟 {stats.avgMs}ms</span>}
        </div>
      </div>

      {/* SVG 图表 */}
      <div className="relative w-full">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full"
          style={{ height }}
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id="statusArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.25" />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* 网格线 */}
          {[0, 25, 50, 75, 100].map((rate) => {
            const y = padding.top + chartH - (rate / 100) * chartH;
            return (
              <g key={rate}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="var(--color-border)"
                  strokeWidth="0.5"
                  strokeDasharray={rate === 0 || rate === 100 ? 'none' : '3 3'}
                />
                <text
                  x={padding.left - 6}
                  y={y + 3}
                  textAnchor="end"
                  className="fill-[var(--color-muted)]"
                  fontSize="9"
                >
                  {rate}%
                </text>
              </g>
            );
          })}

          {/* 区域填充 */}
          {areaPath && <path d={areaPath} fill="url(#statusArea)" />}

          {/* 折线 */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}

          {/* 数据点：dead 用红色，suspect 用黄色，ok 不显示（避免太密） */}
          {points.map((p, i) => {
            if (p.v === 'ok') return null;
            const x = padding.left + i * stepX;
            const y = padding.top + chartH - (p.rate / 100) * chartH;
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r={p.v === 'dead' ? 4 : 3}
                fill={p.v === 'dead' ? 'var(--color-danger)' : 'var(--color-warning)'}
                stroke="var(--color-surface)"
                strokeWidth="1.5"
              />
            );
          })}

          {/* hover 指示线 */}
          {hoverIndex !== null && (
            <line
              x1={padding.left + hoverIndex * stepX}
              y1={padding.top}
              x2={padding.left + hoverIndex * stepX}
              y2={padding.top + chartH}
              stroke="var(--color-primary)"
              strokeWidth="1"
              strokeDasharray="3 3"
              opacity="0.5"
            />
          )}

          {/* hover 数据点 */}
          {hoverIndex !== null && hoverPoint && (
            <circle
              cx={padding.left + hoverIndex * stepX}
              cy={padding.top + chartH - (hoverPoint.rate / 100) * chartH}
              r="5"
              fill="var(--color-primary)"
              stroke="var(--color-surface)"
              strokeWidth="2"
            />
          )}

          {/* X 轴日期（每5天一个） */}
          {points.map((p, i) => {
            if (i % 5 !== 0 && i !== points.length - 1) return null;
            const x = padding.left + i * stepX;
            return (
              <text
                key={i}
                x={x}
                y={height - 6}
                textAnchor="middle"
                className="fill-[var(--color-muted)]"
                fontSize="9"
              >
                {p.date.slice(5)}
              </text>
            );
          })}

          {/* 透明 hover 区域 */}
          {points.map((_, i) => (
            <rect
              key={i}
              x={padding.left + i * stepX - stepX / 2}
              y={padding.top}
              width={stepX}
              height={chartH}
              fill="transparent"
              onMouseEnter={() => setHoverIndex(i)}
            />
          ))}
        </svg>

        {/* hover 提示框 */}
        {hoverPoint && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-lg border border-[var(--color-border)] bg-[var(--color-elevated)] px-3 py-2 text-xs shadow-lg"
            style={{
              left: `${((padding.left + (hoverIndex ?? 0) * stepX) / width) * 100}%`,
              top: 0,
            }}
          >
            <p className="font-mono font-medium text-[var(--color-fg)]">{hoverPoint.date}</p>
            <p className="mt-1 flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{
                  backgroundColor:
                    hoverPoint.v === 'ok'
                      ? 'var(--color-success)'
                      : hoverPoint.v === 'suspect'
                        ? 'var(--color-warning)'
                        : 'var(--color-danger)',
                }}
              />
              <span className="text-[var(--color-muted)]">
                {hoverPoint.v === 'ok' ? '正常' : hoverPoint.v === 'suspect' ? '波动' : '失效'}
                {hoverPoint.ms ? ` · ${hoverPoint.ms}ms` : ''}
              </span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
