import { RouterProvider } from 'react-router-dom';
import { useAuthBootstrap } from '@/hooks/useAuth';
import { useSupabaseKeepalive } from '@/hooks/useSupabaseKeepalive';
import { router } from './routes';
import ToastContainer from '@/components/shared/ToastContainer';

export default function App() {
  useAuthBootstrap();
  useSupabaseKeepalive();
  return (
    <>
      <RouterProvider router={router} />
      <ToastContainer />
    </>
  );
}
