import { Navigate, Outlet, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCongreso } from '../context/CongresoContext';
import { PageLoader } from './ui/PageLoader';
import { ROLES } from '../utils/roles';

export function CongresoAdminRoute() {
  const { user } = useAuth();
  const { id_congreso } = useParams();
  const { puedeAdministrarCongreso, loading } = useCongreso();

  if (loading) return <PageLoader />;

  if (user?.id_rol !== ROLES.ADMIN && !puedeAdministrarCongreso) {
    return <Navigate to={`/congresos/${id_congreso}/inscripciones`} replace />;
  }

  return <Outlet />;
}
