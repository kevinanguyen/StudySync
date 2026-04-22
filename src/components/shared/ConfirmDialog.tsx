import { useEffect, useRef } from 'react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useUIStore } from '@/store/uiStore';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  /** When true, disables both buttons and shows `loadingLabel` on the confirm button. */
  loading?: boolean;
  loadingLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
  loadingLabel = 'Working…',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const theme = useUIStore((s) => s.theme);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, open);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !loading) onCancel();
    }
    document.addEventListener('keydown', onKey);
    confirmRef.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onCancel, loading]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <button
        type="button"
        onClick={loading ? undefined : onCancel}
        aria-label="Close dialog"
        className="absolute inset-0 bg-black/40 cursor-default"
        disabled={loading}
      />
      <div ref={panelRef} className={`relative rounded-xl shadow-xl max-w-sm w-full p-5 ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'}`}>
        <h3 id="confirm-title" className={`text-base font-bold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'} mb-1`}>
          {title}
        </h3>
        <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-sm text-gray-600'} mb-5`}>{message}</p>
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className={`text-sm font-semibold px-3 py-1.5 rounded-md border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${theme === 'dark' ? 'text-gray-300 border-slate-700 hover:bg-slate-700' : 'text-gray-700 border border-gray-200 hover:bg-gray-50'}`}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`text-sm font-semibold text-white px-3 py-1.5 rounded-md transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
              destructive ? 'bg-red-600 hover:bg-red-700' : 'bg-[#3B5BDB] hover:bg-[#3451c7]'
            }`}
          >
            {loading ? loadingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
