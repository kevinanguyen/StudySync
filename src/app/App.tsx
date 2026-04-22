import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { useAuthBootstrap } from '@/hooks/useAuth';
import { useSupabaseKeepalive } from '@/hooks/useSupabaseKeepalive';
import { router } from './routes';
import ToastContainer from '@/components/shared/ToastContainer';
import { initTheme } from '@/store/uiStore';

export default function App() {
  useAuthBootstrap();
  useSupabaseKeepalive();

  // Initialize theme on mount (reads localStorage / system pref and applies DOM class)
  useEffect(() => {
    initTheme();
  }, []);

  return (
    <>
      <RouterProvider router={router} />
      <ToastContainer />
    </>
  );
}
