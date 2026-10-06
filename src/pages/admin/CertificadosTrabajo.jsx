import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import { apiFetch } from '../../api/client';
import { useCongreso } from '../../context/CongresoContext';
import { capitalizar, estadoInscripcionClaro, formatFechaHora } from '../../utils/formato';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Alert } from '../../components/ui/Alert';
import { Select } from '../../components/ui/Select';
import { PageLoader } from '../../components/ui/PageLoader';

// El backend devuelve una fila por trabajo+persona; aquí se agrupan por trabajo para mostrar el
// título una sola vez. Se respeta el orden en que llegan los trabajos y las personas.
function agruparPorTrabajo(filas) {
  const grupos = new Map();
  for (const fila of filas) {
    if (!grupos.has(fila.id_talk)) {
      grupos.set(fila.id_talk, {
        id_talk: fila.id_talk,
        titulo_talk: fila.titulo_talk,
        presento_marcado_en: fila.presento_marcado_en ?? null,
        // Atributos del trabajo: iguales en todas sus filas, se toman de la primera.
        area: fila.area ?? null,
        tipo_participacion: fila.tipo_participacion ?? null,
        personas: [],
      });
    }
    grupos.get(fila.id_talk).personas.push({
      id_usuario: fila.id_usuario,
      nombre: fila.nombre,
      apellido: fila.apellido,
      correo: fila.correo,
      rol_en_talk: fila.rol_en_talk,
      estado_inscripcion: fila.estado_inscripcion,
    });
  }
  return [...grupos.values()];
}

// Filtro "Pago" en el cliente, sobre las personas ya recibidas (área y tipo se filtran en el servidor).
function cumpleFiltroPago(persona, pago) {
  if (pago === 'confirmados') return persona.estado_inscripcion === 'confirmada';
  if (pago === 'sin_confirmar') return persona.estado_inscripcion !== 'confirmada';
  return true;
}

// Vista de solo lectura: quiénes quedan habilitados para el certificado de participación por
// trabajo (talks marcadas "Presentó"). Independiente de la asistencia por día al congreso.
export function CertificadosTrabajo() {
  const { congreso } = useCongreso();
  const idCongreso = congreso?.id_congreso;

  const [filas, setFilas] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  // Todos colapsados por defecto; cada trabajo guarda su propio estado.
  const [expandido, setExpandido] = useState({});

  const [filtros, setFiltros] = useState({ id_area: '', id_tipo_participacion: '' });
  // Solo cliente: no se envía al backend ni dispara una recarga.
  const [pago, setPago] = useState('');
  const [areas, setAreas] = useState([]);
  const [tipos, setTipos] = useState([]);
  // Solo se aplica la respuesta de la última petición: un filtro anterior lento no pisa al vigente.
  const ultimaPeticion = useRef(0);

  // Filtros vacíos ("Todas"/"Todos") se omiten; el backend combina id_area e id_tipo_participacion con AND.
  function cargar(f) {
    const params = new URLSearchParams();
    if (f.id_area) params.set('id_area', f.id_area);
    if (f.id_tipo_participacion) params.set('id_tipo_participacion', f.id_tipo_participacion);
    const query = params.toString();
    const id = ++ultimaPeticion.current;
    return apiFetch(`/congresos/${idCongreso}/talks/certificables${query ? `?${query}` : ''}`)
      .then((data) => {
        if (id !== ultimaPeticion.current) return;
        setFilas(data ?? []);
        setError('');
      })
      .catch((err) => {
        if (id === ultimaPeticion.current) setError(err.message);
      });
  }

  useEffect(() => {
    setLoading(true);
    setError('');
    cargar(filtros).finally(() => setLoading(false));
    apiFetch(`/congresos/${idCongreso}/areas-estudio?activo=true`)
      .then((data) => setAreas(data ?? []))
      .catch(() => setAreas([]));
    apiFetch(`/congresos/${idCongreso}/tipos-participacion?activo=true`)
      .then((data) => setTipos(data ?? []))
      .catch(() => setTipos([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idCongreso]);

  function handleFiltro(campo, valor) {
    const nuevos = { ...filtros, [campo]: valor };
    setFiltros(nuevos);
    cargar(nuevos);
  }

  const grupos = useMemo(() => agruparPorTrabajo(filas), [filas]);
  // Con filtro de pago: cada trabajo conserva solo las personas que cumplen, y se ocultan los que
  // se quedan sin ninguna. total guarda cuántas tenía para mostrar "N de M".
  const gruposVisibles = useMemo(
    () =>
      grupos
        .map((grupo) => ({
          ...grupo,
          total: grupo.personas.length,
          personas: grupo.personas.filter((p) => cumpleFiltroPago(p, pago)),
        }))
        .filter((grupo) => grupo.personas.length > 0),
    [grupos, pago],
  );

  function toggleExpandido(idTalk) {
    setExpandido((prev) => ({ ...prev, [idTalk]: !prev[idTalk] }));
  }

  if (loading) return <PageLoader />;

  return (
    <div className="flex flex-col gap-6 pt-6">
      <div>
        <h1 className="font-sans text-2xl font-bold text-text-primary">Certificados por trabajo</h1>
        <p className="mt-1 text-sm text-text-muted">
          Integrantes de los trabajos marcados como &lsquo;Presentó&rsquo;, habilitados para el certificado de
          participación en esa ponencia.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-56">
          <Select label="Área" value={filtros.id_area} onChange={(e) => handleFiltro('id_area', e.target.value)}>
            <option value="">Todas</option>
            {areas.map((a) => (
              <option key={a.id_area} value={a.id_area}>
                {a.nombre}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-56">
          <Select
            label="Tipo de Trabajo"
            value={filtros.id_tipo_participacion}
            onChange={(e) => handleFiltro('id_tipo_participacion', e.target.value)}
          >
            <option value="">Todos</option>
            {tipos.map((t) => (
              <option key={t.id_tipo_participacion} value={t.id_tipo_participacion}>
                {t.nombre}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-44">
          <Select label="Pago" value={pago} onChange={(e) => setPago(e.target.value)}>
            <option value="">Todos</option>
            <option value="confirmados">Confirmados</option>
            <option value="sin_confirmar">Sin confirmar</option>
          </Select>
        </div>
      </div>

      {error ? (
        <Alert variant="error">{error}</Alert>
      ) : gruposVisibles.length === 0 ? (
        <p className="text-sm text-text-muted">
          {filtros.id_area || filtros.id_tipo_participacion || pago
            ? 'Ningún trabajo marcado como \u2018Presentó\u2019 coincide con los filtros seleccionados.'
            : 'Aún no hay trabajos marcados como \u2018Presentó\u2019 en este congreso.'}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {gruposVisibles.map((grupo) => {
            const abierto = Boolean(expandido[grupo.id_talk]);
            return (
              <Card key={grupo.id_talk}>
                <button
                  type="button"
                  onClick={() => toggleExpandido(grupo.id_talk)}
                  aria-expanded={abierto}
                  className="flex w-full items-center justify-between gap-3 text-left"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-text-primary">{grupo.titulo_talk}</p>
                    <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-text-muted">
                      <span>{grupo.area ?? 'Sin especificar'}</span>
                      <span>·</span>
                      <span>{grupo.tipo_participacion ?? 'Sin especificar'}</span>
                      {grupo.presento_marcado_en && (
                        <>
                          <span>·</span>
                          <span>Presentó el {formatFechaHora(grupo.presento_marcado_en)}</span>
                        </>
                      )}
                      <span>·</span>
                      <span>
                        {pago && grupo.personas.length !== grupo.total
                          ? `${grupo.personas.length} de ${grupo.total} integrantes`
                          : `${grupo.personas.length} ${grupo.personas.length === 1 ? 'integrante' : 'integrantes'}`}
                      </span>
                    </div>
                  </div>
                  <ChevronDown
                    className={clsx('size-4 shrink-0 text-text-muted transition-transform', abierto && 'rotate-180')}
                  />
                </button>

                {abierto && (
                  <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
                    {grupo.personas.map((p) => (
                      <div key={p.id_usuario} className="flex items-center justify-between gap-3 text-sm">
                        <div>
                          <p className="text-text-primary">
                            {capitalizar(p.nombre)} {capitalizar(p.apellido)}
                          </p>
                          <p className="text-xs text-text-muted">{p.correo}</p>
                        </div>
                        <div className="flex flex-wrap justify-end gap-2">
                          {/* Informativo: no bloquea nada (el Admin decide al emitir). */}
                          {p.estado_inscripcion !== 'confirmada' && (
                            <Badge variant="alerta" title={estadoInscripcionClaro(p.estado_inscripcion)}>
                              Sin pago confirmado
                            </Badge>
                          )}
                          <Badge variant="default">{p.rol_en_talk === 'principal' ? 'Principal' : 'Coautor'}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
