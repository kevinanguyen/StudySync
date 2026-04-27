import { useEffect } from 'react';

interface ShortcutHandlers {
  onHelp?: () => void;               // ?
  onToggleLeftSidebar?: () => void;  // [
  onToggleRightSidebar?: () => void; // ]
  // Room to grow — C (new event), G (new group), / (focus search)
}

/**
 * Global keyboard shortcut dispatcher. Mount once at the App root.
 *
 * Ignores keypresses while the user is typing in an input / textarea /
 * select / contenteditable, and ignores modifier combinations so we don't
 * swallow browser / OS shortcuts.
 */
export function useKeyboardShortcuts(handlers: ShortcutHandlers): void {
  useEffect(() => {
    function handle(e: KeyboardEvent) {
      // Ignore when typing in an input / textarea / select / contenteditable.
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) return;
      }
      // Ignore modifier combos — '?' is typed with shift, so shiftKey is allowed.
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === '?' && handlers.onHelp) {
        e.preventDefault();
        handlers.onHelp();
        return;
      }
      if (e.key === '[' && handlers.onToggleLeftSidebar) {
        e.preventDefault();
        handlers.onToggleLeftSidebar();
        return;
      }
      if (e.key === ']' && handlers.onToggleRightSidebar) {
        e.preventDefault();
        handlers.onToggleRightSidebar();
        return;
      }
    }
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [handlers.onHelp, handlers.onToggleLeftSidebar, handlers.onToggleRightSidebar]);
}
