import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
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
  const [busquedaPonencia, setBusquedaPonencia] = useState('');
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

  function handleAbrirCrear() {
    setEditando(null);
    setForm({ ...FORM_INICIAL, fecha: fecha ?? '' });
    setTalkSeleccionado(null);
    setBusquedaPonencia('');
    setAreaFiltro('');
    setTipoParticipacionFiltro('');
    setProgramadoFiltro('false');
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
    setBusquedaPonencia('');
    setAreaFiltro('');
    setTipoParticipacionFiltro('');
    setProgramadoFiltro('false');
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
      const idTalkSeleccionado = talkSeleccionado?.id_talk ?? null;

      if (editando) {
        const cambios = {};
        if (Number(form.id_salon) !== editando.id_salon) cambios.id_salon = Number(form.id_salon);
        if (idTalkSeleccionado !== (editando.id_talk ?? null)) cambios.id_talk = idTalkSeleccionado;
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
      } else if (err.code === 'INSCRIPCION_NO_HABILITADA_PARA_PROGRAMAR') {
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

  return (
    <div className="flex flex-col gap-6 pt-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-sans text-2xl font-bold text-text-primary">Horarios</h1>
          <p className="mt-1 text-sm text-text-muted">
            Grilla de horarios del congreso, agrupada por salón.
          </p>
        </div>
        <Button type="button" variant="primary" onClick={handleAbrirCrear}>
          Nuevo horario
        </Button>
      </div>

      <DatePicker label="Filtrar por fecha" value={fecha} onChange={setFecha} />

      {error && <Alert variant="error">{error}</Alert>}

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
                      ) : (
                        <p className="text-sm text-text-muted">Slot vacío</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="ghost" size="sm" onClick={() => handleAbrirEditar(slot)}>
                        Editar
                      </Button>
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

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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
            </div>

            <div className="flex flex-col gap-3 lg:pt-6">
              <Input
                icon={<Search className="size-4" />}
                placeholder="Buscar por título..."
                value={busquedaPonencia}
                onChange={(e) => setBusquedaPonencia(e.target.value)}
              />
              <div className="max-h-80 overflow-y-auto rounded-lg border border-border bg-surface">
                <button
                  type="button"
                  onClick={() => setTalkSeleccionado(null)}
                  className={clsx(
                    'flex w-full items-center px-3 py-2 text-left text-sm transition-colors hover:bg-background',
                    talkSeleccionado === null ? 'bg-accent/10 text-accent' : 'text-text-muted',
                  )}
                >
                  Sin asignar
                </button>
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
          </div>

          <Button type="submit" variant="primary" loading={submitting} className="mt-2 w-full">
            {editando ? 'Guardar cambios' : 'Crear horario'}
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
