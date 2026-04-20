import { RouterProvider } from 'react-router-dom';
import { useAuthBootstrap } from '@/hooks/useAuth';
import { router } from './routes';

export default function App() {
  useAuthBootstrap();
  return <RouterProvider router={router} />;
}
