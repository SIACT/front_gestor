import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Info } from 'lucide-react';
import { apiFetch } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { capitalizar } from '../utils/formato';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import { PageLoader } from '../components/ui/PageLoader';

// Valor fijo hasta que el backend exponga un endpoint de "evento activo".
const EVENTO = 'ALTENCOA 11 · 2026';

function formatCOP(value) {
  return Number(value).toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  });
}

function formatFecha(value) {
  return new Date(value).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function TagIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581a1.5 1.5 0 002.122 0l4.318-4.318a1.5 1.5 0 000-2.122l-9.581-9.581A2.25 2.25 0 009.568 3z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
    </svg>
  );
}

function PersonIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
      />
    </svg>
  );
}

function CalendarIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
      />
    </svg>
  );
}

export function MisInscripciones() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [inscripciones, setInscripciones] = useState([]);
  const [categoriasPorId, setCategoriasPorId] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([apiFetch('/inscripciones'), apiFetch('/categorias')])
      .then(([inscripcionesData, categoriasData]) => {
        setInscripciones(inscripcionesData ?? []);
        const mapa = {};
        for (const categoria of categoriasData ?? []) {
          mapa[categoria.id_categoria] = categoria.nombre;
        }
        setCategoriasPorId(mapa);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-20">
      <div className="flex items-start justify-between gap-4">
        <h1 className="font-sans text-2xl font-bold text-text-primary">Mis inscripciones</h1>
        <div className="flex flex-col items-end gap-1">
          <Button
            variant="primary"
            disabled={inscripciones.length > 0}
            onClick={() => navigate('/inscripciones/nueva')}
          >
            Nueva inscripción
          </Button>
          {inscripciones.length > 0 && (
            <p className="flex items-center gap-1 text-xs text-text-muted">
              <Info className="size-3.5" />
              Ya tienes una inscripción activa. Solo se permite una por usuario.
            </p>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="error" className="mt-6">
          {error}
        </Alert>
      )}

      {!error && inscripciones.length === 0 && (
        <div className="mt-16 flex flex-col items-center gap-4 text-center">
          <p className="text-sm text-text-muted">Todavía no tienes inscripciones.</p>
          <Button variant="primary" onClick={() => navigate('/inscripciones/nueva')}>
            Nueva inscripción
          </Button>
        </div>
      )}

      {!error && inscripciones.length > 0 && (
        <ul className="mt-6 flex flex-col gap-4">
          {inscripciones.map((inscripcion) => {
            const costoBase = Number(inscripcion.costo_base);
            const descuentoAplicado = Number(inscripcion.descuento_aplicado);
            const costoFinal = Number(inscripcion.costo_final);
            const numDescuentos = inscripcion.inscripcion_descuentos?.length ?? 0;
            const nombreCategoria =
              categoriasPorId[inscripcion.id_categoria] ?? `Categoría #${inscripcion.id_categoria}`;

            return (
              <li key={inscripcion.id_inscripcion}>
                <Link to={`/inscripciones/${inscripcion.id_inscripcion}`}>
                  <Card className="transition-colors hover:border-accent">
                    <p className="text-xs font-medium uppercase tracking-wide text-accent">{EVENTO}</p>

                    <div className="mt-3 flex items-start justify-between gap-4">
                      <div>
                        <p className="text-base font-medium text-text-primary">{nombreCategoria}</p>
                        <p className="mt-0.5 text-sm text-text-muted">{inscripcion.tipo_asistente?.tipo}</p>
                      </div>
                      <Badge variant={inscripcion.estado_inscripcion === 'pendiente' ? 'pendiente' : 'default'}>
                        {inscripcion.estado_inscripcion}
                      </Badge>
                    </div>

                    <div className="mt-4 flex flex-col gap-1.5">
                      <div className="flex items-center gap-1.5 text-sm text-text-primary">
                        <PersonIcon className="size-4 text-text-muted" />
                        {capitalizar(user?.nombre)} {capitalizar(user?.apellido)}
                      </div>
                      {user?.institucion && (
                        <p className="text-sm text-text-muted">{capitalizar(user.institucion)}</p>
                      )}
                      <div className="flex items-center gap-1.5 text-xs text-text-muted">
                        <CalendarIcon className="size-3.5" />
                        {formatFecha(inscripcion.fecha_inscripcion)}
                      </div>
                    </div>

                    {user?.id_rol === 1 && (
                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-baseline gap-2">
                          <span className="text-lg font-semibold text-accent">{formatCOP(costoFinal)}</span>
                          {descuentoAplicado > 0 && (
                            <span className="text-sm text-text-muted line-through">{formatCOP(costoBase)}</span>
                          )}
                        </div>
                        {numDescuentos > 0 && (
                          <div className="flex items-center gap-1.5 text-xs text-text-muted">
                            <TagIcon className="size-3.5" />
                            {numDescuentos} descuento{numDescuentos > 1 ? 's' : ''} aplicado
                            {numDescuentos > 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    )}

                    {/* TODO: este mensaje se muestra siempre porque GET /inscripciones no incluye el campo "comprobante".
                        Cuando el backend exponga algo como "tiene_comprobante: boolean" en el listado,
                        condicionar este bloque a mostrarse solo si tiene_comprobante === false. */}
                    <div className="mt-4 flex items-center justify-between gap-4 border-t border-border pt-4">
                      <p className="text-sm text-text-muted">
                        Completa tu inscripción subiendo tu comprobante de pago y cualquier documento
                        adicional requerido.
                      </p>
                      <span className="shrink-0 text-sm text-accent">Ir al detalle →</span>
                    </div>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
