import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../utils/roles';
import { useTheme } from '../context/ThemeContext';
import { capitalizar } from '../utils/formato';
import { Logo } from '../components/ui/Logo';

const ADMIN_GLOBAL_TABS = [
  { to: '/admin/usuarios', label: 'Usuarios' },
  { to: '/admin/instituciones', label: 'Instituciones' },
  { to: '/perfil', label: 'Mi perfil' },
];

export function GlobalLayout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen w-full bg-background">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-4">
          <Logo variant="altenua" className="h-8 w-auto" />
          {location.pathname !== '/' && (
            <Link
              to="/"
              className="text-sm text-text-muted transition-colors hover:text-text-primary"
            >
              ← Congresos
            </Link>
          )}
        </div>
        <div className="flex items-center gap-4">
          {user && (
            <span className="hidden text-sm text-text-muted sm:inline">
              {capitalizar(user.nombre)} {capitalizar(user.apellido)}
            </span>
          )}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
            className="flex size-8 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface hover:text-text-primary"
          >
            {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="text-sm text-text-muted transition-colors hover:text-text-primary"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      {user?.id_rol === ROLES.ADMIN && (
        <nav className="flex items-center gap-6 border-b border-border px-6">
          {ADMIN_GLOBAL_TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end
              className={({ isActive }) =>
                clsx(
                  'border-b-2 py-3 text-sm font-medium transition-colors',
                  isActive
                    ? 'border-accent text-accent'
                    : 'border-transparent text-text-muted hover:text-text-primary',
                )
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      )}

      <Outlet />
    </div>
  );
}
