import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PageLoader } from './ui/PageLoader';

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Mientras se consulta la sesión NO se redirige: un usuario ya logueado que abre un enlace
  // directo (p. ej. el del correo de certificados) iría al login por error.
  if (loading) {
    return <PageLoader />;
  }

  if (!user) {
    // El destino viaja en el state para que Login vuelva aquí después de iniciar sesión.
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
