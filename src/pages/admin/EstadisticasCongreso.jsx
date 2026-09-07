import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { Building2, GraduationCap, Globe } from 'lucide-react';
import { apiFetch } from '../../api/client';
import { useCongreso } from '../../context/CongresoContext';
import { ESTADO_INSCRIPCION_VARIANT } from '../../utils/formato';
import { Card } from '../../components/ui/Card';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { PageLoader } from '../../components/ui/PageLoader';
import { GraficoCircular } from '../../components/ui/GraficoCircular';
import { BarraEstadistica, EstadisticasPanel, GrupoBarras } from '../../components/EstadisticasPanel';

// Barra grande y coloreada — reemplaza el tratamiento monocromático de EstadisticasPanel
// para "Por rol de participación" (Inscripciones) y "Por tipo de participación"
// (Ponencias). El color viene por posición (mismo criterio de ciclo que ya usa
// Procedencia vía CICLO_COLORES), no por nombre — así sirve tanto para las 2 categorías
// fijas de rol de participación como para las N de tipo de participación.
const BARRA_COLOR_CLASSES = {
  accent: { bar: 'bg-accent', text: 'text-accent' },
  blue: { bar: 'bg-blue-text', text: 'text-blue-text' },
  purple: { bar: 'bg-purple-text', text: 'text-purple-text' },
  warning: { bar: 'bg-warning-text', text: 'text-warning-text' },
};

function BarraGrande({ nombre, total, maximo, color }) {
  const clases = BARRA_COLOR_CLASSES[color];
  const ancho = total === 0 ? '2%' : `${(total / Math.max(maximo, 1)) * 100}%`;
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="font-medium text-text-primary">{nombre}</span>
        <span className={clsx('text-lg font-bold', clases.text)}>{total}</span>
      </div>
      <div className="mt-1.5 h-4 w-full overflow-hidden rounded-full bg-surface">
        <div className={clsx('h-full rounded-full transition-[width]', clases.bar)} style={{ width: ancho }} />
      </div>
    </div>
  );
}

// "Por tipo de asistente" viene agrupado por categoría (por_categoria): cada grupo tiene
// su propio sub-header (nombre + subtotal) y sus barras usan como máximo el mayor total
// DENTRO del grupo, no el global — así la comparación de proporciones tiene sentido entre
// tipos de una misma categoría. Reutiliza BarraEstadistica (mismo estilo monocromático que
// el resto del dashboard); cada categoría ocupa su propia columna del grid debajo del
// GraficoCircular (donut), separadas entre sí por el gap del grid, no por un divider propio.
function GrupoCategoriaTipoAsistente({ categoria, subtotal, tipos }) {
  const maximo = Math.max(...tipos.map((t) => t.total), 1);
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-text-primary">{categoria}</span>
        <span className="text-sm font-semibold text-accent">{subtotal}</span>
      </div>
      <div className="mt-2 flex flex-col gap-2">
        {tipos.map((t) => (
          <BarraEstadistica key={t.id_tipo_asistente} nombre={t.tipo} total={t.total} maximo={maximo} />
        ))}
      </div>
    </div>
  );
}

// El donut sigue mostrando el desglose por tipo de asistente (mismo nivel de detalle que
// antes de por_categoria), agregando los totales de un mismo `tipo` entre categorías — el
// desglose agrupado al lado ya distingue por categoría, así el donut no lo duplica y en
// cambio da la vista "aplanada" que tenía originalmente.
function agruparTiposAsistentePorNombre(porCategoria) {
  const totales = new Map();
  for (const categoria of porCategoria ?? []) {
    for (const tipo of categoria.tipos ?? []) {
      totales.set(tipo.tipo, (totales.get(tipo.tipo) ?? 0) + tipo.total);
    }
  }
  return Array.from(totales, ([nombre, total]) => ({ nombre, total }));
}

// Ciclo de color para la sección "Procedencia" — reutiliza tokens ya definidos en
// @theme (index.css), sin hex nuevos. Los tiles usan la combinación pálida
// bg-*-bg/border-*-text (o bg-accent/10 para el token único de acento); las filas de
// las listas usan el propio *-text como color sólido (mismo token, ya lo usa Badge
// como color de texto sobre su bg-*-bg pálido, así que es lo bastante saturado para
// servir de indicador/barra).
const TILE_CLASSES = {
  accent: { bg: 'bg-accent/10!', border: 'border-accent/30!', text: 'text-accent' },
  blue: { bg: 'bg-blue-bg!', border: 'border-blue-text/30!', text: 'text-blue-text' },
  purple: { bg: 'bg-purple-bg!', border: 'border-purple-text/30!', text: 'text-purple-text' },
  warning: { bg: 'bg-warning-bg!', border: 'border-warning-text/30!', text: 'text-warning-text' },
};

const FILA_COLOR_BG = {
  accent: 'bg-accent',
  blue: 'bg-blue-text',
  purple: 'bg-purple-text',
  warning: 'bg-warning-text',
};

const CICLO_COLORES = ['accent', 'blue', 'purple', 'warning'];

const ESTADO_TALK_VARIANT = {
  pendiente: 'pendiente',
  aceptada: 'revisado',
  rechazada: 'rechazado',
};

const ENDPOINTS = {
  ponencias: (id) => `/congresos/${id}/estadisticas/ponencias`,
  ponenciasPaises: (id) => `/congresos/${id}/estadisticas/ponencias/paises`,
  inscripciones: (id) => `/congresos/${id}/estadisticas/inscripciones`,
  paises: (id) => `/congresos/${id}/estadisticas/paises`,
  instituciones: (id) => `/congresos/${id}/estadisticas/instituciones`,
  comprobantes: (id) => `/congresos/${id}/estadisticas/comprobantes`,
};

function ordenarDesc(items) {
  return [...(items ?? [])].sort((a, b) => b.total - a.total);
}

function MetricaTile({ value, label, destacado }) {
  return (
    <Card className={clsx('p-4!', destacado && 'border-warning-text/40')}>
      <p className={clsx('text-2xl font-semibold', destacado ? 'text-warning-text' : 'text-accent')}>
        {value ?? '—'}
      </p>
      <p className="mt-1 text-xs text-text-muted">{label}</p>
    </Card>
  );
}

// KPI vistoso propio de "Procedencia" — a diferencia de MetricaTile (monocromático,
// reutilizado en el resto de secciones), cada instancia trae su propio color de la
// paleta vía `color` (ver TILE_CLASSES).
function ProcedenciaTile({ icon: Icon, value, label, color }) {
  const clases = TILE_CLASSES[color];
  return (
    <Card className={clsx('p-4!', clases.bg, clases.border)}>
      <Icon className={clsx('size-6', clases.text)} />
      <p className={clsx('mt-3 text-3xl font-bold', clases.text)}>{value}</p>
      <p className="mt-1 text-xs text-text-muted">{label}</p>
    </Card>
  );
}

// Fila de "Por país"/"Por institución" en Procedencia: indicador circular + barra de
// progreso coloreados (en vez del color único fijo que usa EstadisticasPanel), color
// ciclando por posición dentro de la lista.
function FilaProcedencia({ nombre, total, maximo, color }) {
  const ancho = total === 0 ? '2px' : `${(total / Math.max(maximo, 1)) * 100}%`;
  const colorBg = FILA_COLOR_BG[color];
  return (
    <div className="flex items-center gap-3">
      <span className={clsx('size-2.5 shrink-0 rounded-full', colorBg)} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="truncate text-text-primary">{nombre}</span>
          <span className="shrink-0 font-semibold text-text-primary">{total}</span>
        </div>
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface">
          <div className={clsx('h-full rounded-full', colorBg)} style={{ width: ancho }} />
        </div>
      </div>
    </div>
  );
}

// Reutiliza el mismo mecanismo de límite/expansión de EstadisticasPanel (estado local,
// truncar a limiteInicial + "Ver los N restantes"), pero con la presentación vistosa de
// FilaProcedencia en vez de las barras monocromáticas genéricas.
function ListaProcedencia({ titulo, items, limiteInicial }) {
  const [expandido, setExpandido] = useState(false);
  const maximo = Math.max(...items.map((item) => item.total), 1);
  const truncado = items.length > limiteInicial;
  const itemsMostrados = truncado && !expandido ? items.slice(0, limiteInicial) : items;

  return (
    <Card className="p-4!">
      <h3 className="text-xs font-medium uppercase tracking-wide text-text-muted">{titulo}</h3>
      <div className="mt-3 flex max-h-80 flex-col gap-3 overflow-y-auto pr-1">
        {itemsMostrados.map((item, i) => (
          <FilaProcedencia
            key={item.nombre}
            nombre={item.nombre}
            total={item.total}
            maximo={maximo}
            color={CICLO_COLORES[i % CICLO_COLORES.length]}
          />
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
    </Card>
  );
}

export function EstadisticasCongreso() {
  const { congreso } = useCongreso();
  const idCongreso = congreso?.id_congreso;

  const [datos, setDatos] = useState({});
  const [errores, setErrores] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const claves = Object.keys(ENDPOINTS);
    Promise.allSettled(claves.map((clave) => apiFetch(ENDPOINTS[clave](idCongreso)))).then((resultados) => {
      const nuevosDatos = {};
      const nuevosErrores = {};
      resultados.forEach((resultado, i) => {
        const clave = claves[i];
        if (resultado.status === 'fulfilled') {
          nuevosDatos[clave] = resultado.value;
        } else {
          nuevosErrores[clave] = resultado.reason?.message ?? 'No se pudo cargar esta sección.';
        }
      });
      setDatos(nuevosDatos);
      setErrores(nuevosErrores);
      setLoading(false);
    });
  }, [idCongreso]);

  if (loading) return <PageLoader />;

  const ponencias = datos.ponencias;
  const ponenciasPaises = datos.ponenciasPaises;
  const inscripciones = datos.inscripciones;
  const paises = datos.paises;
  const instituciones = datos.instituciones;
  const comprobantes = datos.comprobantes;

  function totalPorEstadoTalk(estado) {
    return ponencias?.por_estado?.find((e) => e.estado_talk === estado)?.total ?? 0;
  }

  function totalPorEstadoInscripcion(estado) {
    return inscripciones?.por_estado?.find((e) => e.estado_inscripcion === estado)?.total ?? 0;
  }

  function totalPorEstadoComprobante(estado) {
    return comprobantes?.por_estado?.find((e) => e.estado_comprobante === estado)?.total ?? 0;
  }

  // Procedencia combina 2 de los 5 fetches en un único panel — si cualquiera de los
  // dos falla, el panel completo cae al estado de error (EstadisticasPanel no soporta
  // error por columna, solo por panel).
  const errorProcedencia = [errores.paises, errores.instituciones].filter(Boolean).join(' · ');

  const porRolParticipacion = inscripciones?.por_rol_participacion ?? [];
  const maxRolParticipacion = Math.max(...porRolParticipacion.map((r) => r.total), 1);

  const porTipoParticipacion = ordenarDesc(ponencias?.por_tipo_participacion);
  const maxTipoParticipacion = Math.max(...porTipoParticipacion.map((t) => t.total), 1);

  // Un solo cálculo compartido por el donut (sin leyenda propia) y la leyenda renderizada
  // aparte más abajo, junto al desglose por categoría — mismo orden → mismos colores.
  const datosTipoAsistente = ordenarDesc(agruparTiposAsistentePorNombre(inscripciones?.por_categoria));

  return (
    <div className="flex flex-col gap-6 pt-6">
      <div>
        <h1 className="font-sans text-2xl font-bold text-text-primary">Estadísticas del congreso</h1>
        <p className="mt-1 text-sm text-text-muted">
          Vista combinada de trabajos, inscripciones, procedencia y comprobantes de pago.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <MetricaTile
          value={errores.inscripciones ? '—' : inscripciones?.total_inscripciones}
          label="Inscripciones en total"
        />
        <MetricaTile value={errores.ponencias ? '—' : ponencias?.total_ponencias} label="Trabajos en total" />
        <MetricaTile
          value={errores.paises ? '—' : (paises?.pais_con_mas_participantes?.total ?? 0)}
          label={`País líder: ${paises?.pais_con_mas_participantes?.pais ?? 'Sin datos'}`}
        />
        <MetricaTile
          value={errores.instituciones ? '—' : (instituciones?.institucion_con_mas_participantes?.total ?? 0)}
          label={`Institución líder: ${instituciones?.institucion_con_mas_participantes?.institucion ?? 'Sin datos'}`}
        />
        <MetricaTile
          value={errores.comprobantes ? '—' : comprobantes?.sin_comprobante}
          label="Sin comprobante"
          destacado
        />
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-text-muted">Trabajos</h2>

        {errores.ponencias ? (
          <Alert variant="error">{errores.ponencias}</Alert>
        ) : (
          <>
            <div>
              <p className="text-2xl font-semibold text-accent">{ponencias?.total_ponencias}</p>
              <p className="text-xs text-text-muted">trabajos en total</p>
            </div>

            {/* Por estado — sin cambios respecto al tratamiento genérico de EstadisticasPanel. */}
            <div className="flex flex-wrap gap-2">
              <Badge variant={ESTADO_TALK_VARIANT.pendiente}>{totalPorEstadoTalk('pendiente')} pendiente</Badge>
              <Badge variant={ESTADO_TALK_VARIANT.aceptada}>{totalPorEstadoTalk('aceptada')} aceptada</Badge>
              <Badge variant={ESTADO_TALK_VARIANT.rechazada}>{totalPorEstadoTalk('rechazada')} rechazada</Badge>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card className="p-4!">
                <h3 className="text-xs font-medium uppercase tracking-wide text-text-muted">Por área</h3>
                <div className="mt-4">
                  <GraficoCircular
                    data={ordenarDesc(ponencias?.por_area).map((a) => ({ nombre: a.nombre, total: a.total }))}
                  />
                </div>
              </Card>

              <Card className="p-4!">
                <h3 className="text-xs font-medium uppercase tracking-wide text-text-muted">
                  Por tipo de participación
                </h3>
                <div className="mt-5 flex flex-col gap-5">
                  {porTipoParticipacion.map((t, i) => (
                    <BarraGrande
                      key={t.nombre}
                      nombre={t.nombre}
                      total={t.total}
                      maximo={maxTipoParticipacion}
                      color={CICLO_COLORES[i % CICLO_COLORES.length]}
                    />
                  ))}
                </div>
              </Card>
            </div>

            {/* Bloque separado: depende de un fetch propio (ponenciasPaises), independiente
                del resto de "Trabajos" — si falla, no afecta a Por área/Por tipo/Por estado. */}
            {errores.ponenciasPaises ? (
              <Alert variant="error">{errores.ponenciasPaises}</Alert>
            ) : (
              <Card className="p-4!">
                <h3 className="text-xs font-medium uppercase tracking-wide text-text-muted">
                  Trabajos por país
                </h3>

                {ponenciasPaises?.pais_con_mas_ponencias ? (
                  <p className="mt-2 text-lg font-semibold text-accent">
                    {ponenciasPaises.pais_con_mas_ponencias.pais} —{' '}
                    {ponenciasPaises.pais_con_mas_ponencias.total}{' '}
                    {ponenciasPaises.pais_con_mas_ponencias.total === 1 ? 'trabajo' : 'trabajos'}
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-text-muted">
                    Sin datos de país para los trabajos de este congreso.
                  </p>
                )}

                {(ponenciasPaises?.por_pais?.length ?? 0) > 0 && (
                  <div className="mt-4">
                    <GrupoBarras
                      titulo="Por país"
                      items={ordenarDesc(ponenciasPaises.por_pais).map((p) => ({
                        nombre: p.pais,
                        total: p.total,
                      }))}
                      limiteInicial={10}
                    />
                  </div>
                )}
              </Card>
            )}
          </>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-text-muted">Inscripciones</h2>

        {errores.inscripciones ? (
          <Alert variant="error">{errores.inscripciones}</Alert>
        ) : (
          <>
            <div>
              <p className="text-2xl font-semibold text-accent">{inscripciones?.total_inscripciones}</p>
              <p className="text-xs text-text-muted">inscripciones en total</p>
            </div>

            {/* Por estado — sin cambios respecto al tratamiento genérico de EstadisticasPanel. */}
            <div className="flex flex-wrap gap-2">
              <Badge variant={ESTADO_INSCRIPCION_VARIANT.pendiente}>
                {totalPorEstadoInscripcion('pendiente')} pendiente
              </Badge>
              <Badge variant={ESTADO_INSCRIPCION_VARIANT.confirmada}>
                {totalPorEstadoInscripcion('confirmada')} confirmada
              </Badge>
              <Badge variant={ESTADO_INSCRIPCION_VARIANT.rechazada}>
                {totalPorEstadoInscripcion('rechazada')} rechazada
              </Badge>
              <Badge variant={ESTADO_INSCRIPCION_VARIANT.cancelada}>
                {totalPorEstadoInscripcion('cancelada')} cancelada
              </Badge>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card className="p-4!">
                <h3 className="text-xs font-medium uppercase tracking-wide text-text-muted">
                  Por tipo de asistente
                </h3>
                <div className="mt-4 flex flex-col items-center gap-4">
                  {/* GraficoCircular ya incluye su propia leyenda (ver componente) */}
                  <GraficoCircular data={datosTipoAsistente} />
                </div>

                <div className="mt-6 grid grid-cols-1 gap-6 border-t border-border pt-4 lg:grid-cols-2">
                  {(inscripciones?.por_categoria ?? []).map((cat) => (
                    <GrupoCategoriaTipoAsistente
                      key={cat.id_categoria}
                      categoria={cat.categoria}
                      subtotal={cat.subtotal}
                      tipos={cat.tipos}
                    />
                  ))}
                </div>
              </Card>

              <Card className="p-4!">
                <h3 className="text-xs font-medium uppercase tracking-wide text-text-muted">
                  Por rol de participación
                </h3>
                <div className="mt-5 flex flex-col gap-5">
                  {porRolParticipacion.map((r, i) => (
                    <BarraGrande
                      key={r.nombre}
                      nombre={r.nombre}
                      total={r.total}
                      maximo={maxRolParticipacion}
                      color={CICLO_COLORES[i % CICLO_COLORES.length]}
                    />
                  ))}
                </div>

                {(inscripciones?.por_pais_y_rol?.length ?? 0) > 0 && (
                  <div className="mt-4 border-t border-border pt-4">
                    <h4 className="text-xs font-medium uppercase tracking-wide text-text-muted">
                      Por país y rol
                    </h4>
                    <div className="mt-2 max-h-48 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-text-muted">
                            <th className="text-left font-normal">País</th>
                            <th className="text-right font-normal">Expositor</th>
                            <th className="text-right font-normal">Asistente</th>
                            <th className="text-right font-normal">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inscripciones.por_pais_y_rol.map((fila) => (
                            <tr key={fila.pais} className="border-t border-border">
                              <td className="py-1">{fila.pais}</td>
                              <td className="py-1 text-right">{fila.expositor}</td>
                              <td className="py-1 text-right">{fila.asistente}</td>
                              <td className="py-1 text-right font-medium">{fila.total}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-text-muted">Procedencia</h2>

        {errorProcedencia ? (
          <Alert variant="error">{errorProcedencia}</Alert>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <ProcedenciaTile
                icon={Globe}
                color="accent"
                value={paises?.pais_con_mas_participantes?.total ?? 0}
                label={`País líder: ${paises?.pais_con_mas_participantes?.pais ?? 'Sin datos'}`}
              />
              <ProcedenciaTile
                icon={Building2}
                color="blue"
                value={instituciones?.institucion_con_mas_participantes?.total ?? 0}
                label={`Institución líder: ${instituciones?.institucion_con_mas_participantes?.institucion ?? 'Sin datos'}`}
              />
              <ProcedenciaTile
                icon={Globe}
                color="purple"
                value={(paises?.por_pais ?? []).length}
                label="Países distintos"
              />
              <ProcedenciaTile
                icon={GraduationCap}
                color="warning"
                value={(instituciones?.por_institucion ?? []).length}
                label="Instituciones distintas"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <ListaProcedencia
                titulo="Por país"
                items={ordenarDesc(paises?.por_pais).map((p) => ({ nombre: p.pais, total: p.total }))}
                limiteInicial={10}
              />
              <ListaProcedencia
                titulo="Por institución"
                items={ordenarDesc(instituciones?.por_institucion).map((i) => ({
                  nombre: i.institucion,
                  total: i.total,
                }))}
                limiteInicial={10}
              />
            </div>
          </>
        )}
      </div>

      <EstadisticasPanel
        titulo="Comprobantes de pago"
        totalLabel="inscripciones en total"
        totalValue={comprobantes?.total_inscripciones}
        error={errores.comprobantes}
        grupoBadges={{
          titulo: 'Por estado',
          items: [
            { nombre: 'Pendiente', total: totalPorEstadoComprobante('pendiente'), variant: 'pendiente' },
            { nombre: 'Revisado', total: totalPorEstadoComprobante('revisado'), variant: 'revisado' },
            { nombre: 'Rechazado', total: totalPorEstadoComprobante('rechazado'), variant: 'rechazado' },
            { nombre: 'Sin comprobante', total: comprobantes?.sin_comprobante ?? 0, variant: 'pendiente' },
          ],
        }}
      />
    </div>
  );
}
