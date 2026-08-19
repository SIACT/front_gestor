import { useState } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function BannerCedulaFaltante() {
  const { user } = useAuth();
  const [cerrado, setCerrado] = useState(false);

  if (cerrado || !user || user.cedula) return null;

  return (
    <div
      role="alert"
      className="relative mb-6 mt-4 flex items-start gap-3 rounded-lg bg-warning-bg px-3 py-2.5 pr-10 text-sm text-warning-text"
    >
      <p className="flex-1">
        Aún no has registrado tu número de documento. Es necesario para poder emitir tu
        certificado de asistencia.{' '}
        <Link to="/perfil" className="font-medium text-accent hover:underline">
          Completar ahora
        </Link>
      </p>
      <button
        type="button"
        onClick={() => setCerrado(true)}
        aria-label="Cerrar"
        className="absolute right-2 top-2 flex size-6 shrink-0 items-center justify-center rounded-md text-warning-text transition-colors hover:bg-black/10"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
