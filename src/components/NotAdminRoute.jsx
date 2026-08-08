import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function NotAdminRoute() {
  const { user } = useAuth();

  if (user?.id_rol === 1) {
    return <Navigate to="/admin/usuarios" replace />;
  }

  return <Outlet />;
}
