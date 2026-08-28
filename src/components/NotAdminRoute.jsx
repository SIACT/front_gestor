import { Navigate, Outlet, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../utils/roles';

export function NotAdminRoute() {
  const { user } = useAuth();
  const { id_congreso } = useParams();

  if (user?.id_rol === ROLES.ADMIN || user?.id_rol === ROLES.ADMIN_CONGRESO) {
    return <Navigate to={`/congresos/${id_congreso}/admin/inscripciones`} replace />;
  }

  return <Outlet />;
}
