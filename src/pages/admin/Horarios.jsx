import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Star, Layers, Search, Check } from 'lucide-react';
import clsx from 'clsx';
import { apiFetch } from '../../api/client';
import { useCongreso } from '../../context/CongresoContext';
import { ESTADO_INSCRIPCION_LABEL, capitalizar } from '../../utils/formato';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { DatePicker } from '../../components/ui/DatePicker';
import { Modal } from '../../components/ui/Modal';
import { Alert } from '../../components/ui/Alert';
import { PageLoader } from '../../components/ui/PageLoader';

const FORM_INICIAL = { id_salon: '', fecha: '', hora_inicio: '', hora_fin: '' };
const ACTIVIDAD_INICIAL = { titulo: '', descripcion: '' };

// Un slot es UNA de estas cosas — nunca ponencia y actividad a la vez (el backend responde
// 400 SLOT_TIPO_AMBIGUO si llegan ambas). El selector de tipo del Modal lo garantiza en origen.
// POSTERS solo se ofrece al crear un slot nuevo (ver más abajo): el backend expone su creación
// vía un endpoint dedicado (POST .../schedule/sesion-posters) que siempre inserta una fila
// nueva, sin equivalente de edición — no tiene sentido ofrecerlo al editar un slot existente.
const TIPO_SLOT = { PONENCIA: 'ponencia', ACTIVIDAD: 'actividad', VACIO: 'vacio', POSTERS: 'posters' };

const GENERADOR_FORM_INICIAL = {
  id_salon: '',
  fecha: '',
  hora_inicio: '',
  duracion_minutos: '',
  cantidad_slots: '',
};

// Mismo criterio de manejo de horas que el resto del proyecto (Date nativo sobre una fecha de
// referencia fija, sin librería externa) — se usa solo para la vista previa calculada en el
// frontend; el backend recalcula los mismos rangos de forma independiente al generar el lote.
function sumarMinutosAHora(horaHHMM, minutosASumar) {
  const [horas, minutos] = horaHHMM.split(':').map(Number);
  const base = new Date(1970, 0, 1, horas, minutos);
  base.setMinutes(base.getMinutes() + minutosASumar);
  return `${String(base.getHours()).padStart(2, '0')}:${String(base.getMinutes()).padStart(2, '0')}`;
}

// hora_inicio/hora_fin viajan como Date @db.Time serializado a ISO sobre una fecha de
// referencia fija (ej. "1970-01-01T09:00:00.000Z"); se fuerza 'Z' en el backend, así que
// extraer los caracteres 11-16 da la hora real sin ninguna conversión de huso horario.
function formatHora(value) {
  return typeof value === 'string' ? value.slice(11, 16) : '';
}

// Mismo problema que resuelve DatePicker.parseLocalDate: new Date('YYYY-MM-DD') se
// interpreta como medianoche UTC, y toLocaleDateString con huso negativo la muestra un
// día atrás. Se arma el Date con año/mes/día explícitos para evitar esa conversión.
function formatFechaSlot(fechaISO) {
  const [year, month, day] = fechaISO.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function Horarios() {
  const { congreso } = useCongreso();
  const idCongreso = congreso?.id_congreso;

  // Preselección al llegar desde CalendarioAdmin (?slot=<id_schedule>&fecha=<YYYY-MM-DD>):
  // la fecha se lee una sola vez, al crear el state, para no disparar un fetch extra sin
  // filtro seguido de otro ya filtrado.
  const [searchParams, setSearchParams] = useSearchParams();
  const slotParamHandled = useRef(false);

  const [fecha, setFecha] = useState(() => searchParams.get('fecha') || null);
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [salonesActivos, setSalonesActivos] = useState([]);
  const [talksAceptadas, setTalksAceptadas] = useState([]);
  const [areasEstudio, setAreasEstudio] = useState([]);
  const [tiposParticipacion, setTiposParticipacion] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [talkSeleccionado, setTalkSeleccionado] = useState(null);
  const [tipoSlot, setTipoSlot] = useState(TIPO_SLOT.PONENCIA);
  const [actividad, setActividad] = useState(ACTIVIDAD_INICIAL);
  const [busquedaPonencia, setBusquedaPonencia] = useState('');
  const [postersDisponibles, setPostersDisponibles] = useState([]);
  const [postersSeleccionados, setPostersSeleccionados] = useState([]);
  const [busquedaPoster, setBusquedaPoster] = useState('');
  // 'false' (Sin programar) por defecto: al abrir el Modal, se prioriza mostrar lo que
  // falta programar en vez de lo que ya está resuelto.
  const [areaFiltro, setAreaFiltro] = useState('');
  const [tipoParticipacionFiltro, setTipoParticipacionFiltro] = useState('');
  const [programadoFiltro, setProgramadoFiltro] = useState('false');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [confirmarEliminar, setConfirmarEliminar] = useState(null);
  const [eliminarError, setEliminarError] = useState('');
  const [eliminando, setEliminando] = useState(false);

  const [generadorOpen, setGeneradorOpen] = useState(false);
  const [generadorForm, setGeneradorForm] = useState(GENERADOR_FORM_INICIAL);
  const [generadorError, setGeneradorError] = useState('');
  const [generadorSubmitting, setGeneradorSubmitting] = useState(false);
  const [generadorExito, setGeneradorExito] = useState('');

  function cargarSchedule() {
    const query = fecha ? `?fecha=${fecha}` : '';
    return apiFetch(`/congresos/${idCongreso}/schedule${query}`).then((data) => setSchedule(data ?? []));
  }

  useEffect(() => {
    setLoading(true);
    setError('');
    cargarSchedule()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idCongreso, fecha]);

  // Una vez cargado el schedule del día preseleccionado, intenta abrir el Modal de edición
  // del slot pedido por CalendarioAdmin. Corre una sola vez (slotParamHandled) — si no lo
  // hiciera, cada recarga posterior de `schedule` (tras guardar/eliminar otro slot) volvería
  // a intentar reabrir el mismo Modal.
  useEffect(() => {
    if (slotParamHandled.current || loading) return;

    const slotParam = searchParams.get('slot');
    if (!slotParam) {
      slotParamHandled.current = true;
      return;
    }

    slotParamHandled.current = true;
    const encontrado = schedule.find((s) => s.id_schedule === Number(slotParam));
    if (encontrado) handleAbrirEditar(encontrado);

    const nuevosParams = new URLSearchParams(searchParams);
    nuevosParams.delete('slot');
    nuevosParams.delete('fecha');
    setSearchParams(nuevosParams, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, schedule]);

  useEffect(() => {
    apiFetch(`/congresos/${idCongreso}/salones?activo=true`)
      .then((data) => setSalonesActivos(data ?? []))
      .catch(() => setSalonesActivos([]));
    apiFetch(`/congresos/${idCongreso}/areas-estudio?activo=true`)
      .then((data) => setAreasEstudio(data ?? []))
      .catch(() => setAreasEstudio([]));
    apiFetch(`/congresos/${idCongreso}/tipos-participacion?activo=true`)
      .then((data) => setTiposParticipacion(data ?? []))
      .catch(() => setTiposParticipacion([]));
  }, [idCongreso]);

  function cargarTalks() {
    const params = new URLSearchParams();
    params.set('id_congreso', idCongreso);
    params.set('estado_talk', 'aceptada');
    params.set('solo_programables', 'true');
    if (areaFiltro) params.set('id_area', areaFiltro);
    if (tipoParticipacionFiltro) params.set('id_tipo_participacion', tipoParticipacionFiltro);
    if (programadoFiltro) params.set('programado', programadoFiltro);
    return apiFetch(`/talks?${params.toString()}`).then((data) => setTalksAceptadas(data ?? []));
  }

  useEffect(() => {
    cargarTalks().catch(() => setTalksAceptadas([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idCongreso, areaFiltro, tipoParticipacionFiltro, programadoFiltro]);

  // Resuelto desde el catálogo en vez de hardcodear un ID: el id_tipo_participacion de "Poster"
  // puede variar entre congresos/entornos.
  const idTipoPoster = useMemo(
    () => tiposParticipacion.find((t) => t.nombre === 'Poster')?.id_tipo_participacion ?? null,
    [tiposParticipacion],
  );

  function cargarPosters() {
    if (!idTipoPoster) return Promise.resolve();
    const params = new URLSearchParams();
    params.set('id_congreso', idCongreso);
    params.set('estado_talk', 'aceptada');
    params.set('solo_programables', 'true');
    params.set('id_tipo_participacion', idTipoPoster);
    params.set('programado', 'false');
    return apiFetch(`/talks?${params.toString()}`).then((data) => setPostersDisponibles(data ?? []));
  }

  // Se carga bajo demanda (al elegir el tipo "Sesión de Pósteres"), no de entrada como
  // talksAceptadas: la mayoría de las veces el admin no está creando una sesión de pósteres.
  useEffect(() => {
    if (tipoSlot !== TIPO_SLOT.POSTERS || !idTipoPoster) return;
    cargarPosters().catch(() => setPostersDisponibles([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipoSlot, idTipoPoster, modalOpen]);

  function handleTogglePoster(talk) {
    setPostersSeleccionados((prev) =>
      prev.some((p) => p.id_talk === talk.id_talk)
        ? prev.filter((p) => p.id_talk !== talk.id_talk)
        : [...prev, talk],
    );
  }

  const gruposPorSalon = useMemo(() => {
    const mapa = new Map();
    for (const slot of schedule) {
      if (!mapa.has(slot.id_salon)) mapa.set(slot.id_salon, { salon: slot.salon, slots: [] });
      mapa.get(slot.id_salon).slots.push(slot);
    }
    return Array.from(mapa.values()).sort((a, b) => a.salon.nombre.localeCompare(b.salon.nombre));
  }, [schedule]);

  // Sin mínimo de caracteres a propósito: a diferencia de otros buscadores del proyecto, aquí
  // la caja debe poder mostrar TODAS las ponencias (recorribles con scroll) sin escribir nada.
  const ponenciasFiltradas = useMemo(() => {
    const texto = busquedaPonencia.trim().toLowerCase();
    if (!texto) return talksAceptadas;
    return talksAceptadas.filter((t) => t.titulo.toLowerCase().includes(texto));
  }, [talksAceptadas, busquedaPonencia]);

  const postersFiltrados = useMemo(() => {
    const texto = busquedaPoster.trim().toLowerCase();
    if (!texto) return postersDisponibles;
    return postersDisponibles.filter((t) => t.titulo.toLowerCase().includes(texto));
  }, [postersDisponibles, busquedaPoster]);

  function handleAbrirCrear() {
    setEditando(null);
    setForm({ ...FORM_INICIAL, fecha: fecha ?? '' });
    setTalkSeleccionado(null);
    setTipoSlot(TIPO_SLOT.PONENCIA);
    setActividad(ACTIVIDAD_INICIAL);
    setBusquedaPonencia('');
    setAreaFiltro('');
    setTipoParticipacionFiltro('');
    setProgramadoFiltro('false');
    setPostersSeleccionados([]);
    setBusquedaPoster('');
    setFormError('');
    setModalOpen(true);
  }

  function handleAbrirEditar(slot) {
    setEditando(slot);
    setForm({
      id_salon: String(slot.id_salon),
      fecha: slot.fecha.slice(0, 10),
      hora_inicio: formatHora(slot.hora_inicio),
      hora_fin: formatHora(slot.hora_fin),
    });
    // talksAceptadas puede no incluir todavía `schedules` actualizado o, en un caso límite,
    // no haber cargado aún — se usa slot.talk (siempre presente cuando slot.id_talk existe)
    // como respaldo para no perder el título/id ya asignados a este slot.
    const talkAsignado = slot.talk
      ? (talksAceptadas.find((t) => t.id_talk === slot.talk.id_talk) ?? { ...slot.talk, schedules: [] })
      : null;
    setTalkSeleccionado(talkAsignado);
    setTipoSlot(slot.titulo_actividad ? TIPO_SLOT.ACTIVIDAD : TIPO_SLOT.PONENCIA);
    setActividad({ titulo: slot.titulo_actividad ?? '', descripcion: slot.descripcion_actividad ?? '' });
    setBusquedaPonencia('');
    setAreaFiltro('');
    setTipoParticipacionFiltro('');
    setProgramadoFiltro('false');
    setPostersSeleccionados([]);
    setBusquedaPoster('');
    setFormError('');
    setModalOpen(true);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      // Sesión de pósteres: siempre creación (nunca editando, la opción ni se ofrece al editar),
      // vía su propio endpoint que agrupa varios id_talk bajo una sola fila de Schedule.
      if (tipoSlot === TIPO_SLOT.POSTERS) {
        await apiFetch(`/congresos/${idCongreso}/schedule/sesion-posters`, {
          method: 'POST',
          body: JSON.stringify({
            id_salon: Number(form.id_salon),
            fecha: form.fecha,
            hora_inicio: form.hora_inicio,
            hora_fin: form.hora_fin,
            id_talks: postersSeleccionados.map((p) => p.id_talk),
          }),
        });
        await cargarSchedule();
        setModalOpen(false);
        return;
      }

      // Valores finales de los 3 campos que definen el tipo de slot. El que no corresponde al
      // tipo elegido va explícitamente en null (no omitido): el backend lo exige para permitir
      // convertir un slot existente de ponencia a actividad, o al revés.
      const idTalkSeleccionado = tipoSlot === TIPO_SLOT.PONENCIA ? (talkSeleccionado?.id_talk ?? null) : null;
      const tituloActividad = tipoSlot === TIPO_SLOT.ACTIVIDAD ? actividad.titulo.trim() : null;
      const descripcionActividad =
        tipoSlot === TIPO_SLOT.ACTIVIDAD ? actividad.descripcion.trim() || null : null;

      if (editando) {
        const cambios = {};
        if (Number(form.id_salon) !== editando.id_salon) cambios.id_salon = Number(form.id_salon);
        if (idTalkSeleccionado !== (editando.id_talk ?? null)) cambios.id_talk = idTalkSeleccionado;
        if (tituloActividad !== (editando.titulo_actividad ?? null)) cambios.titulo_actividad = tituloActividad;
        if (descripcionActividad !== (editando.descripcion_actividad ?? null)) {
          cambios.descripcion_actividad = descripcionActividad;
        }
        if (form.fecha !== editando.fecha.slice(0, 10)) cambios.fecha = form.fecha;
        if (form.hora_inicio !== formatHora(editando.hora_inicio)) cambios.hora_inicio = form.hora_inicio;
        if (form.hora_fin !== formatHora(editando.hora_fin)) cambios.hora_fin = form.hora_fin;

        await apiFetch(`/congresos/${idCongreso}/schedule/${editando.id_schedule}`, {
          method: 'PATCH',
          body: JSON.stringify(cambios),
        });
      } else {
        const body = {
          id_salon: Number(form.id_salon),
          fecha: form.fecha,
          hora_inicio: form.hora_inicio,
          hora_fin: form.hora_fin,
        };
        if (idTalkSeleccionado !== null) body.id_talk = idTalkSeleccionado;
        if (tituloActividad !== null) body.titulo_actividad = tituloActividad;
        if (descripcionActividad !== null) body.descripcion_actividad = descripcionActividad;

        await apiFetch(`/congresos/${idCongreso}/schedule`, {
          method: 'POST',
          body: JSON.stringify(body),
        });
      }
      await cargarSchedule();
      setModalOpen(false);
    } catch (err) {
      if (err.code === 'TALK_CONGRESO_MISMATCH' || err.code === 'SALON_CONGRESO_MISMATCH') {
        setFormError('El salón o la ponencia seleccionados no pertenecen a este congreso.');
      } else if (err.code === 'SLOT_TIPO_AMBIGUO') {
        setFormError(
          'Un horario no puede tener una ponencia y una actividad a la vez. Elige solo uno de los dos tipos.',
        );
      } else if (err.code === 'TALKS_DUPLICADOS') {
        setFormError('Hay pósteres repetidos en la selección — cada uno solo puede elegirse una vez.');
      } else if (err.code === 'TALK_NO_ES_POSTER') {
        setFormError('Una de las ponencias seleccionadas no es de tipo Poster.');
      } else if (err.code === 'INSCRIPCION_NO_HABILITADA_PARA_PROGRAMAR' && talkSeleccionado) {
        const estadoInscripcion = talkSeleccionado?.inscripcion?.estado_inscripcion;
        const estadoInscripcionLegible = ESTADO_INSCRIPCION_LABEL[estadoInscripcion] ?? estadoInscripcion;
        setFormError(
          `No se puede programar esta ponencia: su inscripción está en estado "${estadoInscripcionLegible}". Debe estar confirmada o con carta de compromiso.`,
        );
      } else {
        setFormError(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handleAbrirEliminar(slot) {
    setConfirmarEliminar(slot);
    setEliminarError('');
  }

  async function handleConfirmarEliminar() {
    setEliminarError('');
    setEliminando(true);
    try {
      await apiFetch(`/congresos/${idCongreso}/schedule/${confirmarEliminar.id_schedule}`, {
        method: 'DELETE',
      });
      await cargarSchedule();
      setConfirmarEliminar(null);
    } catch (err) {
      setEliminarError(err.message);
    } finally {
      setEliminando(false);
    }
  }

  function handleAbrirGenerador() {
    setGeneradorForm({ ...GENERADOR_FORM_INICIAL, fecha: fecha ?? '' });
    setGeneradorError('');
    setGeneradorExito('');
    setGeneradorOpen(true);
  }

  function handleChangeGenerador(e) {
    const { name, value } = e.target;
    setGeneradorForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmitGenerador(e) {
    e.preventDefault();
    if (!generadorFormValido) return;
    setGeneradorError('');
    setGeneradorSubmitting(true);
    try {
      const data = await apiFetch(`/congresos/${idCongreso}/schedule/generar-lote`, {
        method: 'POST',
        body: JSON.stringify({
          id_salon: Number(generadorForm.id_salon),
          fecha: generadorForm.fecha,
          hora_inicio: generadorForm.hora_inicio,
          duracion_minutos: Number(generadorForm.duracion_minutos),
          cantidad_slots: Number(generadorForm.cantidad_slots),
        }),
      });
      setGeneradorOpen(false);
      setGeneradorExito(`${data.creados} slots creados correctamente`);
      await cargarSchedule();
    } catch (err) {
      // 409 LOTE_SOLAPADO ya identifica el slot en conflicto en el mensaje; 400
      // CANTIDAD_INVALIDA/DURACION_INVALIDA son defensa en profundidad, ya prevenidos por la
      // validación de `generadorFormValido` antes de llegar aquí. En ambos casos el Modal se
      // queda abierto con los valores ya ingresados, para que el usuario pueda ajustarlos.
      setGeneradorError(err.message);
    } finally {
      setGeneradorSubmitting(false);
    }
  }

  // Ponencia exige elegir una; actividad exige título; pósteres exige al menos uno. "Vacío"
  // siempre es válido.
  const slotFormValido =
    (tipoSlot !== TIPO_SLOT.PONENCIA || talkSeleccionado !== null) &&
    (tipoSlot !== TIPO_SLOT.ACTIVIDAD || actividad.titulo.trim() !== '') &&
    (tipoSlot !== TIPO_SLOT.POSTERS || postersSeleccionados.length > 0);

  // Validación en frontend, antes de permitir el submit — cantidad_slots entre 1 y 50 y
  // duracion_minutos > 0, mismos límites que valida el backend (ver generarSlotsVacios), para
  // no necesitar ida y vuelta al servidor en el caso común de un typo.
  const cantidadSlotsNum = Number(generadorForm.cantidad_slots);
  const cantidadSlotsInvalida =
    generadorForm.cantidad_slots !== '' &&
    (!Number.isInteger(cantidadSlotsNum) || cantidadSlotsNum < 1 || cantidadSlotsNum > 50);

  const duracionMinutosNum = Number(generadorForm.duracion_minutos);
  const duracionMinutosInvalida =
    generadorForm.duracion_minutos !== '' && (!Number.isInteger(duracionMinutosNum) || duracionMinutosNum <= 0);

  const generadorFormCompleto =
    generadorForm.id_salon !== '' &&
    generadorForm.fecha !== '' &&
    generadorForm.hora_inicio !== '' &&
    generadorForm.duracion_minutos !== '' &&
    generadorForm.cantidad_slots !== '';

  const generadorFormValido = generadorFormCompleto && !cantidadSlotsInvalida && !duracionMinutosInvalida;

  const salonGeneradorSeleccionado = salonesActivos.find(
    (s) => s.id_salon === Number(generadorForm.id_salon),
  );

  const horaFinCalculada = generadorFormValido
    ? sumarMinutosAHora(generadorForm.hora_inicio, duracionMinutosNum * cantidadSlotsNum)
    : null;

  return (
    <div className="flex flex-col gap-6 pt-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-sans text-2xl font-bold text-text-primary">Horarios</h1>
          <p className="mt-1 text-sm text-text-muted">
            Grilla de horarios del congreso, agrupada por salón.
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={handleAbrirGenerador}>
            <Layers className="size-4" />
            Generador
          </Button>
          <Button type="button" variant="primary" onClick={handleAbrirCrear}>
            Nuevo horario
          </Button>
        </div>
      </div>

      <DatePicker label="Filtrar por fecha" value={fecha} onChange={setFecha} />

      {error && <Alert variant="error">{error}</Alert>}
      {generadorExito && <Alert variant="success">{generadorExito}</Alert>}

      {loading ? (
        <PageLoader />
      ) : gruposPorSalon.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface px-6 py-12 text-center">
          <p className="text-sm text-text-muted">
            {fecha ? 'No hay horarios programados para esta fecha.' : 'Todavía no hay horarios programados.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {gruposPorSalon.map((grupo) => (
            <Card key={grupo.salon.id_salon}>
              <h2 className="text-sm font-medium uppercase tracking-wide text-text-muted">
                {grupo.salon.nombre}
              </h2>
              <div className="mt-4 flex flex-col gap-3">
                {grupo.slots.map((slot) => (
                  <div
                    key={slot.id_schedule}
                    className="flex flex-col gap-2 border-b border-border pb-3 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        {!fecha && `${formatFechaSlot(slot.fecha)} · `}
                        {formatHora(slot.hora_inicio)}–{formatHora(slot.hora_fin)}
                      </p>
                      {slot.talk ? (
                        <p className="text-sm text-text-muted">
                          {slot.talk.titulo} —{' '}
                          {capitalizar(slot.talk.inscripcion?.usuario?.nombre)}{' '}
                          {capitalizar(slot.talk.inscripcion?.usuario?.apellido)}
                        </p>
                      ) : slot.posters && slot.posters.length > 0 ? (
                        <div className="text-sm">
                          <p className="flex items-center gap-1.5 font-medium text-accent">
                            <Layers className="size-3.5 shrink-0" />
                            Sesión de Pósteres ({slot.posters.length})
                          </p>
                          <ul className="mt-0.5 list-disc pl-5 text-text-muted">
                            {slot.posters.map((p) => (
                              <li key={p.id_talk}>
                                {p.titulo} — {capitalizar(p.autor)}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : slot.titulo_actividad ? (
                        <p className="flex items-center gap-1.5 text-sm text-warning-text">
                          <Star className="size-3.5 shrink-0" />
                          <span>
                            {slot.titulo_actividad}
                            {slot.descripcion_actividad && (
                              <span className="text-text-muted"> — {slot.descripcion_actividad}</span>
                            )}
                          </span>
                        </p>
                      ) : (
                        <p className="text-sm text-text-muted">Slot vacío</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {/* Editar una sesión de pósteres no está soportado: el Modal no tiene forma de
                          precargar el multi-select con los pósteres ya asignados a esta fila —
                          solo queda eliminarla y volver a crearla. */}
                      {!(slot.posters && slot.posters.length > 0) && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => handleAbrirEditar(slot)}>
                          Editar
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => handleAbrirEliminar(slot)}
                      >
                        Eliminar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editando ? 'Editar horario' : 'Nuevo horario'}
        size="lg"
      >
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          {formError && <Alert variant="error">{formError}</Alert>}

          <div
            className={clsx(
              'grid grid-cols-1 gap-6',
              (tipoSlot === TIPO_SLOT.PONENCIA || tipoSlot === TIPO_SLOT.POSTERS) && 'lg:grid-cols-2',
            )}
          >
            <div className="flex flex-col gap-4">
              <Select
                name="id_salon"
                label="Salón"
                value={form.id_salon}
                onChange={handleChange}
                required
              >
                <option value="">Selecciona un salón</option>
                {salonesActivos.map((s) => (
                  <option key={s.id_salon} value={s.id_salon}>
                    {s.nombre} (cap. {s.capacidad})
                  </option>
                ))}
              </Select>

              <DatePicker
                label="Fecha"
                value={form.fecha}
                onChange={(nuevaFecha) => setForm((prev) => ({ ...prev, fecha: nuevaFecha }))}
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="time"
                  name="hora_inicio"
                  label="Hora inicio"
                  value={form.hora_inicio}
                  onChange={handleChange}
                  required
                />
                <Input
                  type="time"
                  name="hora_fin"
                  label="Hora fin"
                  value={form.hora_fin}
                  onChange={handleChange}
                  required
                />
              </div>

              <Select
                label="Tipo de slot"
                value={tipoSlot}
                onChange={(e) => setTipoSlot(e.target.value)}
              >
                <option value={TIPO_SLOT.PONENCIA}>Ponencia</option>
                <option value={TIPO_SLOT.ACTIVIDAD}>Actividad libre</option>
                <option value={TIPO_SLOT.VACIO}>Vacío</option>
                {/* Solo al crear: ver nota junto a TIPO_SLOT sobre por qué no se ofrece al editar. */}
                {!editando && <option value={TIPO_SLOT.POSTERS}>Sesión de Pósteres</option>}
              </Select>

              {tipoSlot === TIPO_SLOT.ACTIVIDAD && (
                <div className="flex flex-col gap-3 border-t border-border pt-4">
                  <Input
                    label="Título de la actividad"
                    placeholder="Ej. Almuerzo, Café de bienvenida"
                    value={actividad.titulo}
                    onChange={(e) => setActividad((prev) => ({ ...prev, titulo: e.target.value }))}
                    required
                  />
                  <Input
                    label="Descripción (opcional)"
                    placeholder="Ej. Espacio de networking informal"
                    value={actividad.descripcion}
                    onChange={(e) => setActividad((prev) => ({ ...prev, descripcion: e.target.value }))}
                  />
                </div>
              )}

              {tipoSlot === TIPO_SLOT.VACIO && editando && (talkSeleccionado || editando.titulo_actividad) && (
                <Alert variant="warning">
                  Al guardar, este slot quedará vacío: se quitará la ponencia o actividad que tiene ahora.
                </Alert>
              )}

              {tipoSlot === TIPO_SLOT.PONENCIA && (
              <div className="flex flex-col gap-2 border-t border-border pt-4">
                <label className="text-xs font-medium uppercase tracking-wide text-text-muted">
                  Trabajos
                </label>
                <p className="text-xs text-text-muted">
                  Solo se muestran ponencias aceptadas con inscripción confirmada o en carta de compromiso.
                </p>

                <div className="flex flex-wrap gap-2">
                  <Select
                    label="Área"
                    value={areaFiltro}
                    onChange={(e) => setAreaFiltro(e.target.value)}
                    className="min-w-[110px] flex-1"
                  >
                    <option value="">Todas</option>
                    {areasEstudio.map((a) => (
                      <option key={a.id_area} value={a.id_area}>
                        {a.nombre}
                      </option>
                    ))}
                  </Select>
                  <Select
                    label="Tipo de trabajo"
                    value={tipoParticipacionFiltro}
                    onChange={(e) => setTipoParticipacionFiltro(e.target.value)}
                    className="min-w-[110px] flex-1"
                  >
                    <option value="">Todos</option>
                    {tiposParticipacion.map((t) => (
                      <option key={t.id_tipo_participacion} value={t.id_tipo_participacion}>
                        {t.nombre}
                      </option>
                    ))}
                  </Select>
                  <Select
                    label="Estado"
                    value={programadoFiltro}
                    onChange={(e) => setProgramadoFiltro(e.target.value)}
                    className="min-w-[110px] flex-1"
                  >
                    <option value="">Todas</option>
                    <option value="false">Sin programar</option>
                    <option value="true">Ya programadas</option>
                  </Select>
                </div>
              </div>
              )}

              {tipoSlot === TIPO_SLOT.POSTERS && (
                <div className="flex flex-col gap-2 border-t border-border pt-4">
                  <label className="text-xs font-medium uppercase tracking-wide text-text-muted">
                    Sesión de pósteres
                  </label>
                  <p className="text-xs text-text-muted">
                    Selecciona los pósteres que compartirán este salón y horario. Solo se muestran
                    pósteres aceptados, sin horario aún, con inscripción confirmada o en carta de
                    compromiso.
                  </p>
                </div>
              )}
            </div>

            {tipoSlot === TIPO_SLOT.PONENCIA && (
            <div className="flex flex-col gap-3 lg:pt-6">
              <Input
                icon={<Search className="size-4" />}
                placeholder="Buscar por título..."
                value={busquedaPonencia}
                onChange={(e) => setBusquedaPonencia(e.target.value)}
              />
              <div className="max-h-80 overflow-y-auto rounded-lg border border-border bg-surface">
                {ponenciasFiltradas.map((talk) => (
                  <button
                    key={talk.id_talk}
                    type="button"
                    onClick={() => setTalkSeleccionado(talk)}
                    className={clsx(
                      'flex w-full flex-col items-start gap-0.5 border-t border-border px-3 py-2 text-left text-sm transition-colors hover:bg-background',
                      talkSeleccionado?.id_talk === talk.id_talk && 'bg-accent/10',
                      talk.schedules.length > 0 ? 'text-success-text' : 'text-text-primary',
                    )}
                  >
                    <span className="font-medium">{talk.titulo}</span>
                    {talk.schedules.length > 0 && (
                      <span className="text-xs text-success-text/80">Ya tiene horario asignado</span>
                    )}
                  </button>
                ))}
                {ponenciasFiltradas.length === 0 && (
                  <p className="px-3 py-4 text-center text-sm text-text-muted">Sin resultados</p>
                )}
              </div>
            </div>
            )}

            {tipoSlot === TIPO_SLOT.POSTERS && (
            <div className="flex flex-col gap-3 lg:pt-6">
              <Input
                icon={<Search className="size-4" />}
                placeholder="Buscar por título..."
                value={busquedaPoster}
                onChange={(e) => setBusquedaPoster(e.target.value)}
              />
              <div className="max-h-80 overflow-y-auto rounded-lg border border-border bg-surface">
                {postersFiltrados.map((talk) => {
                  const seleccionado = postersSeleccionados.some((p) => p.id_talk === talk.id_talk);
                  return (
                    <button
                      key={talk.id_talk}
                      type="button"
                      onClick={() => handleTogglePoster(talk)}
                      className={clsx(
                        'flex w-full items-start gap-2 border-t border-border px-3 py-2 text-left text-sm transition-colors hover:bg-background',
                        seleccionado && 'bg-accent/10',
                      )}
                    >
                      <span
                        className={clsx(
                          'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border',
                          seleccionado ? 'border-accent bg-accent text-white' : 'border-border',
                        )}
                      >
                        {seleccionado && <Check className="size-3" />}
                      </span>
                      <span className="flex flex-col gap-0.5">
                        <span className={clsx('font-medium', talk.schedules.length > 0 ? 'text-success-text' : 'text-text-primary')}>
                          {talk.titulo}
                        </span>
                        {talk.schedules.length > 0 && (
                          <span className="text-xs text-success-text/80">Ya tiene horario asignado</span>
                        )}
                      </span>
                    </button>
                  );
                })}
                {postersFiltrados.length === 0 && (
                  <p className="px-3 py-4 text-center text-sm text-text-muted">Sin resultados</p>
                )}
              </div>
              {postersSeleccionados.length > 0 && (
                <p className="text-xs text-text-muted">
                  {postersSeleccionados.length} póster{postersSeleccionados.length === 1 ? '' : 'es'} seleccionado
                  {postersSeleccionados.length === 1 ? '' : 's'}.
                </p>
              )}
            </div>
            )}
          </div>

          <Button
            type="submit"
            variant="primary"
            loading={submitting}
            disabled={!slotFormValido}
            className="mt-2 w-full"
          >
            {editando ? 'Guardar cambios' : 'Crear horario'}
          </Button>
        </form>
      </Modal>

      <Modal
        open={generadorOpen}
        onClose={() => setGeneradorOpen(false)}
        title="Generador de lote de horarios"
      >
        <form className="flex flex-col gap-4" onSubmit={handleSubmitGenerador}>
          {generadorError && <Alert variant="error">{generadorError}</Alert>}

          <Select
            name="id_salon"
            label="Salón"
            value={generadorForm.id_salon}
            onChange={handleChangeGenerador}
            required
          >
            <option value="">Selecciona un salón</option>
            {salonesActivos.map((s) => (
              <option key={s.id_salon} value={s.id_salon}>
                {s.nombre} (cap. {s.capacidad})
              </option>
            ))}
          </Select>

          <DatePicker
            label="Fecha"
            value={generadorForm.fecha}
            onChange={(nuevaFecha) => setGeneradorForm((prev) => ({ ...prev, fecha: nuevaFecha ?? '' }))}
          />

          <Input
            type="time"
            name="hora_inicio"
            label="Hora de inicio"
            value={generadorForm.hora_inicio}
            onChange={handleChangeGenerador}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              type="number"
              name="duracion_minutos"
              label="Duración por slot (minutos)"
              placeholder="60"
              value={generadorForm.duracion_minutos}
              onChange={handleChangeGenerador}
              error={duracionMinutosInvalida ? 'Debe ser mayor a 0' : undefined}
              required
            />
            <Input
              type="number"
              name="cantidad_slots"
              label="Cantidad de slots"
              placeholder="Máximo 50"
              max={50}
              value={generadorForm.cantidad_slots}
              onChange={handleChangeGenerador}
              error={cantidadSlotsInvalida ? 'Debe estar entre 1 y 50' : undefined}
              required
            />
          </div>

          {generadorFormValido && (
            <div className="rounded-lg border border-border bg-surface p-3 text-sm text-text-muted">
              Se crearán {cantidadSlotsNum} slots de {duracionMinutosNum} minutos, de{' '}
              {generadorForm.hora_inicio} a {horaFinCalculada} en {salonGeneradorSeleccionado?.nombre}, el{' '}
              {formatFechaSlot(generadorForm.fecha)}.
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            loading={generadorSubmitting}
            disabled={!generadorFormValido}
            className="mt-2 w-full"
          >
            Generar lote
          </Button>
        </form>
      </Modal>

      <Modal
        open={Boolean(confirmarEliminar)}
        onClose={() => setConfirmarEliminar(null)}
        title="Eliminar horario"
      >
        <div className="flex flex-col gap-4">
          {eliminarError && <Alert variant="error">{eliminarError}</Alert>}
          <p className="text-sm text-text-primary">
            ¿Eliminar el horario {confirmarEliminar && formatHora(confirmarEliminar.hora_inicio)}–
            {confirmarEliminar && formatHora(confirmarEliminar.hora_fin)} de "
            {confirmarEliminar?.salon?.nombre}"?
          </p>
          <Alert variant="warning">
            Esto NO elimina la ponencia, solo el horario asignado a este slot.
          </Alert>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setConfirmarEliminar(null)}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              loading={eliminando}
              onClick={handleConfirmarEliminar}
            >
              Eliminar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
