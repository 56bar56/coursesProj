import { Navigate, Outlet } from 'react-router-dom';
import { useMe } from '../features/auth/hooks';
import type { Role } from '../features/auth/types';

export function ProtectedRoute({ role }: { role?: Role }) {
  const { data: user, isLoading } = useMe();

  if (isLoading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (role && !user.roles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
