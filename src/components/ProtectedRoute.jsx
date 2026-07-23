import { Navigate, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PageLoader } from './ui/PageLoader';
import { Button } from './ui/Button';
import { capitalizar } from '../utils/formato';

export function ProtectedRoute({ children }) {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <>
      <nav className="flex items-center gap-6 border-b border-border bg-surface px-6 py-4">
        <Link
          to="/inscripciones"
          className="text-sm text-text-muted transition-colors hover:text-text-primary"
        >
          Mis inscripciones
        </Link>
        {user.id_rol === 1 && (
          <Link
            to="/admin/usuarios"
            className="text-sm text-text-muted transition-colors hover:text-text-primary"
          >
            Admin usuarios
          </Link>
        )}
        <span className="flex-1" />
        <span className="text-sm text-text-primary">{capitalizar(user.nombre)}</span>
        <Button type="button" variant="ghost" size="sm" onClick={handleLogout}>
          Cerrar sesión
        </Button>
      </nav>
      {children}
    </>
  );
}
