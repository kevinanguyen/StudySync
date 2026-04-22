import { useEffect, useRef, type ReactNode } from 'react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useUIStore } from '@/store/uiStore';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: number; // px, default 420
}

export default function Drawer({ open, onClose, title, children, footer, width = 420 }: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, open);

  const theme = useUIStore((s) => s.theme);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    // Focus the panel so keyboard nav starts inside the drawer
    panelRef.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={title}>
      {/* backdrop */}
      <button
        type="button"
        aria-label="Close drawer"
        onClick={onClose}
        className="absolute inset-0 bg-black/30 cursor-default"
      />
      {/* panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        style={{ width }}
        className={`relative h-full shadow-xl flex flex-col focus:outline-none animate-in slide-in-from-right duration-150 ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'}`}
      >
        <div className={`flex items-center justify-between px-5 py-3 flex-shrink-0 ${theme === 'dark' ? 'border-b border-slate-700' : 'border-b border-gray-200'}`}>
          <h2 className={`text-base font-bold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={`${theme === 'dark' ? 'text-gray-300 hover:text-gray-50 transition-colors p-1 rounded hover:bg-slate-700' : 'text-gray-400 hover:text-gray-700 transition-colors p-1 rounded hover:bg-gray-100'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className={`${theme === 'dark' ? 'px-5 py-3 border-t border-slate-700 flex-shrink-0' : 'px-5 py-3 border-t border-gray-200 flex-shrink-0'}`}>{footer}</div>}
      </div>
    </div>
  );
}
