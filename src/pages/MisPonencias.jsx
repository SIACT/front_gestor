import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatFecha } from '../utils/formato';
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
};

export function MisPonencias() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [idInscripcion, setIdInscripcion] = useState(null);
  const [sinInscripcion, setSinInscripcion] = useState(false);
  const [talks, setTalks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(FORM_INICIAL);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [areas, setAreas] = useState([]);
  const [areasError, setAreasError] = useState('');
  const [tipos, setTipos] = useState([]);
  const [tiposError, setTiposError] = useState('');

  useEffect(() => {
    apiFetch('/inscripciones')
      .then((data) => {
        const inscripcion = (data ?? [])[0];
        if (!inscripcion) {
          setSinInscripcion(true);
          return null;
        }
        setIdInscripcion(inscripcion.id_inscripcion);
        return apiFetch(`/inscripciones/${inscripcion.id_inscripcion}/talks`);
      })
      .then((data) => {
        if (data) setTalks(data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function handleAbrirCrear() {
    setForm(FORM_INICIAL);
    setFormError('');
    setAreasError('');
    setTiposError('');
    setModalOpen(true);
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

  async function handleSubmit(e) {
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
      navigate(`/ponencias/${nuevaTalk.id_talk}`);
    } catch (err) {
      setFormError(CATALOGO_ERROR_MESSAGES[err.code] ?? err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <PageLoader />;

  const puedeProponer = user?.id_rol === 2 || user?.id_rol === 1;

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-20">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-sans text-2xl font-bold text-text-primary">Mis ponencias</h1>
        {puedeProponer && idInscripcion && (
          <Button type="button" variant="primary" onClick={handleAbrirCrear}>
            Proponer nueva ponencia
          </Button>
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
          <Link to="/inscripciones/nueva">
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
              <Link to={`/ponencias/${talk.id_talk}`}>
                <Card className="transition-colors hover:border-accent">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-medium text-text-primary">{talk.titulo}</p>
                      {talk.es_principal === false && <Badge variant="default">Coponente</Badge>}
                    </div>
                    <Badge variant={ESTADO_TALK_VARIANT[talk.estado_talk] ?? 'default'}>
                      {talk.estado_talk}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-text-muted">
                    {talk.area?.nombre && <>{talk.area.nombre} · </>}
                    {talk.tipo_participacion?.nombre ?? 'Sin tipo asignado'} ·{' '}
                    {formatFecha(talk.fecha_creacion)}
                  </p>

                  {talk.estado_talk === 'rechazada' && talk.observaciones && (
                    <Alert variant="warning" className="mt-3">
                      {talk.observaciones}
                    </Alert>
                  )}
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Proponer nueva ponencia">
        <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
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

          <Button type="submit" variant="primary" loading={submitting} className="mt-2 w-full">
            Proponer ponencia
          </Button>
        </form>
      </Modal>
    </div>
  );
}
