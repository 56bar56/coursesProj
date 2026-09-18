import { Navigate, Outlet } from 'react-router-dom';
import { useMe } from '../features/auth/hooks';

export function ProtectedRoute() {
  const { data: user, isLoading } = useMe();

  if (isLoading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
