import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { useAuthBootstrap } from '@/hooks/useAuth';
import { useSupabaseKeepalive } from '@/hooks/useSupabaseKeepalive';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { router } from './routes';
import ToastContainer from '@/components/shared/ToastContainer';
import WelcomeTour from '@/components/help/WelcomeTour';
import { initTheme, useUIStore } from '@/store/uiStore';
import { useLayoutStore } from '@/store/layoutStore';

export default function App() {
  useAuthBootstrap();
  useSupabaseKeepalive();
  const textScale = useUIStore((s) => s.textScale);
  const openWelcome = useUIStore((s) => s.openWelcome);
  const toggleLeftSidebar = useLayoutStore((s) => s.toggleLeftSidebar);
  const toggleRightSidebar = useLayoutStore((s) => s.toggleRightSidebar);

  // Global keyboard shortcuts. `?` opens the WelcomeTour (the team's help
  // surface). `[` and `]` toggle the dashboard sidebars. Ignored while
  // typing in inputs/textareas (see hook implementation).
  useKeyboardShortcuts({
    onHelp: openWelcome,
    onToggleLeftSidebar: toggleLeftSidebar,
    onToggleRightSidebar: toggleRightSidebar,
  });

  useEffect(() => {
    initTheme();
  }, []);

  useEffect(() => {
    document.documentElement.style.fontSize = `${textScale * 100}%`;
  }, [textScale]);

  return (
    <>
      <RouterProvider router={router} />
      <WelcomeTour />
      <ToastContainer />
    </>
  );
}
