import type { ReactNode } from 'react';
import { useDialog } from '@/hooks/useDialog';

/**
 * 全站弹窗统一基座：遮罩 + 面板 + 无障碍行为（useDialog：Esc/焦点陷阱/滚动锁/焦点归还）。
 * 此前 Auth/Report/Onboarding 三处各自手写 overlay+panel+stopPropagation 骨架，已收敛于此。
 * DetailView 因需要退场动画与自定义布局暂保留独立包装（同样走 useDialog）。
 */
export function Modal({
  open,
  onClose,
  ariaLabel,
  panelClass = 'max-w-sm',
  children,
}: {
  open: boolean;
  onClose: () => void;
  /** 无障碍名称（aria-label）；有可见标题时也可用 labelledBy 替代 */
  ariaLabel: string;
  /** 面板宽度等覆盖类（默认 max-w-sm），如 'max-w-md' */
  panelClass?: string;
  children: ReactNode;
}) {
  const panelRef = useDialog(onClose, open);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[var(--z-modal)] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      onClick={onClose}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className={`w-full ${panelClass} rounded-t-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-6 shadow-[var(--shadow-card-hover)] outline-none sm:rounded-xl sm:max-h-[90dvh] sm:overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

/** 弹窗标题行：左标题 + 右关闭钮（三处弹窗同款） */
export function ModalHeader({ title, onClose, closeLabel }: { title: ReactNode; onClose: () => void; closeLabel: string }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      {title}
      <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label={closeLabel}>
        ✕
      </button>
    </div>
  );
}
