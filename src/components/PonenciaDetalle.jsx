import { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';
import { apiFetch } from '../api/client';
import { capitalizar, formatFecha } from '../utils/formato';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Textarea } from './ui/Textarea';
import { Select } from './ui/Select';
import { Modal } from './ui/Modal';
import { Alert } from './ui/Alert';

const ESTADO_TALK_VARIANT = {
  pendiente: 'pendiente',
  aceptada: 'revisado',
  rechazada: 'rechazado',
};

const FORM_INICIAL = {
  titulo: '',
  id_area: '',
  id_tipo_participacion: '',
  descripcion: '',
  link_summary: '',
  palabras_clave: '',
  duracion_minutos: '',
};

const COPONENTE_ERROR_MESSAGES = {
  USUARIO_NOT_FOUND: 'No existe ningún usuario registrado con ese correo.',
  USUARIO_NO_ES_PONENTE: 'El usuario debe tener rol Ponente para ser agregado como coautor.',
  USUARIO_SIN_INSCRIPCION_ACTIVA: 'El usuario no tiene ninguna inscripción activa.',
  YA_ES_PONENTE_PRINCIPAL: 'Este usuario ya es el ponente principal de la charla.',
  YA_ES_COPONENTE: 'Este usuario ya es coautor de la charla.',
};

const CATALOGO_ERROR_MESSAGES = {
  AREA_NOT_FOUND: 'El área de estudio seleccionada no existe.',
  AREA_INACTIVE: 'El área de estudio seleccionada está inactiva.',
  TIPO_PARTICIPACION_NOT_FOUND: 'El tipo de participación seleccionado no existe.',
  TIPO_PARTICIPACION_INACTIVE: 'El tipo de participación seleccionado está inactivo.',
};

function talkToForm(talk) {
  return {
    titulo: talk.titulo ?? '',
    id_area: talk.area?.id_area != null ? String(talk.area.id_area) : '',
    id_tipo_participacion:
      talk.tipo_participacion?.id_tipo_participacion != null
        ? String(talk.tipo_participacion.id_tipo_participacion)
        : '',
    descripcion: talk.descripcion ?? '',
    link_summary: talk.link_summary ?? '',
    palabras_clave: talk.palabras_clave ?? '',
    duracion_minutos: talk.duracion_minutos != null ? String(talk.duracion_minutos) : '',
  };
}

export function PonenciaDetalle({ talk, isAdmin, canEdit, canManageCoponentes, onRefresh, adminReviewSlot }) {
  const [ponentes, setPonentes] = useState([]);
  const [ponentesLoading, setPonentesLoading] = useState(true);
  const [ponentesError, setPonentesError] = useState('');

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [form, setForm] = useState(FORM_INICIAL);
  const [editError, setEditError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [cambiosPendientes, setCambiosPendientes] = useState(null);
  const [areas, setAreas] = useState([]);
  const [areasError, setAreasError] = useState('');
  const [tipos, setTipos] = useState([]);
  const [tiposError, setTiposError] = useState('');

  const [correoCoponente, setCorreoCoponente] = useState('');
  const [agregandoCoponente, setAgregandoCoponente] = useState(false);
  const [coponenteError, setCoponenteError] = useState('');
  const [coponenteAQuitar, setCoponenteAQuitar] = useState(null);
  const [quitandoCoponente, setQuitandoCoponente] = useState(false);
  const [quitarError, setQuitarError] = useState('');

  function cargarPonentes() {
    setPonentesLoading(true);
    setPonentesError('');
    return apiFetch(`/talks/${talk.id_talk}/ponentes`)
      .then((data) => setPonentes(data ?? []))
      .catch((err) => setPonentesError(err.message))
      .finally(() => setPonentesLoading(false));
  }

  useEffect(() => {
    cargarPonentes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [talk.id_talk]);

  function handleAbrirEditar() {
    setForm(talkToForm(talk));
    setEditError('');
    setAreasError('');
    setTiposError('');
    setEditModalOpen(true);
    apiFetch('/areas-estudio?activo=true')
      .then((data) => setAreas(data ?? []))
      .catch((err) => setAreasError(err.message));
    apiFetch('/tipos-participacion?activo=true')
      .then((data) => setTipos(data ?? []))
      .catch((err) => setTiposError(err.message));
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function construirCambios() {
    const original = talkToForm(talk);
    const cambios = {};
    if (form.titulo !== original.titulo) cambios.titulo = form.titulo;
    if (form.id_area !== original.id_area) cambios.id_area = Number(form.id_area);
    if (form.id_tipo_participacion !== original.id_tipo_participacion) {
      cambios.id_tipo_participacion = Number(form.id_tipo_participacion);
    }
    if (form.descripcion !== original.descripcion) cambios.descripcion = form.descripcion || null;
    if (form.link_summary !== original.link_summary) cambios.link_summary = form.link_summary || null;
    if (form.palabras_clave !== original.palabras_clave) cambios.palabras_clave = form.palabras_clave || null;
    if (form.duracion_minutos !== original.duracion_minutos) {
      cambios.duracion_minutos = form.duracion_minutos ? Number(form.duracion_minutos) : null;
    }
    return cambios;
  }

  async function enviarCambios(cambios) {
    setGuardando(true);
    setEditError('');
    try {
      await apiFetch(`/talks/${talk.id_talk}`, {
        method: 'PATCH',
        body: JSON.stringify(cambios),
      });
      setEditModalOpen(false);
      setCambiosPendientes(null);
      onRefresh?.();
    } catch (err) {
      if (err.code === 'FORBIDDEN') {
        setEditError('No tienes permiso para editar esta ponencia');
      } else {
        setEditError(CATALOGO_ERROR_MESSAGES[err.code] ?? err.message);
      }
    } finally {
      setGuardando(false);
    }
  }

  function handleSubmitEditar(e) {
    e.preventDefault();
    if (!form.id_tipo_participacion) {
      setEditError('Debes seleccionar un tipo de participación antes de guardar.');
      return;
    }
    const cambios = construirCambios();
    if (Object.keys(cambios).length === 0) {
      setEditModalOpen(false);
      return;
    }
    if (talk.estado_talk === 'aceptada') {
      setCambiosPendientes(cambios);
      return;
    }
    enviarCambios(cambios);
  }

  async function handleAgregarCoponente(e) {
    e.preventDefault();
    setCoponenteError('');
    setAgregandoCoponente(true);
    try {
      const data = await apiFetch(`/talks/${talk.id_talk}/ponentes`, {
        method: 'POST',
        body: JSON.stringify({ correo_coponente: correoCoponente }),
      });
      setPonentes(data ?? []);
      setCorreoCoponente('');
    } catch (err) {
      setCoponenteError(COPONENTE_ERROR_MESSAGES[err.code] ?? err.message);
    } finally {
      setAgregandoCoponente(false);
    }
  }

  async function handleQuitarCoponente() {
    if (!coponenteAQuitar) return;
    setQuitandoCoponente(true);
    setQuitarError('');
    try {
      const data = await apiFetch(`/talks/${talk.id_talk}/ponentes/${coponenteAQuitar.id_inscripcion}`, {
        method: 'DELETE',
      });
      setPonentes(data ?? []);
      setCoponenteAQuitar(null);
    } catch (err) {
      setQuitarError(err.message);
    } finally {
      setQuitandoCoponente(false);
    }
  }

  const opcionesArea =
    talk.area && !areas.some((a) => a.id_area === talk.area.id_area) ? [...areas, talk.area] : areas;

  const opcionesTipo =
    talk.tipo_participacion &&
    !tipos.some((t) => t.id_tipo_participacion === talk.tipo_participacion.id_tipo_participacion)
      ? [...tipos, talk.tipo_participacion]
      : tipos;

  return (
    <div className="flex flex-col gap-6">
      <div className="sticky top-0 z-20 -mx-3 border-b border-border bg-background px-3 py-6 lg:-mx-5 lg:px-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-sans text-2xl font-bold text-text-primary">{talk.titulo}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant={ESTADO_TALK_VARIANT[talk.estado_talk] ?? 'default'}>{talk.estado_talk}</Badge>
              {talk.area?.nombre && <Badge variant="default">{talk.area.nombre}</Badge>}
              <Badge variant="default">{talk.tipo_participacion?.nombre ?? 'Sin tipo asignado'}</Badge>
              <span className="text-xs text-text-muted">Propuesta el {formatFecha(talk.fecha_creacion)}</span>
            </div>
          </div>
          {canEdit && (
            <Button type="button" variant="secondary" onClick={handleAbrirEditar}>
              Editar
            </Button>
          )}
        </div>
      </div>

      {talk.observaciones && <Alert variant="warning">{talk.observaciones}</Alert>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface p-6 lg:col-span-2">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium uppercase tracking-wide text-text-muted">Descripción</dt>
              <dd className="mt-1 whitespace-pre-wrap text-sm text-text-primary">
                {talk.descripcion || '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-text-muted">Enlace / resumen</dt>
              <dd className="mt-1 text-sm text-text-primary">
                {talk.link_summary ? (
                  <a
                    href={talk.link_summary}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline"
                  >
                    {talk.link_summary}
                  </a>
                ) : (
                  '—'
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-text-muted">Palabras clave</dt>
              <dd className="mt-1 text-sm text-text-primary">{talk.palabras_clave || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-text-muted">Duración</dt>
              <dd className="mt-1 text-sm text-text-primary">
                {talk.duracion_minutos ? `${talk.duracion_minutos} minutos` : '—'}
              </dd>
            </div>
            {talk.fecha_aceptacion && (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-text-muted">Fecha de aceptación</dt>
                <dd className="mt-1 text-sm text-text-primary">{formatFecha(talk.fecha_aceptacion)}</dd>
              </div>
            )}
            {talk.revisor && (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-text-muted">Revisado por</dt>
                <dd className="mt-1 text-sm text-text-primary">
                  {capitalizar(talk.revisor.nombre)} {capitalizar(talk.revisor.apellido)}
                </dd>
              </div>
            )}
          </dl>
        </div>

        <div className="rounded-xl border border-border bg-surface p-6 lg:col-span-1">
          <h2 className="font-sans text-lg font-semibold text-text-primary">Autores</h2>

          {ponentesError && (
            <Alert variant="error" className="mt-3">
              {ponentesError}
            </Alert>
          )}

          {!ponentesLoading && !ponentesError && (
            <ul className="mt-4 flex flex-col gap-2">
              {ponentes.map((ponente) => (
                <li
                  key={ponente.id_inscripcion ?? ponente.correo}
                  className="flex items-center justify-between gap-4 rounded-lg border border-border px-3 py-2"
                >
                  <div>
                    <p className="text-sm text-text-primary">
                      {capitalizar(ponente.nombre)} {capitalizar(ponente.apellido)}
                      {ponente.es_principal && (
                        <Badge variant="admin" className="ml-2">
                          Principal
                        </Badge>
                      )}
                    </p>
                    <p className="text-xs text-text-muted">{ponente.correo}</p>
                  </div>
                  {canManageCoponentes && !ponente.es_principal && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => setCoponenteAQuitar(ponente)}
                    >
                      Quitar
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}

          {canManageCoponentes && (
            <form className="mt-4 flex items-end gap-2" onSubmit={handleAgregarCoponente}>
              <Input
                label="Correo del CoAutor"
                type="email"
                value={correoCoponente}
                onChange={(e) => setCorreoCoponente(e.target.value)}
                required
                className="flex-1"
              />
              <Button type="submit" variant="secondary" loading={agregandoCoponente}>
                Agregar Coautor
              </Button>
            </form>
          )}
          {coponenteError && (
            <Alert variant="error" className="mt-2">
              {coponenteError}
            </Alert>
          )}
        </div>
      </div>

      {/* TODO: el backend no expone datos de lugar/sala todavía.
          Esta sección usa datos de ejemplo hasta que exista el endpoint/campo real.
          Cuando exista, reemplazar por los datos reales de la respuesta de GET /talks/:id. */}
      <div className="rounded-xl border border-border bg-surface p-6">
        <h2 className="flex items-center gap-2 font-sans text-lg font-semibold text-text-primary">
          <MapPin className="size-5 text-accent" />
          Lugar
        </h2>

        <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-text-muted">Sala / Auditorio</dt>
            <dd className="mt-1 text-sm text-text-primary">Por definir</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-text-muted">Fecha y hora</dt>
            <dd className="mt-1 text-sm text-text-primary">Por definir</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-text-muted">Capacidad</dt>
            <dd className="mt-1 text-sm text-text-primary">Por definir</dd>
          </div>
        </dl>

        <p className="mt-4 text-xs text-text-muted">
          Esta información es preliminar y puede cambiar antes del evento.
        </p>
      </div>

      {isAdmin && adminReviewSlot}

      <Modal open={editModalOpen} onClose={() => setEditModalOpen(false)} title="Editar ponencia">
        <form className="flex flex-col gap-3" onSubmit={handleSubmitEditar}>
          {editError && <Alert variant="error">{editError}</Alert>}
          {areasError && <Alert variant="error">{areasError}</Alert>}
          {tiposError && <Alert variant="error">{tiposError}</Alert>}

          <Input name="titulo" label="Título" value={form.titulo} onChange={handleChange} required />

          <Select name="id_area" label="Área de estudio" value={form.id_area} onChange={handleChange} required>
            {opcionesArea.map((a) => (
              <option key={a.id_area} value={a.id_area}>
                {a.nombre}
              </option>
            ))}
          </Select>

          <Select
            name="id_tipo_participacion"
            label="Tipo de participación *"
            value={form.id_tipo_participacion}
            onChange={handleChange}
            required
          >
            <option value="" disabled>
              Selecciona un tipo
            </option>
            {opcionesTipo.map((t) => (
              <option key={t.id_tipo_participacion} value={t.id_tipo_participacion}>
                {t.nombre}
              </option>
            ))}
          </Select>

          <Textarea
            name="descripcion"
            label="Descripción"
            value={form.descripcion}
            onChange={handleChange}
          />
          <Input
            name="link_summary"
            label="Enlace / resumen"
            value={form.link_summary}
            onChange={handleChange}
          />
          <Input
            name="palabras_clave"
            label="Palabras clave"
            value={form.palabras_clave}
            onChange={handleChange}
          />
          <Input
            name="duracion_minutos"
            type="number"
            min="0"
            label="Duración (minutos)"
            value={form.duracion_minutos}
            onChange={handleChange}
          />

          <Button type="submit" variant="primary" loading={guardando} className="mt-2 w-full">
            Guardar cambios
          </Button>
        </form>
      </Modal>

      <Modal
        open={Boolean(cambiosPendientes)}
        onClose={() => setCambiosPendientes(null)}
        title="Confirmar edición"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-text-primary">
            Editar esta ponencia la enviará de nuevo a revisión. ¿Continuar?
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setCambiosPendientes(null)}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="primary"
              loading={guardando}
              onClick={() => enviarCambios(cambiosPendientes)}
            >
              Continuar
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(coponenteAQuitar)}
        onClose={() => setCoponenteAQuitar(null)}
        title="Quitar coponente"
      >
        <div className="flex flex-col gap-4">
          {quitarError && <Alert variant="error">{quitarError}</Alert>}
          <p className="text-sm text-text-primary">
            ¿Quitar a {capitalizar(coponenteAQuitar?.nombre)} {capitalizar(coponenteAQuitar?.apellido)} como
            coponente de esta ponencia?
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setCoponenteAQuitar(null)}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" loading={quitandoCoponente} onClick={handleQuitarCoponente}>
              Quitar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
