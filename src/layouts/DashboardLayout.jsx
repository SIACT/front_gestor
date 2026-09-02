import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import {
  ArrowLeftRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  Moon,
  Settings,
  Sun,
  User,
  UserCog,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useCongreso } from '../context/CongresoContext';
import { BannerCedulaFaltante } from '../components/BannerCedulaFaltante';
import { TopBar } from '../components/TopBar';
import { Alert } from '../components/ui/Alert';
import { Logo } from '../components/ui/Logo';
import { capitalizar } from '../utils/formato';
import { ROLES, ROL_LABELS } from '../utils/roles';
import { navItems, adminGroups, adminLinks } from './dashboardNav';

function SectionLabel({ collapsed, children }) {
  if (collapsed) return null;
  return (
    <p className="px-3 pb-1 pt-4 text-xs font-medium uppercase tracking-wide text-text-muted first:pt-0">
      {children}
    </p>
  );
}

function NavItem({ to, icon: Icon, label, collapsed, onClick, nested = false }) {
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
            : clsx(
                'border-transparent hover:text-text-primary',
                nested ? 'text-text-muted/70' : 'text-text-muted',
              ),
          collapsed && 'justify-center px-0',
        )
      }
    >
      <Icon className="size-5 shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </NavLink>
  );
}

function NavButton({ icon: Icon, label, collapsed, onClick, ariaLabel }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={collapsed ? ariaLabel : undefined}
      className={clsx(
        'flex w-full items-center gap-3 rounded-lg border-l-2 border-transparent px-3 py-2.5 text-sm text-text-muted transition-colors hover:text-text-primary',
        collapsed && 'justify-center px-0',
      )}
    >
      <Icon className="size-5 shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </button>
  );
}

function DisabledNavItem({ icon: Icon, label, collapsed, title }) {
  return (
    <div
      title={title}
      className={clsx(
        'flex cursor-not-allowed items-center gap-3 rounded-lg border-l-2 border-transparent px-3 py-2.5 text-sm text-text-muted opacity-50',
        collapsed && 'justify-center px-0',
      )}
    >
      <Icon className="size-5 shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </div>
  );
}

function AdminGroup({ group, onNavigate }) {
  const location = useLocation();
  const [open, setOpen] = useState(() =>
    group.items.some((item) => location.pathname.startsWith(item.path)),
  );
  const Icon = group.icon;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-3 rounded-lg border-l-2 border-transparent px-3 py-2 text-sm text-text-muted transition-colors hover:text-text-primary"
      >
        <Icon className="size-4 shrink-0" />
        <span className="flex-1 truncate text-left">{group.label}</span>
        {open ? (
          <ChevronDown className="size-4 shrink-0" />
        ) : (
          <ChevronRight className="size-4 shrink-0" />
        )}
      </button>

      {open && (
        <div className="ml-4 mt-1 space-y-1 border-l border-border pl-2">
          {group.items.map((item) => (
            <NavItem
              key={item.path}
              to={item.path}
              icon={item.icon}
              label={item.label}
              collapsed={false}
              nested
              onClick={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AdminSection({ collapsed, onNavigate, onExpandSidebar, idCongreso }) {
  const location = useLocation();
  const [open, setOpen] = useState(() =>
    location.pathname.startsWith(`/congresos/${idCongreso}/admin`),
  );

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
          {adminLinks(idCongreso).map((item) => (
            <NavItem
              key={item.path}
              to={item.path}
              icon={item.icon}
              label={item.label}
              collapsed={false}
              nested
              onClick={onNavigate}
            />
          ))}
          {adminGroups(idCongreso).map((group) => (
            <AdminGroup key={group.label} group={group} onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </div>
  );
}

function SidebarContent({ collapsed, onNavigate, onToggleCollapse, onExpandSidebar, tieneInscripcion }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { congreso, puedeAdministrarCongreso, esExpositorEnEsteCongreso } = useCongreso();
  const { id_congreso } = useParams();
  const navigate = useNavigate();
  const rolLabel = user?.rol?.nombre ?? ROL_LABELS[user?.id_rol] ?? '';
  const esAdmin = user?.id_rol === ROLES.ADMIN || puedeAdministrarCongreso;
  const [cuentaAbierta, setCuentaAbierta] = useState(false);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  function handleToggleCuenta() {
    if (collapsed) {
      onExpandSidebar?.();
      setCuentaAbierta(true);
      return;
    }
    setCuentaAbierta((value) => !value);
  }

  return (
    <div className="flex h-full flex-col">
      <div
        className={clsx(
          'flex items-center gap-3 border-b border-border px-4 py-6',
          collapsed ? 'flex-col justify-center' : 'justify-between',
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <Logo variant="altenua" className="h-8 w-8 shrink-0" />
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate font-display text-sm text-text-primary">Altenua</p>
              <p className="truncate text-[10px] uppercase tracking-wide text-text-muted">
                {congreso?.nombre ?? 'Cargando...'}
              </p>
            </div>
          )}
        </div>
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
        <SectionLabel collapsed={collapsed}>Workspace</SectionLabel>
        {navItems(id_congreso)
          .filter((item) => !item.roles || item.roles.includes(user?.id_rol))
          .filter((item) => item.label !== 'Mis ponencias' || esExpositorEnEsteCongreso)
          .map((item) => {
            if (item.label === 'Nueva inscripción' && tieneInscripcion) {
              return (
                <DisabledNavItem
                  key={item.to}
                  icon={item.icon}
                  label={item.label}
                  collapsed={collapsed}
                  title="Ya tienes una inscripción activa en este congreso"
                />
              );
            }
            return <NavItem key={item.to} {...item} collapsed={collapsed} onClick={onNavigate} />;
          })}

        {esAdmin && (
          <>
            <SectionLabel collapsed={collapsed}>Sistema</SectionLabel>
            <AdminSection
              collapsed={collapsed}
              onNavigate={onNavigate}
              onExpandSidebar={onExpandSidebar}
              idCongreso={id_congreso}
            />
          </>
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
          onClick={handleToggleCuenta}
          className={clsx(
            'flex w-full items-center gap-3 rounded-lg border-l-2 border-transparent px-3 py-2.5 text-sm text-text-muted transition-colors hover:text-text-primary',
            collapsed && 'justify-center px-0',
          )}
        >
          <UserCog className="size-5 shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 truncate text-left">Cuenta</span>
              {cuentaAbierta ? (
                <ChevronDown className="size-4 shrink-0" />
              ) : (
                <ChevronRight className="size-4 shrink-0" />
              )}
            </>
          )}
        </button>

        {!collapsed && cuentaAbierta && (
          <div className="ml-4 mt-1 space-y-1 border-l border-border pl-2">
            <NavItem to="/perfil" icon={User} label="Mi perfil" collapsed={false} onClick={onNavigate} />
            <NavButton
              icon={theme === 'dark' ? Sun : Moon}
              label={theme === 'dark' ? 'Tema claro' : 'Tema oscuro'}
              ariaLabel={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
              collapsed={false}
              onClick={toggleTheme}
            />
            <NavItem
              to="/"
              icon={ArrowLeftRight}
              label="Cambiar de congreso"
              collapsed={false}
              onClick={onNavigate}
            />
            <NavButton
              icon={LogOut}
              label="Cerrar sesión"
              ariaLabel="Cerrar sesión"
              collapsed={false}
              onClick={handleLogout}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export function DashboardLayout() {
  const location = useLocation();
  const { congreso, misInscripcion } = useCongreso();
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
    <div className="flex h-screen overflow-hidden bg-background">
      <aside
        style={{ width: collapsed ? 72 : 280 }}
        className="hidden shrink-0 flex-col bg-surface transition-[width] duration-200 lg:sticky lg:top-0 lg:flex lg:h-screen"
      >
        <SidebarContent
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((value) => !value)}
          onExpandSidebar={() => setCollapsed(false)}
          tieneInscripcion={Boolean(misInscripcion)}
        />
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden bg-surface">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface px-4 lg:hidden">
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

        <div className="flex flex-1 flex-col overflow-hidden bg-surface lg:rounded-tl-xl">
          <TopBar />
          <main className="flex-1 overflow-y-auto lg:rounded-tl-xl bg-background">
            <div className="px-6 py-0! lg:p-10">
              {congreso?.activo === false && (
                <Alert variant="warning" className="mt-4 lg:mt-6">
                  Este congreso no está activo actualmente.
                </Alert>
              )}
              <BannerCedulaFaltante />
              <Outlet />
            </div>
          </main>
        </div>
      </div>

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
            className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-surface lg:hidden"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'tween', duration: 0.25 }}
          >
            <SidebarContent
              collapsed={false}
              onNavigate={() => setMobileOpen(false)}
              tieneInscripcion={Boolean(misInscripcion)}
            />
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
