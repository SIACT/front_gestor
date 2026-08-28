import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../utils/roles';
import { apiFetch } from '../api/client';
import { formatFecha } from '../utils/formato';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Select } from '../components/ui/Select';
import { Alert } from '../components/ui/Alert';
import { PageLoader } from '../components/ui/PageLoader';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Button } from '../components/ui/Button';
import { DatePicker } from '../components/ui/DatePicker';

const FORM_INICIAL = {
  nombre: '',
  fecha_inicio: null,
  fecha_fin: null,
  lugar: '',
  descripcion: '',
  area: '',
  pais: '',
  porcentaje_min_asistencia: '',
  imagen_url: '',
};

export function Home() {
  const { user } = useAuth();

  const [congresos, setCongresos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtro, setFiltro] = useState('todos');

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(FORM_INICIAL);
  const [formError, setFormError] = useState('');
  const [dateRangeError, setDateRangeError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiFetch('/congresos')
      .then((data) => setCongresos(data ?? []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const congresosFiltrados = useMemo(() => {
    if (filtro === 'activos') return congresos.filter((c) => c.activo);
    return congresos;
  }, [congresos, filtro]);

  function handleAbrirCrear() {
    setForm(FORM_INICIAL);
    setFormError('');
    setDateRangeError('');
    setModalOpen(true);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    setDateRangeError('');
    setSubmitting(true);
    try {
      const nuevo = await apiFetch('/congresos', {
        method: 'POST',
        body: JSON.stringify({
          nombre: form.nombre,
          fecha_inicio: form.fecha_inicio,
          fecha_fin: form.fecha_fin,
          lugar: form.lugar,
          descripcion: form.descripcion || undefined,
          area: form.area || undefined,
          pais: form.pais || undefined,
          porcentaje_min_asistencia: form.porcentaje_min_asistencia
            ? Number(form.porcentaje_min_asistencia)
            : undefined,
          imagen_url: form.imagen_url || undefined,
        }),
      });
      setCongresos((prev) => [...prev, nuevo]);
      setModalOpen(false);
    } catch (err) {
      if (err.code === 'INVALID_DATE_RANGE') {
        setDateRangeError(err.message);
      } else {
        setFormError(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <PageLoader />;

  return (
    <div className="w-full bg-background">
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-sans text-2xl font-bold text-text-primary">Congresos</h1>
            <p className="mt-1 text-sm text-text-muted">Elige un congreso para continuar.</p>
          </div>
          <div className="flex items-end gap-3">
            <Select
              label="Mostrar"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="w-44"
            >
              <option value="todos">Todos</option>
              <option value="activos">Solo activos</option>
            </Select>
            {user?.id_rol === ROLES.ADMIN && (
              <Button type="button" variant="primary" onClick={handleAbrirCrear}>
                <Plus className="size-4" />
                Crear congreso
              </Button>
            )}
          </div>
        </div>

        {error && (
          <Alert variant="error" className="mt-6">
            {error}
          </Alert>
        )}

        {!error && congresosFiltrados.length === 0 && (
          <div className="mt-16 flex flex-col items-center gap-2 text-center">
            <p className="text-sm text-text-muted">Aún no hay congresos disponibles.</p>
          </div>
        )}

        {!error && congresosFiltrados.length > 0 && (
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
            {congresosFiltrados.map((congreso) => (
              <Link key={congreso.id_congreso} to={`/congresos/${congreso.id_congreso}`}>
                <Card className="overflow-hidden p-0! transition-colors hover:border-accent">
                  {congreso.imagen_url ? (
                    <img
                      src={congreso.imagen_url}
                      alt={congreso.nombre}
                      className="h-40 w-full rounded-t-xl object-cover"
                    />
                  ) : (
                    <div className="flex h-40 w-full items-center justify-center rounded-t-xl bg-surface">
                      <Calendar className="size-10 text-text-muted" />
                    </div>
                  )}

                  <div className="flex flex-col gap-2 p-6">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="font-sans text-lg font-semibold text-text-primary">
                        {congreso.nombre}
                      </h2>
                      <Badge variant={congreso.activo ? 'revisado' : 'default'}>
                        {congreso.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </div>

                    {congreso.descripcion && (
                      <p className="line-clamp-2 text-sm text-text-muted">{congreso.descripcion}</p>
                    )}

                    <p className="text-xs uppercase tracking-wide text-text-muted">{congreso.estado}</p>

                    <p className="text-sm text-text-primary">
                      {formatFecha(congreso.fecha_inicio)} — {formatFecha(congreso.fecha_fin)}
                    </p>

                    {congreso.lugar && <p className="text-sm text-text-muted">{congreso.lugar}</p>}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Crear congreso">
        <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
          {formError && <Alert variant="error">{formError}</Alert>}

          <Input name="nombre" label="Nombre" value={form.nombre} onChange={handleChange} required />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DatePicker
              label="Fecha inicio"
              value={form.fecha_inicio}
              onChange={(value) => setForm((prev) => ({ ...prev, fecha_inicio: value }))}
            />
            <DatePicker
              label="Fecha fin"
              value={form.fecha_fin}
              onChange={(value) => setForm((prev) => ({ ...prev, fecha_fin: value }))}
            />
          </div>
          {dateRangeError && <Alert variant="error">{dateRangeError}</Alert>}

          <Input name="lugar" label="Lugar" value={form.lugar} onChange={handleChange} required />

          <Textarea
            name="descripcion"
            label="Descripción (opcional)"
            value={form.descripcion}
            onChange={handleChange}
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input name="area" label="Área (opcional)" value={form.area} onChange={handleChange} />
            <Input name="pais" label="País (opcional)" value={form.pais} onChange={handleChange} />
          </div>

          <Input
            name="porcentaje_min_asistencia"
            type="number"
            min="0"
            max="100"
            label="% mínimo de asistencia (opcional)"
            placeholder="60 (por defecto)"
            value={form.porcentaje_min_asistencia}
            onChange={handleChange}
          />

          <Input
            name="imagen_url"
            label="URL de imagen (opcional)"
            value={form.imagen_url}
            onChange={handleChange}
          />

          <Button
            type="submit"
            variant="primary"
            loading={submitting}
            disabled={!form.nombre || !form.fecha_inicio || !form.fecha_fin || !form.lugar}
            className="mt-2 w-full"
          >
            Crear congreso
          </Button>
        </form>
      </Modal>
    </div>
  );
}
