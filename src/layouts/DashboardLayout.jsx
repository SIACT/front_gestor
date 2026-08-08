import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FolderTree,
  LogOut,
  Menu,
  Mic,
  Moon,
  Percent,
  PlusCircle,
  Receipt,
  Settings,
  Sun,
  Tag,
  User,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Logo } from '../components/ui/Logo';
import { capitalizar } from '../utils/formato';

const NAV_ITEMS = [
  { to: '/inscripciones', label: 'Mis inscripciones', icon: ClipboardList },
  { to: '/inscripciones/nueva', label: 'Nueva inscripción', icon: PlusCircle },
  { to: '/ponencias', label: 'Mis ponencias', icon: Mic, roles: [1, 2] },
  { to: '/perfil', label: 'Mi perfil', icon: User },
];

const ADMIN_SUBLINKS = [
  { label: 'Usuarios', path: '/admin/usuarios', icon: Users },
  { label: 'Tipos de asistente', path: '/admin/tipos-asistente', icon: Tag },
  { label: 'Categorías', path: '/admin/categorias', icon: FolderTree },
  { label: 'Descuentos', path: '/admin/descuentos', icon: Percent },
  { label: 'Inscripciones', path: '/admin/inscripciones', icon: Receipt },
  { label: 'Ponencias', path: '/admin/ponencias', icon: Mic },
];

const ROL_LABELS = { 1: 'Admin', 2: 'Ponente', 3: 'Estudiante' };

function NavItem({ to, icon: Icon, label, collapsed, onClick }) {
  return (
    <NavLink
      to={to}
      end
      onClick={onClick}
      className={({ isActive }) =>
        clsx(
          'flex items-center gap-3 rounded-lg border-l-2 px-3 py-2.5 text-sm transition-colors',
          isActive
            ? 'border-accent bg-accent/10 text-accent'
            : 'border-transparent text-text-muted hover:text-text-primary',
          collapsed && 'justify-center px-0',
        )
      }
    >
      <Icon className="size-5 shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </NavLink>
  );
}

function AdminSection({ collapsed, onNavigate, onExpandSidebar }) {
  const location = useLocation();
  const [open, setOpen] = useState(() => location.pathname.startsWith('/admin'));

  function handleToggle() {
    if (collapsed) {
      onExpandSidebar?.();
      setOpen(true);
      return;
    }
    setOpen((value) => !value);
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleToggle}
        className={clsx(
          'flex w-full items-center gap-3 rounded-lg border-l-2 border-transparent px-3 py-2.5 text-sm text-text-muted transition-colors hover:text-text-primary',
          collapsed && 'justify-center px-0',
        )}
      >
        <Settings className="size-5 shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1 truncate text-left">Administración</span>
            {open ? (
              <ChevronDown className="size-4 shrink-0" />
            ) : (
              <ChevronRight className="size-4 shrink-0" />
            )}
          </>
        )}
      </button>

      {!collapsed && open && (
        <div className="ml-4 mt-1 space-y-1 border-l border-border pl-2">
          {ADMIN_SUBLINKS.map((item) => (
            <NavItem
              key={item.path}
              to={item.path}
              icon={item.icon}
              label={item.label}
              collapsed={false}
              onClick={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SidebarContent({ collapsed, onNavigate, onToggleCollapse, onExpandSidebar }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const rolLabel = user?.rol?.nombre ?? ROL_LABELS[user?.id_rol] ?? '';

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="flex h-full flex-col">
      <div
        className={clsx(
          'flex items-center border-b border-border px-4 py-4',
          collapsed ? 'flex-col gap-3' : 'justify-between',
        )}
      >
        {collapsed ? (
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-accent/10 text-sm font-bold text-accent">
            A
          </div>
        ) : (
          <Logo variant="altenua" className="h-8 w-auto" />
        )}
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
            className="flex size-7 shrink-0 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-background hover:text-text-primary"
          >
            {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(user?.id_rol)).map((item) => (
          <NavItem key={item.to} {...item} collapsed={collapsed} onClick={onNavigate} />
        ))}

        {user?.id_rol === 1 && (
          <AdminSection
            collapsed={collapsed}
            onNavigate={onNavigate}
            onExpandSidebar={onExpandSidebar}
          />
        )}
      </nav>

      <div className={clsx('border-t border-border p-4', collapsed && 'flex flex-col items-center gap-2')}>
        {!collapsed && (
          <div className="mb-3 min-w-0">
            <p className="truncate text-sm font-medium text-text-primary">
              {capitalizar(user?.nombre)} {capitalizar(user?.apellido)}
            </p>
            <p className="truncate text-xs text-text-muted">{rolLabel}</p>
          </div>
        )}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
          className={clsx(
            'flex items-center gap-2 rounded-lg text-sm text-text-muted transition-colors hover:text-text-primary',
            collapsed ? 'justify-center p-2' : 'w-full px-3 py-2',
          )}
        >
          {theme === 'dark' ? (
            <Sun className="size-4 shrink-0" />
          ) : (
            <Moon className="size-4 shrink-0" />
          )}
          {!collapsed && <span>{theme === 'dark' ? 'Tema claro' : 'Tema oscuro'}</span>}
        </button>
        <button
          type="button"
          onClick={handleLogout}
          className={clsx(
            'flex items-center gap-2 rounded-lg text-sm text-text-muted transition-colors hover:text-text-primary',
            collapsed ? 'justify-center p-2' : 'w-full px-3 py-2',
          )}
        >
          <LogOut className="size-4 shrink-0" />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
      </div>
    </div>
  );
}

export function DashboardLayout() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('sidebar-collapsed') === 'true',
  );
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen bg-background">
      <aside
        style={{ width: collapsed ? 72 : 240 }}
        className="hidden shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-200 lg:sticky lg:top-0 lg:flex lg:h-screen"
      >
        <SidebarContent
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((value) => !value)}
          onExpandSidebar={() => setCollapsed(false)}
        />
      </aside>

      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-surface px-4 lg:hidden">
        <Logo variant="altenua" className="h-7 w-auto" />
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menú"
          className="flex size-8 items-center justify-center rounded-md text-text-primary transition-colors hover:bg-background"
        >
          <Menu className="size-5" />
        </button>
      </header>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="mobile-overlay"
            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
          />
        )}
        {mobileOpen && (
          <motion.aside
            key="mobile-drawer"
            className="fixed inset-y-0 left-0 z-50 flex w-60 flex-col bg-surface lg:hidden"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'tween', duration: 0.25 }}
          >
            <SidebarContent collapsed={false} onNavigate={() => setMobileOpen(false)} />
          </motion.aside>
        )}
      </AnimatePresence>

      <main className="flex-1 overflow-y-auto bg-background px-6 pb-6 pt-20 lg:p-10">
        <Outlet />
      </main>
    </div>
  );
}
