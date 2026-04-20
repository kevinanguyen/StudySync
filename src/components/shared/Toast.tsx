import { useEffect } from 'react';
import type { Toast as ToastType } from '@/store/uiStore';
import { useUIStore } from '@/store/uiStore';

interface ToastProps {
  toast: ToastType;
  durationMs?: number;
}

const STYLES: Record<ToastType['level'], { bg: string; border: string; text: string; icon: string }> = {
  success: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-900', icon: '✓' },
  error:   { bg: 'bg-red-50',     border: 'border-red-200',     text: 'text-red-900',     icon: '!' },
  info:    { bg: 'bg-blue-50',    border: 'border-blue-200',    text: 'text-blue-900',    icon: 'ⓘ' },
};

export default function Toast({ toast, durationMs = 3000 }: ToastProps) {
  const dismiss = useUIStore((s) => s.dismissToast);
  const style = STYLES[toast.level];

  useEffect(() => {
    const handle = setTimeout(() => dismiss(toast.id), durationMs);
    return () => clearTimeout(handle);
  }, [toast.id, dismiss, durationMs]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-start gap-2 ${style.bg} ${style.border} ${style.text} border rounded-md shadow-sm px-3 py-2 min-w-[220px] max-w-sm`}
    >
      <span aria-hidden className="font-bold text-sm leading-none mt-0.5">{style.icon}</span>
      <span className="text-sm flex-1">{toast.message}</span>
      <button
        type="button"
        onClick={() => dismiss(toast.id)}
        aria-label="Dismiss"
        className="text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
