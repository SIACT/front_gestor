import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarClock, ChevronDown, ChevronLeft, ChevronRight, Clock, Star, FileText, MapPin } from 'lucide-react';
import clsx from 'clsx';
import { apiFetch } from '../api/client';
import { useCongreso } from '../context/CongresoContext';
import { capitalizar, formatFechaSolo, formatHora } from '../utils/formato';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import { Modal } from '../components/ui/Modal';
import { PageLoader } from '../components/ui/PageLoader';
import { Spinner } from '../components/ui/Spinner';
import { TextoConFormulas } from '../components/ui/TextoConFormulas';
import { div } from 'framer-motion/client';

const DIA_SEMANA_CORTO = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];

// Ciclo fijo de clases Tailwind literales (necesario para que el compilador las detecte —
// una clase armada por interpolación en runtime, ej. `border-${token}`, no se generaría).
// Mismos tokens de color ya usados en el resto del dashboard (Badge, alerts, etc). `bg` es un
// tinte suave (/10) para que cada tarjeta de evento se lea como su propia mini-card; `solid` es
// el mismo token en versión sólida, para la franja superior del Modal de detalle.
const COLOR_CICLO = [
  { dot: '--c-accent', border: 'border-accent', text: 'text-accent', bg: 'bg-accent/10', solid: 'bg-accent' },
  { dot: '--c-error-text', border: 'border-blue-text', text: 'text-blue-text', bg: 'bg-blue-text/10', solid: 'bg-blue-text' },
  { dot: '--c-purple-text', border: 'border-purple-text', text: 'text-purple-text', bg: 'bg-purple-text/10', solid: 'bg-purple-text' },
  { dot: '--c-warning-text', border: 'border-warning-text', text: 'text-warning-text', bg: 'bg-warning-text/10', solid: 'bg-warning-text' },
];

// Las actividades libres (café, networking, almuerzo…) no tienen tipo de participación, así que
// no entran en tipoColorMap — usan un tono neutro propio, distinto de cualquier tipo de ponencia.
const COLOR_ACTIVIDAD = {
  dot: '--c-text-muted',
  border: 'border-text-muted',
  text: 'text-text-muted',
  bg: 'bg-surface',
  solid: 'bg-text-muted',
};

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

// Agrupa, día por día, los slots visibles (ponencias y actividades) que se solapan
// TRANSITIVAMENTE en el tiempo — no solo los que comparten exactamente la misma hora de inicio.
// Dos eventos consecutivos (ej. 08:00-09:00 y 09:00-10:00) no se solapan y deben quedar en celdas
// de grid separadas, cada una con su propio rango de filas; dos que sí se cruzan (aunque empiecen
// en horas distintas) deben apilarse dentro de la misma celda para no terminar dibujándose una
// sobre la otra con posiciones de grid independientes que se pisan.
//
// El solapamiento se evalúa sobre los minutos AJUSTADOS a la grilla de INTERVALO_MINUTOS (inicio
// hacia abajo, fin hacia arriba, mínimo una fila), no sobre los minutos reales: el grid solo
// puede posicionar en filas enteras, así que dos eventos que no se cruzan en el tiempo pero sí
// caen en la misma fila (ej. una actividad 09:00-09:10 y una ponencia 09:10-10:00) terminarían
// como grupos separados en la misma celda, dibujados uno encima del otro.
function agruparPorSolapamiento(slots) {
  const items = slots
    .map((slot) => {
      const inicioReal = minutosDesdeMedianoche(slot.hora_inicio);
      const finReal = minutosDesdeMedianoche(slot.hora_fin);
      const inicio = Math.floor(inicioReal / INTERVALO_MINUTOS) * INTERVALO_MINUTOS;
      const fin = Math.max(Math.ceil(finReal / INTERVALO_MINUTOS) * INTERVALO_MINUTOS, inicio + INTERVALO_MINUTOS);
      return { slot, inicio, fin };
    })
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

// Un slot se muestra en la agenda pública si es una ponencia (talk) o una actividad libre
// (titulo_actividad). Solo se ocultan los espacios vacíos, donde ambos vienen null.
function esSlotVisible(slot) {
  return Boolean(slot.talk || slot.titulo_actividad);
}

// Card compacta de un evento para la vista mobile (lista vertical por día) — mismo estilo visual
// (borde de color por tipo, hora, título, salón/área) que la card del grid semanal, pero sin el
// posicionamiento absoluto por celda de grid que usa esa vista.
function EventoCardMobile({ slot, tipoColorMap, onClick }) {
  if (!slot.talk) {
    return (
      <div
        className={clsx(
          'overflow-hidden rounded-lg border-l-4 p-3 shadow-sm',
          COLOR_ACTIVIDAD.border,
          COLOR_ACTIVIDAD.bg,
        )}
      >
        <div className="flex items-center gap-1 text-xs text-text-muted">
          <Clock className="size-3 shrink-0" />
          <span>
            {formatHora(slot.hora_inicio)}–{formatHora(slot.hora_fin)}
          </span>
          <span>·</span>
          <span className="flex items-center gap-1 font-medium">
            <Star className="size-3 shrink-0" />
            Actividad
          </span>
        </div>
        <p className="mt-1 text-sm font-medium text-text-primary">{slot.titulo_actividad}</p>
        {slot.descripcion_actividad && (
          <p className="mt-0.5 text-xs text-text-muted">{slot.descripcion_actividad}</p>
        )}
        {slot.salon?.nombre && (
          <div className="mt-1 flex items-center gap-1 text-text-muted">
            <MapPin className="size-3 shrink-0" />
            <span className="text-xs">{slot.salon.nombre}</span>
          </div>
        )}
      </div>
    );
  }

  const color = tipoColorMap[slot.talk.tipo_participacion?.nombre ?? 'Sin tipo'];
  return (
    <div
      onClick={() => onClick(slot.talk.id_talk)}
      className={clsx(
        'cursor-pointer overflow-hidden rounded-lg border-l-4 p-3 shadow-sm transition-opacity hover:opacity-80',
        color.border,
        color.bg,
      )}
    >
      <div className="flex items-center gap-1 text-xs text-text-muted">
        <Clock className="size-3 shrink-0" />
        <span>
          {formatHora(slot.hora_inicio)}–{formatHora(slot.hora_fin)}
        </span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-1 text-xs font-medium">
        <span className={clsx('flex items-center gap-1', color.text)}>
          <span className={clsx('size-1.5 shrink-0 rounded-full', color.dot)} />
          {slot.talk.tipo_participacion?.nombre ?? 'Sin tipo'}
        </span>
        {slot.talk.area && (
          <>
            <span className="text-text-muted">·</span>
            <span className="text-text-muted">{slot.talk.area.nombre}</span>
          </>
        )}
      </div>
      <p className="mt-1 text-sm font-medium text-text-primary">{slot.talk.titulo}</p>
      <div className="mt-1 flex items-center gap-1 text-text-muted">
        <MapPin className="size-3 shrink-0" />
        <div className="flex flex-col">
          <span className="text-xs">{slot.salon.nombre}</span>
          <span className="text-[10px]">
            {capitalizar(slot.talk.inscripcion.usuario.nombre)} {capitalizar(slot.talk.inscripcion.usuario.apellido)}
          </span>
        </div>
      </div>
    </div>
  );
}

export function Agenda() {
  const { congreso } = useCongreso();
  const idCongreso = congreso?.id_congreso;

  const [dias, setDias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // 403 AGENDA_NO_PUBLICADA es un estado esperado (el comité aún no publicó la agenda), no una
  // falla — se muestra un aviso amigable en vez del Alert de error genérico.
  const [agendaNoPublicada, setAgendaNoPublicada] = useState(false);

  const [bloqueActualIndex, setBloqueActualIndex] = useState(0);
  const indiceInicializado = useRef(false);

  // Vista mobile: día seleccionado (índice dentro del bloque de 6 días actual) y set de horas
  // expandidas ("HH:MM" con prefijo de fecha, para no compartir estado de expansión entre días
  // distintos que casualmente tengan la misma hora).
  const [diaMobileActivo, setDiaMobileActivo] = useState(0);
  const [horasExpandidas, setHorasExpandidas] = useState(() => new Set());

  // id_talk de la ponencia cuyo detalle está abierto (null = Modal cerrado). Separado de
  // `detalle` para poder mostrar el spinner de carga inmediatamente al hacer clic, sin
  // esperar a la respuesta.
  const [detalleTalkId, setDetalleTalkId] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [detalleLoading, setDetalleLoading] = useState(false);
  const [detalleError, setDetalleError] = useState('');

  useEffect(() => {
    if (detalleTalkId === null) return;
    setDetalle(null);
    setDetalleError('');
    setDetalleLoading(true);
    apiFetch(`/talks/${detalleTalkId}/detalle-publico`)
      .then(setDetalle)
      .catch((err) => {
        // Mismo 404 (TALK_NOT_FOUND) tanto si la ponencia no existe como si dejó de estar
        // programada justo entre el clic y la respuesta — se muestra un mensaje genérico,
        // sin distinguir el caso, como hace el propio backend.
        setDetalleError(err.code === 'TALK_NOT_FOUND' ? 'Esta ponencia ya no está disponible.' : err.message);
      })
      .finally(() => setDetalleLoading(false));
  }, [detalleTalkId]);

  function handleAbrirDetalle(idTalk) {
    setDetalleTalkId(idTalk);
  }

  function handleCerrarDetalle() {
    setDetalleTalkId(null);
  }

  useEffect(() => {
    setLoading(true);
    setError('');
    setAgendaNoPublicada(false);
    apiFetch(`/congresos/${idCongreso}/schedule/agenda`)
      .then((data) => setDias(data?.dias ?? []))
      .catch((err) => {
        if (err.code === 'AGENDA_NO_PUBLICADA') {
          setAgendaNoPublicada(true);
        } else {
          setError(err.message);
        }
      })
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

  // Al cambiar de bloque (incluida la carga inicial), reposiciona el tab mobile en el día de HOY
  // si está dentro del nuevo bloque, o en el primero disponible en caso contrario.
  useEffect(() => {
    const diasDelBloqueActual = bloques[bloqueActualIndex] ?? [];
    if (diasDelBloqueActual.length === 0) return;
    const hoyKey = toDateKey(new Date());
    const indice = diasDelBloqueActual.findIndex((d) => d.fecha === hoyKey);
    setDiaMobileActivo(indice !== -1 ? indice : 0);
  }, [bloqueActualIndex, bloques]);

  function toggleHoraExpandida(clave) {
    setHorasExpandidas((prev) => {
      const next = new Set(prev);
      if (next.has(clave)) {
        next.delete(clave);
      } else {
        next.add(clave);
      }
      return next;
    });
  }

  function handleBloqueAnterior() {
    setBloqueActualIndex((i) => Math.max(0, i - 1));
  }

  function handleBloqueSiguiente() {
    setBloqueActualIndex((i) => Math.min(bloques.length - 1, i + 1));
  }

  if (loading) return <PageLoader />;

  if (agendaNoPublicada) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <CalendarClock className="size-12 text-text-muted" />
        <p className="text-lg font-medium text-text-primary">La agenda aún no está disponible</p>
        <p className="text-sm text-text-muted">
          El comité organizador todavía no ha publicado la agenda de este congreso. Vuelve pronto.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pt-6">
        <Alert variant="error">{error}</Alert>
      </div>
    );
  }

  const diasBloque = bloques[bloqueActualIndex] ?? [];

  // Rango de horas acotado a la actividad real del bloque visible (los espacios vacíos no
  // cuentan, ya que esta vista pública no los muestra).
  let minMinutos = null;
  let maxMinutos = null;
  for (const dia of diasBloque) {
    for (const slot of dia.slots) {
      if (!esSlotVisible(slot)) continue;
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
    const slotsVisibles = dia.slots.filter(esSlotVisible);
    agruparPorSolapamiento(slotsVisibles).forEach((cluster, clusterIndex) => {
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

  // Vista mobile: slots visibles (ponencias y actividades) del día activo, agrupados por hora_inicio y ordenados
  // cronológicamente. Reutiliza el mismo `diasBloque` (y por tanto los mismos días ya cargados
  // y paginados) que el grid de desktop.
  const diaMobileSeleccionado = diasBloque[diaMobileActivo] ?? diasBloque[0] ?? null;
  const gruposPorHora = diaMobileSeleccionado
    ? (() => {
        const porHora = new Map();
        for (const slot of diaMobileSeleccionado.slots) {
          if (!esSlotVisible(slot)) continue;
          const hora = formatHora(slot.hora_inicio);
          if (!porHora.has(hora)) porHora.set(hora, []);
          porHora.get(hora).push(slot);
        }
        return [...porHora.entries()]
          .map(([hora, eventos]) => ({ hora, eventos }))
          .sort(
            (a, b) =>
              minutosDesdeMedianoche(a.eventos[0].hora_inicio) - minutosDesdeMedianoche(b.eventos[0].hora_inicio),
          );
      })()
    : [];

  const tiposDelCongreso = Object.keys(tipoColorMap);

  // Mismo `tipoColorMap` que colorea las mini-cards del grid semanal — se reutiliza tal cual
  // para que el Modal de detalle nunca muestre un tono distinto al que el usuario ya vio ahí.
  const tipoColorDetalle = detalle
    ? (tipoColorMap[detalle.tipo_participacion?.nombre ?? 'Sin tipo'] ?? COLOR_CICLO[0])
    : null;

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
            <>
            <div className="hidden lg:block overflow-x-auto">
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
                    className="border-t border-border pr-2 text-right text-xs text-text-muted flex items-center justify-end"
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
                      className={clsx('border-l border-border bg-surface', minutos % 60 === 0 && 'border-t')}
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
                      if (!slot.talk) {
                        return (
                          <div
                            key={slot.id_schedule}
                            className={clsx(
                              'm-1 min-h-0 flex-1 overflow-hidden rounded-lg border-l-4 p-2 pb-4 shadow-sm',
                              COLOR_ACTIVIDAD.border,
                              COLOR_ACTIVIDAD.bg,
                            )}
                          >
                            <div className="flex items-center gap-1 text-[10px] text-text-muted">
                              <Clock className="size-2.5 shrink-0" />
                              <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                                {formatHora(slot.hora_inicio)}–{formatHora(slot.hora_fin)}
                              </span>
                            </div>
                            <div className="mt-0.5 flex items-center gap-1 text-[10px] font-medium text-text-muted">
                              <Star className="size-2.5 shrink-0" />
                              Actividad
                            </div>
                            <p className="mt-0.5 line-clamp-2 text-xs font-medium text-text-primary">
                              {slot.titulo_actividad}
                            </p>
                            {slot.descripcion_actividad && (
                              <p className="mt-0.5 line-clamp-2 text-[10px] text-text-muted">
                                {slot.descripcion_actividad}
                              </p>
                            )}
                            {slot.salon?.nombre && (
                              <div className="mt-0.5 flex items-center gap-1 text-text-muted">
                                <MapPin className="size-2.5 shrink-0" />
                                <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[11px]">
                                  {slot.salon.nombre}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      }
                      const color = tipoColorMap[slot.talk.tipo_participacion?.nombre ?? 'Sin tipo'];
                      return (
                        <div
                          key={slot.id_schedule}
                          onClick={() => handleAbrirDetalle(slot.talk.id_talk)}
                          className={clsx(
                            'm-1 min-h-0 flex-1 cursor-pointer overflow-hidden rounded-lg border-l-4 p-2 shadow-sm pb-4 transition-opacity hover:opacity-80',
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
                          <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[10px] font-medium">
                            <span className={clsx('flex items-center gap-1', color.text)}>
                              <span className={clsx('size-1.5 shrink-0 rounded-full', color.dot)} />
                              <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                                {slot.talk.tipo_participacion?.nombre ?? 'Sin tipo'}
                              </span>
                            </span>
                            {slot.talk.area && (
                              <>
                                <span className="text-text-muted">·</span>
                                <span className="truncate text-text-muted">{slot.talk.area.nombre}</span>
                              </>
                            )}
                          </div>
                          <p className="mt-0.5 line-clamp-4 text-xs font-medium text-text-primary">
                            {slot.talk.titulo}
                          </p>
                          <div className="mt-0.5 flex  items-center gap-1 text-text-muted ">
                             <MapPin className="size-2.5 shrink-0" />
                            <div className="flex flex-col">
                            <span className="overflow-hidden text-[11px] text-ellipsis whitespace-nowrap ">
                             
                              {slot.salon.nombre} 
                            </span>
                            <span className="overflow-hidden text-[8px] text-ellipsis whitespace-nowrap  ">
                              {capitalizar(slot.talk.inscripcion.usuario.nombre)}{' '}
                              {capitalizar(slot.talk.inscripcion.usuario.apellido)}
                             
                            </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:hidden">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {diasBloque.map((dia, index) => {
                  const activo = index === diaMobileActivo;
                  const fecha = parseFechaYMD(dia.fecha);
                  return (
                    <button
                      key={dia.fecha}
                      type="button"
                      onClick={() => setDiaMobileActivo(index)}
                      className={clsx(
                        'flex shrink-0 flex-col items-center rounded-xl border px-4 py-2',
                        activo ? 'border-accent bg-accent/10' : 'border-border bg-surface',
                      )}
                    >
                      <span className="text-xs uppercase text-text-muted">
                        {DIA_SEMANA_CORTO[fecha.getDay()]}
                      </span>
                      <span className={clsx('text-lg font-bold', activo ? 'text-accent' : 'text-text-primary')}>
                        {fecha.getDate()}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 flex flex-col gap-2">
                {gruposPorHora.length === 0 ? (
                  <p className="py-8 text-center text-sm text-text-muted">
                    No hay actividades programadas este día.
                  </p>
                ) : (
                  gruposPorHora.map(({ hora, eventos }) => {
                    if (eventos.length === 1) {
                      return (
                        <EventoCardMobile
                          key={eventos[0].id_schedule}
                          slot={eventos[0]}
                          tipoColorMap={tipoColorMap}
                          onClick={handleAbrirDetalle}
                        />
                      );
                    }
                    const claveHora = `${diaMobileSeleccionado.fecha}-${hora}`;
                    const expandido = horasExpandidas.has(claveHora);
                    return (
                      <div key={hora} className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => toggleHoraExpandida(claveHora)}
                          className="flex w-full items-center justify-between rounded-lg border border-border bg-surface px-4 py-3 text-left"
                        >
                          <span className="font-medium text-text-primary">{hora}</span>
                          <span className="text-sm text-text-muted">{eventos.length} actividades a esta hora</span>
                          <ChevronDown className={clsx('size-4 transition-transform', expandido && 'rotate-180')} />
                        </button>
                        {expandido && (
                          <div className="flex flex-col gap-2 pl-2">
                            {eventos.map((slot) => (
                              <EventoCardMobile
                                key={slot.id_schedule}
                                slot={slot}
                                tipoColorMap={tipoColorMap}
                                onClick={handleAbrirDetalle}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            </>
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

      <Modal
        open={detalleTalkId !== null}
        onClose={handleCerrarDetalle}
        size="lg"
        accentClassName={tipoColorDetalle?.solid}
      >
        {detalleLoading ? (
          <div className="flex justify-center py-8 ">
            <Spinner className="size-6 text-accent" />
          </div>
        ) : detalleError ? (
          <Alert variant="error">{detalleError}</Alert>
        ) : detalle ? (
          <div className="flex flex-col">
            {/* Eyebrow: tipo de participación (coloreado según tipoColorMap) + separador + pill de área */}
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={clsx(
                  'flex items-center gap-1 text-xs font-medium uppercase tracking-wide',
                  tipoColorDetalle.text,
                )}
              >
                <FileText className="size-3.5" />
                {detalle.tipo_participacion?.nombre?.toUpperCase() ?? 'PONENCIA'}
              </span>
              <span className="text-text-muted">·</span>
              <span className="inline-flex items-center rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent">
                {detalle.area.nombre}
              </span>
            </div>

            {/* Título grande */}
            <h3 className="mt-2 text-xl font-bold text-text-primary sm:text-xl">{detalle.titulo}</h3>

            {/* Fecha/hora + salón — una fila si es sesión única, una fila por sesión si es cursillo */}
            <div className="mt-4 border-t border-border pt-4">
              {detalle.schedules.length === 1 ? (
                <div className="flex flex-wrap items-center gap-4 text-sm text-text-primary">
                  <span className="flex items-center gap-1.5">
                    <Clock className="size-4 shrink-0 text-text-muted" />
                    {formatFechaSolo(detalle.schedules[0].fecha)}, {formatHora(detalle.schedules[0].hora_inicio)}–
                    {formatHora(detalle.schedules[0].hora_fin)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="size-4 shrink-0 text-text-muted" />
                    {detalle.schedules[0].salon.nombre}
                  </span>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {detalle.schedules.map((s, i) => (
                    <div key={i} className="flex flex-wrap items-center gap-4 text-sm text-text-primary">
                      <span className="text-xs font-semibold uppercase tracking-wide text-accent">
                        Sesión {i + 1}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="size-4 shrink-0 text-text-muted" />
                        {formatFechaSolo(s.fecha)}, {formatHora(s.hora_inicio)}–{formatHora(s.hora_fin)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="size-4 shrink-0 text-text-muted" />
                        {s.salon.nombre}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Descripción — mismo tratamiento (justificado + LaTeX) que PonenciaDetalle.jsx */}
            {detalle.descripcion && (
              <div className="mt-4 border-t border-border pt-4">
                <div className="text-justify text-xs leading-relaxed text-text-primary [text-wrap:pretty]">
                  <TextoConFormulas texto={detalle.descripcion} />
                </div>
              </div>
            )}

            {/* Palabras clave */}
            {detalle.palabras_clave && (
              <div className="mt-4 border-t border-border pt-4">
                <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Palabras clave</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {detalle.palabras_clave
                    .split(',')
                    .map((p) => p.trim())
                    .filter(Boolean)
                    .map((palabra, i) => (
                      <span
                        key={i}
                        className="rounded-full border border-border bg-surface px-3 py-1 text-xs text-text-primary"
                      >
                        {palabra}
                      </span>
                    ))}
                </div>
              </div>
            )}

            {/* Autor principal | Coautores */}
            <div className="mt-4 grid grid-cols-1 gap-4 border-t border-border pt-4 sm:grid-cols-2">
              <div className={detalle.coautores.length === 0 ? 'sm:col-span-2' : undefined}>
                <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Autor principal</p>
                <p className="mt-1 text-sm font-bold text-text-primary">
                  {capitalizar(detalle.autor_principal.nombre)} {capitalizar(detalle.autor_principal.apellido)}
                </p>
                {detalle.autor_principal.institucion && (
                  <p className="text-xs text-text-muted mt-0.5">{detalle.autor_principal.institucion}</p>
                )}
              </div>
              {detalle.coautores.length > 0 && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Coautores</p>
                  <ul className="mt-1 space-y-1.5">
                    {detalle.coautores.map((c, i) => (
                      <li key={c.id_user ?? c.id ?? i}>
                        <p className="text-sm text-text-primary">
                          {capitalizar(c.nombre)} {capitalizar(c.apellido)}
                        </p>
                        {c.institucion && (
                          <p className="text-xs text-text-muted mt-0.5">{c.institucion}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
