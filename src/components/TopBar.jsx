import { useLocation, useParams } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCongreso } from '../context/CongresoContext';
import { obtenerAvatarUrl } from '../utils/avatar';
import { navItems, adminGroups } from '../layouts/dashboardNav';

function encontrarMejorCoincidencia(pathname, entradas, clavePath) {
  return entradas
    .slice()
    .sort((a, b) => b[clavePath].length - a[clavePath].length)
    .find((entrada) => pathname === entrada[clavePath] || pathname.startsWith(`${entrada[clavePath]}/`));
}

function construirBreadcrumb({ pathname, idCongreso, nombreCongreso }) {
  const crumbs = [nombreCongreso];

  const itemCoincidente = encontrarMejorCoincidencia(pathname, navItems(idCongreso), 'to');
  if (itemCoincidente) {
    crumbs.push(itemCoincidente.label);
    return crumbs;
  }

  const itemsAdmin = adminGroups(idCongreso).flatMap((grupo) => grupo.items);
  const subitemAdmin = encontrarMejorCoincidencia(pathname, itemsAdmin, 'path');
  crumbs.push('Administración');
  if (subitemAdmin) {
    crumbs.push(subitemAdmin.label);
  }
  return crumbs;
}

export function TopBar() {
  const location = useLocation();
  const { id_congreso } = useParams();
  const { congreso } = useCongreso();
  const { user } = useAuth();

  const crumbs = construirBreadcrumb({
    pathname: location.pathname,
    idCongreso: id_congreso,
    nombreCongreso: congreso?.nombre ?? 'Congreso',
  });

  return (
    <div className="flex h-14 shrink-0 items-center justify-between gap-4 bg-surface px-6 lg:px-10">
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
        {crumbs.map((crumb, index) => (
          <span key={`${crumb}-${index}`} className="flex min-w-0 items-center gap-1.5">
            {index > 0 && <ChevronRight className="size-3.5 shrink-0 text-text-muted" />}
            <span
              className={
                index === crumbs.length - 1
                  ? 'truncate font-medium text-text-primary'
                  : 'truncate text-text-muted'
              }
            >
              {crumb}
            </span>
          </span>
        ))}
      </nav>

      <div className="flex shrink-0 items-center gap-3">
        {congreso?.nombre && (
          <span className="hidden max-w-40 truncate text-sm font-medium text-text-primary sm:inline">
            {congreso.nombre}
          </span>
        )}
        {user && (
          <img
            src={obtenerAvatarUrl(user)}
            alt="Avatar"
            loading="lazy"
            className="size-8 shrink-0 rounded-full border border-border bg-background"
          />
        )}
      </div>
    </div>
  );
}
