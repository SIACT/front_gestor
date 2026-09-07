import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from './ui/Badge';
import { Card } from './ui/Card';
import { Alert } from './ui/Alert';
import { Spinner } from './ui/Spinner';

export function BarraEstadistica({ nombre, total, maximo }) {
  const ancho = total === 0 ? '2px' : `${(total / Math.max(maximo, 1)) * 100}%`;
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-text-primary">{nombre}</span>
        <span className="text-text-muted">{total}</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface">
        <div className="h-full rounded-full bg-accent" style={{ width: ancho }} />
      </div>
    </div>
  );
}

// limiteInicial es opcional: sin él, se listan todos los items tal como hoy. Con él,
// una lista más larga que el límite se trunca a los N primeros (ya vienen ordenados
// de mayor a menor) + un link para expandir el resto dentro de la misma columna —
// no colapsa toda la Card, solo revela el resto de esta lista puntual.
export function GrupoBarras({ titulo, items, limiteInicial }) {
  const [expandido, setExpandido] = useState(false);
  const maximo = Math.max(...items.map((item) => item.total), 1);
  const truncado = typeof limiteInicial === 'number' && items.length > limiteInicial;
  const itemsMostrados = truncado && !expandido ? items.slice(0, limiteInicial) : items;

  return (
    <div>
      <h3 className="text-xs font-medium uppercase tracking-wide text-text-muted">{titulo}</h3>
      <div className="mt-2 flex max-h-64 flex-col gap-2 overflow-y-auto pr-1">
        {itemsMostrados.map((item) => (
          <BarraEstadistica key={item.nombre} nombre={item.nombre} total={item.total} maximo={maximo} />
        ))}
        {truncado && !expandido && (
          <button
            type="button"
            onClick={() => setExpandido(true)}
            className="self-start text-xs font-medium text-accent transition-colors hover:text-accent-hover"
          >
            Ver los {items.length - limiteInicial} restantes
          </button>
        )}
      </div>
    </div>
  );
}

// Componente genérico de estadísticas: total destacado, badges de estado (siempre
// visibles) y un grid de columnas con barras horizontales detrás de "Ver detalle
// completo". Cada instancia mantiene su propio estado colapsado/expandido.
export function EstadisticasPanel({
  titulo,
  totalLabel,
  totalValue,
  grupos = [],
  grupoBadges,
  loading = false,
  error = '',
}) {
  const [expandido, setExpandido] = useState(false);

  return (
    <Card className="p-4!">
      <h2 className="text-sm font-medium uppercase tracking-wide text-text-muted">{titulo}</h2>

      {loading && (
        <div className="mt-4 flex justify-center">
          <Spinner className="size-5 text-accent" />
        </div>
      )}

      {!loading && error && (
        <Alert variant="error" className="mt-3">
          {error}
        </Alert>
      )}

      {!loading && !error && (
        <div className="mt-3 flex flex-col gap-3">
          <div>
            <p className="text-2xl font-semibold text-accent">{totalValue}</p>
            <p className="text-xs text-text-muted">{totalLabel}</p>
          </div>

          {/* Siempre visible, colapsado o no: es la info más accionable de un vistazo. */}
          {grupoBadges && (
            <div className="flex flex-wrap gap-2">
              {grupoBadges.items.map((item) => (
                <Badge key={item.nombre} variant={item.variant}>
                  {item.total} {item.nombre.toLowerCase()}
                </Badge>
              ))}
            </div>
          )}

          {grupos.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => setExpandido((v) => !v)}
                className="flex items-center gap-1 self-start text-xs font-medium text-accent transition-colors hover:text-accent-hover"
              >
                {expandido ? 'Ocultar detalle' : 'Ver detalle completo'}
                {expandido ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
              </button>

              <motion.div
                initial={false}
                animate={{ height: expandido ? 'auto' : 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 gap-4 pt-1 md:grid-cols-2">
                  {grupos.map((grupo) => (
                    <GrupoBarras
                      key={grupo.titulo}
                      titulo={grupo.titulo}
                      items={grupo.items}
                      limiteInicial={grupo.limiteInicial}
                    />
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </div>
      )}
    </Card>
  );
}
