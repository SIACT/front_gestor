import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function AdminRoute() {
  const { user } = useAuth();

  if (user?.id_rol !== 1) {
    return <Navigate to="/inscripciones" replace />;
  }

  return <Outlet />;
}
