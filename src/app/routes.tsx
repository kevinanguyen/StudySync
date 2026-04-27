import { createBrowserRouter, Navigate } from 'react-router-dom';
import LoginPage from '@/pages/LoginPage';
import SignupPage from '@/pages/SignupPage';
import DashboardPage from '@/pages/DashboardPage';
import GroupPage from '@/pages/GroupPage';
import DMPage from '@/pages/DMPage';
import SettingsPage from '@/pages/SettingsPage';
import ProtectedRoute from './ProtectedRoute';

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/dashboard" replace /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/signup', element: <SignupPage /> },
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <DashboardPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/groups/:groupId',
    element: (
      <ProtectedRoute>
        <GroupPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/dms/:friendId',
    element: (
      <ProtectedRoute>
        <DMPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/settings',
    element: (
      <ProtectedRoute>
        <SettingsPage />
      </ProtectedRoute>
    ),
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
