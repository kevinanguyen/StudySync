import { create } from 'zustand';

export type ToastLevel = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  level: ToastLevel;
  message: string;
}

type Theme = 'light' | 'dark';

interface UIState {
  toasts: Toast[];

  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;

showToast: (input: { level: ToastLevel; message: string; duration?: number }) => string;
  dismissToast: (id: string) => void;
}

function makeId(): string {
  return `t_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export const useUIStore = create<UIState>((set) => ({
  toasts: [],

  theme: 'light',
  setTheme: (theme) => {
    // Persist and apply to document
    if (typeof document !== 'undefined') {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        document.body.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.body.classList.remove('dark');
      }
    }
    if (typeof window !== 'undefined') localStorage.setItem('theme', theme);
    set({ theme });
  },
  toggleTheme: () =>
    set((s) => {
      const next = s.theme === 'light' ? 'dark' : 'light';
      if (typeof document !== 'undefined') {
        if (next === 'dark') {
          document.documentElement.classList.add('dark');
          document.body.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
          document.body.classList.remove('dark');
        }
      }
      if (typeof window !== 'undefined') localStorage.setItem('theme', next);
      return { theme: next };
    }),

    showToast: ({ level, message, duration = 3000 }) => {
      const id = makeId();

      set((s) => ({
        toasts: [...s.toasts, { id, level, message }],
      }));

      setTimeout(() => {
        set((s) => ({
          toasts: s.toasts.filter((t) => t.id !== id),
        }));
      }, duration);

      return id;
    },

  dismissToast: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
}));

/**
 * Initialize theme from persisted preference or system preference.
 * Call once on app mount.
 */
export function initTheme() {
  const stored = typeof window !== 'undefined' ? localStorage.getItem('theme') : null;
  let t: Theme = 'light';
  if (stored === 'light' || stored === 'dark') {
    t = stored as Theme;
  } else {
    const prefersDark =
      typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    t = prefersDark ? 'dark' : 'light';
  }
  // Apply DOM + persist
  if (typeof document !== 'undefined') {
    if (t === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  }
  if (typeof window !== 'undefined') localStorage.setItem('theme', t);
  useUIStore.setState({ theme: t });
}
