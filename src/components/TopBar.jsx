import { useAuth } from '../context/AuthContext';
import { useCongreso } from '../context/CongresoContext';
import { obtenerAvatarUrl } from '../utils/avatar';

export function TopBar() {
  const { congreso } = useCongreso();
  const { user } = useAuth();

  return (
    <div className="flex h-14 shrink-0 items-center justify-end gap-3 bg-surface px-6 lg:px-10">
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
  );
}
