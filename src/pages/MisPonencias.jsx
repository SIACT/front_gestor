import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import clsx from 'clsx';
import { Calendar, FileText, Layers, Tag } from 'lucide-react';
import { apiFetch } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../utils/roles';
import { useCongreso } from '../context/CongresoContext';
import { formatFechaSolo, formatHora } from '../utils/formato';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { Alert } from '../components/ui/Alert';
import { PageLoader } from '../components/ui/PageLoader';

const ESTADO_TALK_VARIANT = {
  pendiente: 'pendiente',
  aceptada: 'revisado',
  rechazada: 'rechazado',
};

// Frase del footer de cada Card — deliberadamente distinta al texto del Badge de arriba.
const ESTADO_TALK_DESCRIPCION = {
  pendiente: 'En revisión',
  aceptada: 'Aceptada',
  rechazada: 'Rechazada',
};

// Mismo criterio que ESTADO_INSCRIPCION_BORDER en MisInscripciones.jsx/DetalleInscripcion.jsx.
const ESTADO_TALK_BORDER = {
  pendiente: 'border-warning-text',
  aceptada: 'border-success-text',
  rechazada: 'border-error-text',
};

const FORM_INICIAL = {
  titulo: '',
  descripcion: '',
  link_summary: '',
  palabras_clave: '',
  duracion_minutos: '',
  id_area: '',
  id_tipo_participacion: '',
};

const CATALOGO_ERROR_MESSAGES = {
  AREA_NOT_FOUND: 'El área de estudio seleccionada no existe.',
  AREA_INACTIVE: 'El área de estudio seleccionada está inactiva.',
  TIPO_PARTICIPACION_NOT_FOUND: 'El tipo de participación seleccionado no existe.',
  TIPO_PARTICIPACION_INACTIVE: 'El tipo de participación seleccionado está inactivo.',
  ONLY_EXPOSITOR_CAN_SUBMIT_TALKS: 'Solo quienes se inscribieron como Expositor pueden proponer ponencias.',
  CONGRESO_NO_ACEPTA_PONENCIAS: 'Este congreso no está aceptando nuevas ponencias en este momento.',
};

export function MisPonencias() {
  const navigate = useNavigate();
  const { id_congreso } = useParams();
  const { user } = useAuth();
  const { congreso, misInscripcion, esExpositorEnEsteCongreso } = useCongreso();
  const idInscripcion = misInscripcion?.id_inscripcion ?? null;
  const sinInscripcion = !misInscripcion;

  const [talks, setTalks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [paso, setPaso] = useState('formulario');
  const [form, setForm] = useState(FORM_INICIAL);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [areas, setAreas] = useState([]);
  const [areasError, setAreasError] = useState('');
  const [tipos, setTipos] = useState([]);
  const [tiposError, setTiposError] = useState('');

  useEffect(() => {
    if (!idInscripcion) {
      setLoading(false);
      return;
    }
    setLoading(true);
    apiFetch(`/inscripciones/${idInscripcion}/talks`)
      .then((data) => setTalks(data ?? []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [idInscripcion]);

  function handleAbrirCrear() {
    setForm(FORM_INICIAL);
    setFormError('');
    setAreasError('');
    setTiposError('');
    setPaso('formulario');
    setModalOpen(true);
    apiFetch(`/congresos/${id_congreso}/areas-estudio?activo=true`)
      .then((data) => setAreas(data ?? []))
      .catch((err) => setAreasError(err.message));
    apiFetch(`/congresos/${id_congreso}/tipos-participacion?activo=true`)
      .then((data) => setTipos(data ?? []))
      .catch((err) => setTiposError(err.message));
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  // Paso 1: solo valida y avanza al resumen — el POST real ocurre en handleConfirmarEnvio,
  // recién al confirmar desde el paso 'confirmacion'.
  function handleValidarYRevisar(e) {
    e.preventDefault();
    setFormError('');
    if (!form.id_area) {
      setFormError('Selecciona un área de estudio.');
      return;
    }
    if (!form.id_tipo_participacion) {
      setFormError('Selecciona un tipo de participación.');
      return;
    }
    setPaso('confirmacion');
  }

  async function handleConfirmarEnvio() {
    setFormError('');
    setSubmitting(true);
    try {
      const nuevaTalk = await apiFetch(`/inscripciones/${idInscripcion}/talks`, {
        method: 'POST',
        body: JSON.stringify({
          titulo: form.titulo,
          id_area: Number(form.id_area),
          id_tipo_participacion: Number(form.id_tipo_participacion),
          descripcion: form.descripcion || undefined,
          link_summary: form.link_summary || undefined,
          palabras_clave: form.palabras_clave || undefined,
          duracion_minutos: form.duracion_minutos ? Number(form.duracion_minutos) : undefined,
        }),
      });
      setModalOpen(false);
      setPaso('formulario');
      navigate(`/congresos/${id_congreso}/ponencias/${nuevaTalk.id_talk}`);
    } catch (err) {
      // Se queda en el paso 'confirmacion' — el usuario decide si reintenta o vuelve a editar.
      setFormError(CATALOGO_ERROR_MESSAGES[err.code] ?? err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <PageLoader />;

  const puedeProponer = esExpositorEnEsteCongreso || user?.id_rol === ROLES.ADMIN;
  // Solo se proponen ponencias mientras el congreso está exactamente en
  // 'inscripciones_abiertas' — mismo criterio que valida el backend (CONGRESO_NO_ACEPTA_PONENCIAS).
  const aceptaPonencias = congreso?.estado === 'inscripciones_abiertas';

  const areaSeleccionada = areas.find((a) => String(a.id_area) === form.id_area);
  const tipoSeleccionado = tipos.find((t) => String(t.id_tipo_participacion) === form.id_tipo_participacion);

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-20">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-sans text-2xl font-bold text-text-primary">Mis Trabajos</h1>
        {puedeProponer && idInscripcion && (
          aceptaPonencias ? (
            <Button type="button" variant="primary" onClick={handleAbrirCrear}>
              Proponer nueva ponencia
            </Button>
          ) : (
            <p className="text-sm text-text-muted">
              La convocatoria de ponencias no está abierta en este momento.
            </p>
          )
        )}
      </div>

      {error && (
        <Alert variant="error" className="mt-6">
          {error}
        </Alert>
      )}

      {sinInscripcion && (
        <div className="mt-16 flex flex-col items-center gap-4 text-center">
          <p className="text-sm text-text-muted">Necesitas una inscripción activa para proponer ponencias.</p>
          <Link to={`/congresos/${id_congreso}/inscripciones/nueva`}>
            <Button type="button" variant="primary">
              Nueva inscripción
            </Button>
          </Link>
        </div>
      )}

      {!error && !sinInscripcion && talks.length === 0 && (
        <p className="mt-16 text-center text-sm text-text-muted">Todavía no has propuesto ninguna ponencia.</p>
      )}

      {!error && talks.length > 0 && (
        <ul className="mt-6 flex flex-col gap-4">
          {talks.map((talk) => (
            <li key={talk.id_talk}>
              <Link to={`/congresos/${id_congreso}/ponencias/${talk.id_talk}`}>
                <Card
                  className={clsx(
                    'border-l-4 transition-colors hover:border-accent',
                    ESTADO_TALK_BORDER[talk.estado_talk] ?? 'border-border',
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-text-muted">
                        <FileText className="size-3.5" />
                        Trabajo
                      </div>
                      {talk.es_principal === false && <Badge variant="default">Coautoría</Badge>}
                    </div>
                    <Badge variant={ESTADO_TALK_VARIANT[talk.estado_talk] ?? 'default'}>
                      {talk.estado_talk}
                    </Badge>
                  </div>

                  <p className="mt-2 font-sans text-xl font-bold text-text-primary sm:text-2xl">
                    {talk.titulo}
                  </p>

                  {talk.schedules?.length > 0 && (
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-text-muted">
                      <Calendar className="size-3.5" />
                      {talk.schedules.length === 1
                        ? `${formatFechaSolo(talk.schedules[0].fecha)}, ${formatHora(talk.schedules[0].hora_inicio)} - ${talk.schedules[0].salon.nombre}`
                        : `${talk.schedules.length} sesiones programadas`}
                    </div>
                  )}

                  {talk.estado_talk === 'rechazada' && talk.observaciones && (
                    <Alert variant="warning" className="mt-4">
                      {talk.observaciones}
                    </Alert>
                  )}

                  <div className="mt-4 grid grid-cols-2 gap-4 border-t border-border pt-4">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                        Área temática
                      </p>
                      <div className="mt-1 flex items-center gap-1.5 text-sm font-medium text-accent">
                        <Tag className="size-4" />
                        {talk.area?.nombre ?? '—'}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                        Formato
                      </p>
                      <div className="mt-1 flex items-center gap-1.5 text-sm font-medium text-text-primary">
                        <Layers className="size-4 text-text-muted" />
                        {talk.tipo_participacion?.nombre ?? 'Sin especificar'}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 border-t border-border pt-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Congreso</p>
                    <p className="mt-1 font-sans text-lg font-bold text-text-primary">{congreso?.nombre}</p>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                    <span className="text-sm text-text-muted">Estado de la propuesta</span>
                    <span className="text-sm font-medium text-text-primary">
                      {ESTADO_TALK_DESCRIPCION[talk.estado_talk] ?? talk.estado_talk}
                    </span>
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={paso === 'formulario' ? 'Proponer nueva ponencia' : 'Confirma tu ponencia'}
      >
        {paso === 'formulario' ? (
          <form className="flex flex-col gap-3" onSubmit={handleValidarYRevisar}>

            {formError && <Alert variant="error">{formError}</Alert>}
            {areasError && <Alert variant="error">{areasError}</Alert>}
            {tiposError && <Alert variant="error">{tiposError}</Alert>}

            <Input name="titulo" label="Título" value={form.titulo} onChange={handleChange} required />

            <Select name="id_area" label="Área de estudio" value={form.id_area} onChange={handleChange} required>
              <option value="">Selecciona un área</option>
              {areas.map((a) => (
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
              {tipos.map((t) => (
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

            <Button type="submit" variant="primary" className="mt-2 w-full">
              Revisar y continuar
            </Button>
          </form>
        ) : (
          <div className="flex flex-col gap-4">
            {formError && <Alert variant="error">{formError}</Alert>}

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Título</p>
              <p className="mt-1 text-lg font-semibold text-text-primary">{form.titulo}</p>
            </div>

            <dl className="flex flex-col gap-3 rounded-lg border border-border p-4 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-text-muted">Área</dt>
                <dd className="text-text-primary">{areaSeleccionada?.nombre ?? '—'}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-text-muted">Tipo de participación</dt>
                <dd className="text-text-primary">{tipoSeleccionado?.nombre ?? '—'}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-text-muted">Duración</dt>
                <dd className="text-text-primary">
                  {form.duracion_minutos ? `${form.duracion_minutos} min` : '—'}
                </dd>
              </div>
            </dl>

            {form.descripcion && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Descripción</p>
                <p className="mt-1 line-clamp-3 text-sm text-text-muted">{form.descripcion}</p>
              </div>
            )}

            <Alert variant="info">
              Al registrar esta ponencia, quedarás como el autor/a principal. Si luego agregas a otras
              personas como coponentes desde el detalle de la ponencia, el trabajo aparecerá
              automáticamente en su perfil bajo esa categoría — no necesitan volver a registrarlo ni
              crear una propuesta duplicada. Para poder agregar a alguien como coponente, esa persona
              debe tener una inscripción a este congreso con rol Expositor.
            </Alert>

            <div className="flex justify-between gap-2">
              <Button type="button" variant="ghost" onClick={() => setPaso('formulario')}>
                ← Volver a editar
              </Button>
              <Button type="button" variant="primary" loading={submitting} onClick={handleConfirmarEnvio}>
                Confirmar y enviar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
