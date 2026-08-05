import { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';
import { formatFecha } from '../../utils/formato';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { Alert } from '../../components/ui/Alert';
import { PageLoader } from '../../components/ui/PageLoader';

const FORM_INICIAL = {
  nombre: '',
  fecha_inicio: '',
  fecha_fin: '',
  porcentaje_descuento: '',
  descripcion: '',
  aplicacion: 'AUTOMATICO',
  activo: true,
};

function toDateInputValue(value) {
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 10);
}

export function Descuentos() {
  const [descuentos, setDescuentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiFetch('/descuentos')
      .then((data) => setDescuentos(data ?? []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function handleAbrirCrear() {
    setEditando(null);
    setForm(FORM_INICIAL);
    setFormError('');
    setModalOpen(true);
  }

  function handleAbrirEditar(item) {
    setEditando(item);
    setForm({
      nombre: item.nombre,
      fecha_inicio: toDateInputValue(item.fecha_inicio),
      fecha_fin: toDateInputValue(item.fecha_fin),
      porcentaje_descuento: String(item.porcentaje_descuento),
      descripcion: item.descripcion ?? '',
      aplicacion: item.aplicacion,
      activo: item.activo,
    });
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
      if (editando) {
        const cambios = {};
        if (form.nombre !== editando.nombre) cambios.nombre = form.nombre;
        if (form.fecha_inicio !== toDateInputValue(editando.fecha_inicio)) {
          cambios.fecha_inicio = form.fecha_inicio;
        }
        if (form.fecha_fin !== toDateInputValue(editando.fecha_fin)) {
          cambios.fecha_fin = form.fecha_fin;
        }
        if (Number(form.porcentaje_descuento) !== Number(editando.porcentaje_descuento)) {
          cambios.porcentaje_descuento = Number(form.porcentaje_descuento);
        }
        if (form.descripcion !== (editando.descripcion ?? '')) {
          cambios.descripcion = form.descripcion;
        }
        if (form.aplicacion !== editando.aplicacion) cambios.aplicacion = form.aplicacion;
        if (form.activo !== editando.activo) cambios.activo = form.activo;

        const actualizado = await apiFetch(`/descuentos/${editando.id_descuento}`, {
          method: 'PATCH',
          body: JSON.stringify(cambios),
        });
        setDescuentos((prev) =>
          prev.map((d) => (d.id_descuento === editando.id_descuento ? { ...d, ...actualizado } : d)),
        );
      } else {
        const nuevo = await apiFetch('/descuentos', {
          method: 'POST',
          body: JSON.stringify({
            nombre: form.nombre,
            fecha_inicio: form.fecha_inicio,
            fecha_fin: form.fecha_fin,
            porcentaje_descuento: Number(form.porcentaje_descuento),
            descripcion: form.descripcion || undefined,
            aplicacion: form.aplicacion,
          }),
        });
        setDescuentos((prev) => [...prev, nuevo]);
      }
      setModalOpen(false);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <PageLoader />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-sans text-2xl font-bold text-text-primary">Descuentos</h1>
          <p className="mt-1 text-sm text-text-muted">
            Políticas de descuento disponibles para las inscripciones.
          </p>
        </div>
        <Button type="button" variant="primary" onClick={handleAbrirCrear}>
          Crear descuento
        </Button>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <Table>
        <Table.Head>
          <tr>
            <Table.HeadCell>Nombre</Table.HeadCell>
            <Table.HeadCell>Vigencia</Table.HeadCell>
            <Table.HeadCell>%</Table.HeadCell>
            <Table.HeadCell>Aplicación</Table.HeadCell>
            <Table.HeadCell>Estado</Table.HeadCell>
            <Table.HeadCell></Table.HeadCell>
          </tr>
        </Table.Head>
        <tbody>
          {descuentos.map((d) => (
            <Table.Row key={d.id_descuento}>
              <Table.Cell>{d.nombre}</Table.Cell>
              <Table.Cell className="text-text-muted">
                {formatFecha(d.fecha_inicio)} – {formatFecha(d.fecha_fin)}
              </Table.Cell>
              <Table.Cell>{d.porcentaje_descuento}%</Table.Cell>
              <Table.Cell>
                <Badge variant={d.aplicacion === 'AUTOMATICO' ? 'ponente' : 'pendiente'}>
                  {d.aplicacion}
                </Badge>
              </Table.Cell>
              <Table.Cell>
                <Badge variant={d.activo ? 'revisado' : 'default'}>
                  {d.activo ? 'Activo' : 'Inactivo'}
                </Badge>
              </Table.Cell>
              <Table.Cell>
                <Button type="button" variant="ghost" size="sm" onClick={() => handleAbrirEditar(d)}>
                  Editar
                </Button>
              </Table.Cell>
            </Table.Row>
          ))}
        </tbody>
      </Table>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editando ? 'Editar descuento' : 'Crear descuento'}
      >
        <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
          {formError && <Alert variant="error">{formError}</Alert>}

          <Input name="nombre" label="Nombre" value={form.nombre} onChange={handleChange} required />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              name="fecha_inicio"
              type="date"
              label="Fecha inicio"
              value={form.fecha_inicio}
              onChange={handleChange}
              required
            />
            <Input
              name="fecha_fin"
              type="date"
              label="Fecha fin"
              value={form.fecha_fin}
              onChange={handleChange}
              required
            />
          </div>

          <Input
            name="porcentaje_descuento"
            type="number"
            min="0"
            max="100"
            label="Porcentaje de descuento"
            value={form.porcentaje_descuento}
            onChange={handleChange}
            required
          />

          <Input
            name="descripcion"
            label="Descripción (opcional)"
            value={form.descripcion}
            onChange={handleChange}
          />

          <Select name="aplicacion" label="Aplicación" value={form.aplicacion} onChange={handleChange}>
            <option value="AUTOMATICO">Automático</option>
            <option value="MANUAL">Manual</option>
          </Select>

          {editando && (
            <label className="flex items-center gap-2 text-sm text-text-primary">
              <input
                type="checkbox"
                checked={form.activo}
                onChange={(e) => setForm((prev) => ({ ...prev, activo: e.target.checked }))}
                className="size-4 rounded border-border bg-surface accent-accent"
              />
              Activo
            </label>
          )}

          <p className="text-xs text-text-muted">
            Los descuentos no se eliminan, se desactivan.
          </p>

          <Button type="submit" variant="primary" loading={submitting} className="mt-2 w-full">
            {editando ? 'Guardar cambios' : 'Crear descuento'}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
