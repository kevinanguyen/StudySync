import { create } from 'zustand';

export type ToastLevel = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  level: ToastLevel;
  message: string;
}

interface UIState {
  toasts: Toast[];
  showToast: (input: { level: ToastLevel; message: string }) => string;
  dismissToast: (id: string) => void;
}

function makeId(): string {
  return `t_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export const useUIStore = create<UIState>((set) => ({
  toasts: [],
  showToast: (input) => {
    const id = makeId();
    set((s) => ({ toasts: [...s.toasts, { id, ...input }] }));
    return id;
  },
  dismissToast: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
}));
