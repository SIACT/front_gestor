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
      const nuevaTalk = await apiFetch(`/inscripciones/${idInscripcion}/talks`, {
        method: 'POST',
        body: JSON.stringify({
          titulo: form.titulo,
          descripcion: form.descripcion || undefined,
          link_summary: form.link_summary || undefined,
          palabras_clave: form.palabras_clave || undefined,
          duracion_minutos: form.duracion_minutos ? Number(form.duracion_minutos) : undefined,
        }),
      });
      navigate(`/ponencias/${nuevaTalk.id_talk}`);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <PageLoader />;

  const puedeProponer = user?.id_rol === 2 || user?.id_rol === 1;

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-12">
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
                  <p className="mt-2 text-xs text-text-muted">{formatFecha(talk.fecha_creacion)}</p>

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

          <Input name="titulo" label="Título" value={form.titulo} onChange={handleChange} required />
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
