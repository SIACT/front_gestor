import { useEffect, useState } from 'react';
import { apiFetch } from '../api/client';

// El backend combina automáticamente los mensajes de contexto 'general' con los
// del contexto pedido (ver GET /congresos/:id_congreso/mensajes-predeterminados),
// así que este componente no necesita pedir ambos por separado.
export function SugerenciasMensaje({ idCongreso, contexto, onSelect, siempreVisible = false }) {
  const [mensajes, setMensajes] = useState([]);

  useEffect(() => {
    setMensajes([]);
    if (!idCongreso || !contexto) return;
    apiFetch(`/congresos/${idCongreso}/mensajes-predeterminados?contexto=${contexto}&activo=true`)
      .then((data) => setMensajes(data ?? []))
      .catch(() => setMensajes([]));
  }, [idCongreso, contexto]);

  if (mensajes.length === 0) return null;

  // siempreVisible se usa cuando el llamador ya envuelve este componente en su propia
  // Card/título "Sugerencias" — evita repetir la misma etiqueta dos veces seguidas.
  return (
    <div className="flex flex-col gap-1.5">
      {!siempreVisible && (
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Sugerencias:</p>
      )}
      <div className="flex flex-wrap gap-2">
        {mensajes.map((mensaje) => (
          <button
            key={mensaje.id_mensaje}
            type="button"
            onClick={() => onSelect(mensaje.texto)}
            className="rounded-full border border-border bg-surface px-3 py-1 text-xs text-text-muted transition-colors hover:border-accent hover:text-accent"
          >
            {mensaje.texto}
          </button>
        ))}
      </div>
    </div>
  );
}
