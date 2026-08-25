import { useEffect, useRef } from 'react';

/**
 * 弹窗无障碍基座（行为层，视觉骨架见 components/Modal.tsx）：
 *  - Esc 关闭（捕获阶段，弹窗叠弹窗时最上层优先）
 *  - 焦点陷阱：Tab / Shift+Tab 循环锁在弹窗内，打开时聚焦面板，关闭时归还焦点
 *  - 背景滚动锁
 * active=false（弹窗未显示）时不挂任何监听。
 */
export function useDialog(onClose: () => void, active: boolean) {
  const panelRef = useRef<HTMLDivElement>(null);
  // onClose 走 ref：调用方常传内联箭头（每次渲染新引用），
  // 依赖里只留 active，避免监听反复拆卸导致焦点被反复抢走
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!active) return;
    const panel = panelRef.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    panel?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !panel) return;
      const focusables = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [active]);

  return panelRef;
}
