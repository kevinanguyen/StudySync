import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { useAuthBootstrap } from '@/hooks/useAuth';
import { useSupabaseKeepalive } from '@/hooks/useSupabaseKeepalive';
import { router } from './routes';
import ToastContainer from '@/components/shared/ToastContainer';
import { initTheme, useUIStore } from '@/store/uiStore';

export default function App() {
  useAuthBootstrap();
  useSupabaseKeepalive();
  const textScale = useUIStore((s) => s.textScale);

  useEffect(() => {
    initTheme();
  }, []);

  useEffect(() => {
    document.documentElement.style.fontSize = `${textScale * 100}%`;
  }, [textScale]);

  return (
    <>
      <RouterProvider router={router} />
      <ToastContainer />
    </>
  );
}