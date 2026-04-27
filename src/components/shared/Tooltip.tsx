import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  label: string;
  children: ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
}

/**
 * Hover/focus tooltip rendered via a React portal to `document.body`.
 *
 * Why a portal: when the trigger lives inside an ancestor that has
 * `overflow: hidden` / `overflow: auto` (e.g. the 48px collapsed sidebar
 * rails, which scroll vertically), an absolutely-positioned tooltip is
 * clipped at the ancestor's bounds and never becomes visible. Portaling
 * the bubble to `document.body` and using `position: fixed` keeps it
 * above any clip rect.
 *
 * Position is recomputed from the trigger's bounding rect every time the
 * tooltip is shown, so it follows the trigger if the layout shifts.
 */
export default function Tooltip({ label, children, side = 'bottom' }: TooltipProps) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ left: number; top: number }>({ left: 0, top: 0 });

  useEffect(() => {
    if (!open) return;
    const node = triggerRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const gap = 6;
    let left = 0;
    let top = 0;
    switch (side) {
      case 'right':  left = rect.right + gap;  top = cy; break;
      case 'left':   left = rect.left - gap;   top = cy; break;
      case 'top':    left = cx;                top = rect.top - gap; break;
      case 'bottom':
      default:       left = cx;                top = rect.bottom + gap; break;
    }
    setCoords({ left, top });
  }, [open, side, label]);

  // Translate so the tooltip is anchored on the correct edge relative to its
  // computed left/top point.
  const translate =
    side === 'right'  ? 'translate(0, -50%)' :
    side === 'left'   ? 'translate(-100%, -50%)' :
    side === 'top'    ? 'translate(-50%, -100%)' :
                        'translate(-50%, 0)';

  return (
    <>
      <div
        ref={triggerRef}
        className="relative inline-flex"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        {children}
      </div>
      {open && typeof document !== 'undefined' && createPortal(
        <span
          role="tooltip"
          className="pointer-events-none fixed z-[9999] whitespace-nowrap rounded bg-gray-900 dark:bg-gray-100 px-2 py-1 text-xs font-semibold text-white dark:text-gray-900 shadow-lg"
          style={{ left: coords.left, top: coords.top, transform: translate }}
        >
          {label}
        </span>,
        document.body
      )}
    </>
  );
}
