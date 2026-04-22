import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { useAuthBootstrap } from '@/hooks/useAuth';
import { useSupabaseKeepalive } from '@/hooks/useSupabaseKeepalive';
import { router } from './routes';
import ToastContainer from '@/components/shared/ToastContainer';
import WelcomeTour from '@/components/help/WelcomeTour';
import { initTheme, useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';

export default function App() {
  useAuthBootstrap();
  useSupabaseKeepalive();
  const textScale = useUIStore((s) => s.textScale);
  const openWelcome = useUIStore((s) => s.openWelcome);
  const userId = useAuthStore((s) => s.session?.user.id ?? null);

  useEffect(() => {
    initTheme();
  }, []);

  useEffect(() => {
    document.documentElement.style.fontSize = `${textScale * 100}%`;
  }, [textScale]);

  useEffect(() => {
    if (!userId || typeof window === 'undefined') return;
    if (localStorage.getItem('studysync.showWelcome') !== 'true') return;
    localStorage.removeItem('studysync.showWelcome');
    openWelcome();
  }, [userId, openWelcome]);

  return (
    <>
      <RouterProvider router={router} />
      <WelcomeTour />
      <ToastContainer />
    </>
  );
}
