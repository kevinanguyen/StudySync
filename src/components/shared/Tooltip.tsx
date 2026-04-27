import type { ReactNode } from 'react';

interface TooltipProps {
  label: string;
  children: ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
}

export default function Tooltip({ label, children, side = 'bottom' }: TooltipProps) {
  const position = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-1',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-1',
    left: 'right-full top-1/2 -translate-y-1/2 mr-1',
    right: 'left-full top-1/2 -translate-y-1/2 ml-1',
  }[side];
  return (
    <div className="relative inline-flex group">
      {children}
      <span
        role="tooltip"
        // Light mode: dark bubble + white text. Dark mode: light bubble +
        // dark text — flips so the tooltip stays high-contrast against the
        // surrounding panel/page background in either theme.
        className={`pointer-events-none absolute z-50 whitespace-nowrap rounded bg-gray-900 dark:bg-gray-100 px-2 py-1 text-xs font-semibold text-white dark:text-gray-900 opacity-0 shadow-lg transition-opacity duration-100 group-hover:opacity-100 group-focus-within:opacity-100 ${position}`}
      >
        {label}
      </span>
    </div>
  );
}
