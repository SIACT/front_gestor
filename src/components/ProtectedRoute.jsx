import { Navigate, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute({ children }) {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return <div className="loading-screen">Cargando...</div>;
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
      <nav className="navbar">
        <Link to="/inscripciones">Mis inscripciones</Link>
        {user.id_rol === 1 && <Link to="/admin/usuarios">Admin usuarios</Link>}
        <span className="navbar-spacer" />
        <span>{user.nombre}</span>
        <button type="button" onClick={handleLogout}>
          Cerrar sesión
        </button>
      </nav>
      {children}
    </>
  );
}
