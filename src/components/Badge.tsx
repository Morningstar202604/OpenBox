import type { ResourceStatus, ResourceType } from '@/lib/types';
import { STATUS_META, TYPE_META } from '@/lib/format';

export function StatusBadge({ status }: { status: ResourceStatus }) {
  const m = STATUS_META[status];
  return (
    <span className="signal inline-flex items-center gap-1.5" data-status={status}>
      <span
        className={`inline-block h-1.5 w-1.5 rounded-full ${status === 'ok' ? 'animate-pulse' : ''}`}
        style={{ backgroundColor: m.color }}
      />
      {m.label}
    </span>
  );
}

export function TypeBadge({ type }: { type: ResourceType }) {
  const m = TYPE_META[type];
  return (
    <span className="badge" style={{ color: m.color, background: m.soft }}>
      {m.label}
    </span>
  );
}
