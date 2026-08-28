import { Navigate, Outlet, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../utils/roles';

export function AdminRoute() {
  const { user } = useAuth();
  const { id_congreso } = useParams();

  if (user?.id_rol !== ROLES.ADMIN) {
    return <Navigate to={id_congreso ? `/congresos/${id_congreso}/inscripciones` : '/'} replace />;
  }

  return <Outlet />;
}
