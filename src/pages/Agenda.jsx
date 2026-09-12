import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, MapPin } from 'lucide-react';
import clsx from 'clsx';
import { apiFetch } from '../api/client';
import { useCongreso } from '../context/CongresoContext';
import { capitalizar, formatHora } from '../utils/formato';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import { PageLoader } from '../components/ui/PageLoader';

const DIA_SEMANA_CORTO = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];

// Ciclo fijo de clases Tailwind literales (necesario para que el compilador las detecte —
// una clase armada por interpolación en runtime, ej. `border-${token}`, no se generaría).
// Mismos tokens de color ya usados en el resto del dashboard (Badge, alerts, etc), con un
// tinte de fondo suave (/10) para que cada tarjeta de evento se lea como su propia mini-card.
const COLOR_CICLO = [
  { dot: '--c-accent', border: 'border-accent', text: 'text-accent', bg: 'bg-accent/10' },
  { dot: '--c-error-text', border: 'border-blue-text', text: 'text-blue-text', bg: '--c-error-text/10' },
  { dot: '--c-purple-text', border: 'border-purple-text', text: 'text-purple-text', bg: 'bg-purple-text/10' },
  { dot: '--c-warning-text', border: 'border-warning-text', text: 'text-warning-text', bg: 'bg-warning-text/10' },
];

const INTERVALO_MINUTOS = 30;
// Bloques fijos de días consecutivos tomados tal cual del array `dias` — no se agrupan por
// semana calendario (lunes-domingo), que produce bloques desbalanceados según en qué día caiga
// el inicio del congreso; así siempre se ven 6 columnas (salvo el último bloque, que puede
// quedar más corto si el congreso no es múltiplo de 6 días).
const TAMANO_BLOQUE = 6;

// dias[].fecha viaja como 'YYYY-MM-DD' plano (sin sufijo de hora) — se arma el Date con
// año/mes/día explícitos (mismo criterio que DatePicker.parseLocalDate) para no depender
// de cómo cada motor interpreta 'YYYY-MM-DD' a secas.
function parseFechaYMD(fechaYMD) {
  const [year, month, day] = fechaYMD.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function toDateKey(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatHeaderDia(fechaYMD) {
  const fecha = parseFechaYMD(fechaYMD);
  return `${DIA_SEMANA_CORTO[fecha.getDay()]} ${fecha.getDate()}`;
}

function formatRangoBloque(diasDelBloque) {
  if (diasDelBloque.length === 0) return '';
  const primera = parseFechaYMD(diasDelBloque[0].fecha);
  const ultima = parseFechaYMD(diasDelBloque[diasDelBloque.length - 1].fecha);
  const mismoMes = primera.getMonth() === ultima.getMonth() && primera.getFullYear() === ultima.getFullYear();
  if (mismoMes) {
    const mesAnio = ultima.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
    return `${primera.getDate()}–${ultima.getDate()} de ${mesAnio}`;
  }
  const inicio = primera.toLocaleDateString('es-CO', { day: 'numeric', month: 'long' });
  const fin = ultima.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
  return `${inicio} – ${fin}`;
}

// Schedule.hora_inicio/hora_fin viajan como ISO sobre una fecha de referencia fija — se
// reutiliza formatHora (ya blindado contra huso horario) y se parsean sus "HH:MM".
function minutosDesdeMedianoche(horaISO) {
  const [horas, minutos] = formatHora(horaISO).split(':').map(Number);
  return horas * 60 + minutos;
}

function formatMinutosComoHora(minutos) {
  const horas = String(Math.floor(minutos / 60)).padStart(2, '0');
  const mins = String(minutos % 60).padStart(2, '0');
  return `${horas}:${mins}`;
}

// Solapamiento en el sentido de intervalos semiabiertos [inicio, fin) — mismo criterio que ya
// usa el backend para detectar solapamiento de Schedule (dos eventos consecutivos, donde uno
// termina justo cuando el otro empieza, NO se solapan).
function seSuperponen(a, b) {
  return a.inicio < b.fin && b.inicio < a.fin;
}

// Agrupa, día por día, los slots con talk que se solapan TRANSITIVAMENTE en el tiempo — no
// solo los que comparten exactamente la misma hora de inicio. Dos eventos consecutivos (ej.
// 08:00-09:00 y 09:00-10:00) no se solapan y deben quedar en celdas de grid separadas, cada
// una con su propio rango de filas; dos que sí se cruzan (aunque empiecen en horas distintas)
// deben apilarse dentro de la misma celda para no terminar dibujándose una sobre la otra con
// posiciones de grid independientes que se pisan.
function agruparPorSolapamiento(slots) {
  const items = slots
    .map((slot) => ({
      slot,
      inicio: minutosDesdeMedianoche(slot.hora_inicio),
      fin: minutosDesdeMedianoche(slot.hora_fin),
    }))
    .sort((a, b) => a.inicio - b.inicio);

  const clusters = [];
  for (const item of items) {
    const cluster = clusters.find((c) => c.items.some((i) => seSuperponen(i, item)));
    if (cluster) {
      cluster.items.push(item);
    } else {
      clusters.push({ items: [item] });
    }
  }
  return clusters;
}

// Encuentra a qué bloque de TAMANO_BLOQUE días pertenece `fechaObjetivo` dentro de la lista
// ordenada de días con actividad. Si cae exactamente en uno de esos días, usa ese índice; si
// cae en un hueco entre dos (un día sin schedule), usa el primer día siguiente; si queda fuera
// del rango total del congreso (antes del primero o después del último), cae al primer bloque.
function indiceBloqueParaFecha(diasOrdenados, fechaObjetivo) {
  if (diasOrdenados.length === 0) return 0;
  const key = toDateKey(fechaObjetivo);
  if (key < diasOrdenados[0].fecha || key > diasOrdenados[diasOrdenados.length - 1].fecha) {
    return 0;
  }
  let indice = diasOrdenados.findIndex((d) => d.fecha >= key);
  if (indice === -1) indice = diasOrdenados.length - 1;
  return Math.floor(indice / TAMANO_BLOQUE);
}

export function Agenda() {
  const { congreso } = useCongreso();
  const idCongreso = congreso?.id_congreso;

  const [dias, setDias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [bloqueActualIndex, setBloqueActualIndex] = useState(0);
  const indiceInicializado = useRef(false);

  useEffect(() => {
    setLoading(true);
    setError('');
    apiFetch(`/congresos/${idCongreso}/schedule/agenda`)
      .then((data) => setDias(data?.dias ?? []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [idCongreso]);

  // El backend ya entrega `dias` ordenado ascendente por fecha (ver
  // obtenerAgendaDeCongreso, que arma el Map a partir de un query con
  // orderBy fecha asc) — se reordena aquí también, sin costo, como blindaje.
  const diasOrdenados = useMemo(
    () => [...dias].sort((a, b) => a.fecha.localeCompare(b.fecha)),
    [dias],
  );

  const bloques = useMemo(() => {
    const resultado = [];
    for (let i = 0; i < diasOrdenados.length; i += TAMANO_BLOQUE) {
      resultado.push(diasOrdenados.slice(i, i + TAMANO_BLOQUE));
    }
    return resultado;
  }, [diasOrdenados]);

  // Arranca en el bloque que contiene la fecha de HOY, o en el primero si el congreso ya
  // terminó o todavía no empieza. Solo se calcula una vez, cuando `bloques` pasa de vacío a
  // tener datos — después el usuario navega libremente sin que esto lo pise.
  useEffect(() => {
    if (indiceInicializado.current || diasOrdenados.length === 0) return;
    indiceInicializado.current = true;
    setBloqueActualIndex(indiceBloqueParaFecha(diasOrdenados, new Date()));
  }, [diasOrdenados]);

  // Mapa de color por tipo de participación construido UNA sola vez a partir de TODOS los
  // días del congreso (no solo el bloque visible), para que un tipo no cambie de color al
  // navegar entre bloques. Los nombres se ordenan alfabéticamente antes de asignar índice de
  // color, para que la asignación sea determinística sin depender del orden de aparición.
  const tipoColorMap = useMemo(() => {
    const vistos = new Set();
    for (const dia of dias) {
      for (const slot of dia.slots) {
        if (!slot.talk) continue;
        vistos.add(slot.talk.tipo_participacion?.nombre ?? 'Sin tipo');
      }
    }
    const tipos = [...vistos].sort((a, b) => a.localeCompare(b));
    const mapa = {};
    tipos.forEach((nombre, index) => {
      mapa[nombre] = COLOR_CICLO[index % COLOR_CICLO.length];
    });
    return mapa;
  }, [dias]);

  function handleBloqueAnterior() {
    setBloqueActualIndex((i) => Math.max(0, i - 1));
  }

  function handleBloqueSiguiente() {
    setBloqueActualIndex((i) => Math.min(bloques.length - 1, i + 1));
  }

  function handleMasFechas() {
    setBloqueActualIndex(indiceBloqueParaFecha(diasOrdenados, new Date()));
  }

  if (loading) return <PageLoader />;

  if (error) {
    return (
      <div className="pt-6">
        <Alert variant="error">{error}</Alert>
      </div>
    );
  }

  const diasBloque = bloques[bloqueActualIndex] ?? [];

  // Rango de horas acotado a la actividad real del bloque visible (slots sin talk no cuentan,
  // ya que esta vista pública no los muestra).
  let minMinutos = null;
  let maxMinutos = null;
  for (const dia of diasBloque) {
    for (const slot of dia.slots) {
      if (!slot.talk) continue;
      const inicio = minutosDesdeMedianoche(slot.hora_inicio);
      const fin = minutosDesdeMedianoche(slot.hora_fin);
      if (minMinutos === null || inicio < minMinutos) minMinutos = inicio;
      if (maxMinutos === null || fin > maxMinutos) maxMinutos = fin;
    }
  }
  const hayEventosEnEsteBloque = minMinutos !== null;
  if (!hayEventosEnEsteBloque) {
    minMinutos = 8 * 60;
    maxMinutos = 18 * 60;
  } else {
    minMinutos = Math.floor(minMinutos / 60) * 60;
    maxMinutos = Math.ceil(maxMinutos / 60) * 60;
  }
  const numFilas = (maxMinutos - minMinutos) / INTERVALO_MINUTOS;
  const filasHora = Array.from({ length: numFilas }, (_, i) => minMinutos + i * INTERVALO_MINUTOS);

  function filaDesdeMinutos(minutos) {
    return Math.round((minutos - minMinutos) / INTERVALO_MINUTOS) + 2;
  }

  // Un grupo por cluster de solapamiento (día por día) — un grupo con un solo evento ocupa
  // exactamente su rango de filas real; uno con varios eventos que sí se cruzan en el tiempo
  // ocupa la unión de sus rangos y los apila verticalmente dentro de esa misma celda.
  const gruposDeEventos = [];
  diasBloque.forEach((dia, diaIndex) => {
    const slotsConTalk = dia.slots.filter((slot) => slot.talk);
    agruparPorSolapamiento(slotsConTalk).forEach((cluster, clusterIndex) => {
      const inicioMin = Math.min(...cluster.items.map((i) => i.inicio));
      const finMax = Math.max(...cluster.items.map((i) => i.fin));
      gruposDeEventos.push({
        key: `${dia.fecha}-${clusterIndex}`,
        diaIndex,
        filaInicio: filaDesdeMinutos(inicioMin),
        filaFin: filaDesdeMinutos(finMax),
        eventos: cluster.items.map((i) => i.slot),
      });
    });
  });

  const tiposDelCongreso = Object.keys(tipoColorMap);

  return (
    <div className="flex flex-col gap-6 pt-6">
      <div>
        <h1 className="font-sans text-2xl font-bold text-text-primary">Agenda</h1>
        <p className="mt-1 text-sm text-text-muted">
          Consulta las ponencias y actividades programadas por día, hora y salón.
        </p>
      </div>

      {dias.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface px-6 py-12 text-center">
          <p className="text-sm text-text-muted">Todavía no hay agenda programada para este congreso.</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-text-primary">{formatRangoBloque(diasBloque)}</p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label="Bloque anterior"
                disabled={bloqueActualIndex === 0}
                onClick={handleBloqueAnterior}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={handleMasFechas}>
                Más fechas
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label="Bloque siguiente"
                disabled={bloqueActualIndex === bloques.length - 1}
                onClick={handleBloqueSiguiente}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>

          {!hayEventosEnEsteBloque ? (
            <p className="py-12 text-center text-sm text-text-muted">
              No hay actividades programadas en estas fechas.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <div
                className="grid"
                style={{
                  gridTemplateColumns: `72px repeat(${diasBloque.length}, minmax(130px, 1fr))`,
                  gridTemplateRows: `auto repeat(${numFilas}, minmax(34px, auto))`,
                }}
              >
                {/* Headers de día */}
                <div style={{ gridColumn: 1, gridRow: 1 }} />
                {diasBloque.map((dia, diaIndex) => (
                  <div
                    key={dia.fecha}
                    style={{ gridColumn: diaIndex + 2, gridRow: 1 }}
                    className="border-b border-border px-1 pb-2 text-center text-xs font-semibold text-text-muted"
                  >
                    {formatHeaderDia(dia.fecha)}
                  </div>
                ))}

                {/* Columna de horas */}
                {filasHora.map((minutos, filaIndex) => (
                  <div
                    key={minutos}
                    style={{ gridColumn: 1, gridRow: filaIndex + 2 }}
                    className="border-t border-border pr-2 text-right text-xs text-text-muted"
                  >
                    {minutos % 60 === 0 ? formatMinutosComoHora(minutos) : ''}
                  </div>
                ))}

                {/* Fondo/separadores de grid, día x fila */}
                {diasBloque.map((dia, diaIndex) =>
                  filasHora.map((minutos, filaIndex) => (
                    <div
                      key={`${dia.fecha}-${minutos}`}
                      style={{ gridColumn: diaIndex + 2, gridRow: filaIndex + 2 }}
                      className="border-t border-l border-border"
                    />
                  )),
                )}

                {/* Eventos: el div posicionado con gridColumn/gridRow ocupa la celda completa
                    (o la unión de filas del cluster) sin estilo propio — la card visual va en
                    un div interno con margen, para que quede separada de las líneas del grid y,
                    si hay varias apiladas, también separadas entre sí. */}
                {gruposDeEventos.map((grupo) => (
                  <div
                    key={grupo.key}
                    style={{ gridColumn: grupo.diaIndex + 2, gridRow: `${grupo.filaInicio} / ${grupo.filaFin}` }}
                    className="flex flex-col overflow-hidden p-3 mt-1 gap-3"
                  > 
                    {grupo.eventos.map((slot) => {
                      const color = tipoColorMap[slot.talk.tipo_participacion?.nombre ?? 'Sin tipo'];
                      return (
                        <div
                          key={slot.id_schedule}
                          className={clsx(
                            'm-1 min-h-0 flex-1 overflow-hidden rounded-lg border-l-4 p-2 shadow-sm pb-4',
                            color.border,
                            color.bg,
                          )}
                        > 
                          <div className="flex items-center gap-1 text-[10px] text-text-muted ">
                            <Clock className="size-2.5 shrink-0" />
                            <span className="overflow-hidden text-ellipsis whitespace-nowrap ">
                              {formatHora(slot.hora_inicio)}–{formatHora(slot.hora_fin)}
                            </span>
                          </div>
                          <div className={clsx('mt-0.5 flex items-center gap-1 text-[10px] font-medium', color.text)}>
                            <span className={clsx('size-1.5 shrink-0 rounded-full', color.dot)} />
                            <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                              {slot.talk.tipo_participacion?.nombre ?? 'Sin tipo'}
                            </span>
                          </div>
                          <p className="mt-0.5 line-clamp-2 text-xs font-medium text-text-primary">
                            {slot.talk.titulo}
                          </p>
                          <div className="mt-0.5 flex items-center gap-1 text-[10px] text-text-muted">
                            <MapPin className="size-2.5 shrink-0" />
                            <span className="overflow-hidden text-ellipsis whitespace-nowrap  ">
                              {slot.salon.nombre} · {capitalizar(slot.talk.inscripcion.usuario.nombre)}{' '}
                              {capitalizar(slot.talk.inscripcion.usuario.apellido)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}

          {tiposDelCongreso.length > 0 && (
            <div className="flex flex-wrap items-center gap-4 border-t border-border pt-4">
              {tiposDelCongreso.map((nombre) => (
                <div key={nombre} className="flex items-center gap-1.5 text-xs text-text-muted">
                  <span className={clsx('size-2 rounded-full', tipoColorMap[nombre].dot)} />
                  {nombre}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
