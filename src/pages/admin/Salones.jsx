import { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';
import { useCongreso } from '../../context/CongresoContext';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Alert } from '../../components/ui/Alert';
import { PageLoader } from '../../components/ui/PageLoader';

const FORM_INICIAL = { nombre: '', capacidad: '', activo: true };

export function Salones() {
  const { congreso } = useCongreso();
  const idCongreso = congreso?.id_congreso;

  const [salones, setSalones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [confirmarEliminar, setConfirmarEliminar] = useState(null);
  const [eliminarError, setEliminarError] = useState('');
  const [eliminarEnUso, setEliminarEnUso] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [desactivando, setDesactivando] = useState(false);

  useEffect(() => {
    apiFetch(`/congresos/${idCongreso}/salones`)
      .then((data) => setSalones(data ?? []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [idCongreso]);

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
      capacidad: String(item.capacidad),
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
        if (Number(form.capacidad) !== Number(editando.capacidad)) {
          cambios.capacidad = Number(form.capacidad);
        }
        if (form.activo !== editando.activo) cambios.activo = form.activo;

        const actualizado = await apiFetch(`/congresos/${idCongreso}/salones/${editando.id_salon}`, {
          method: 'PATCH',
          body: JSON.stringify(cambios),
        });
        setSalones((prev) =>
          prev.map((s) => (s.id_salon === editando.id_salon ? { ...s, ...actualizado } : s)),
        );
      } else {
        const nuevo = await apiFetch(`/congresos/${idCongreso}/salones`, {
          method: 'POST',
          body: JSON.stringify({ nombre: form.nombre, capacidad: Number(form.capacidad) }),
        });
        setSalones((prev) => [...prev, nuevo]);
      }
      setModalOpen(false);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleAbrirEliminar(item) {
    setConfirmarEliminar(item);
    setEliminarError('');
    setEliminarEnUso(false);
  }

  async function handleConfirmarEliminar() {
    setEliminarError('');
    setEliminando(true);
    try {
      await apiFetch(`/congresos/${idCongreso}/salones/${confirmarEliminar.id_salon}`, {
        method: 'DELETE',
      });
      setSalones((prev) => prev.filter((s) => s.id_salon !== confirmarEliminar.id_salon));
      setConfirmarEliminar(null);
    } catch (err) {
      setEliminarError(err.message);
      setEliminarEnUso(err.code === 'SALON_EN_USO');
    } finally {
      setEliminando(false);
    }
  }

  async function handleDesactivarEnSuLugar() {
    setEliminarError('');
    setDesactivando(true);
    try {
      const actualizado = await apiFetch(`/congresos/${idCongreso}/salones/${confirmarEliminar.id_salon}`, {
        method: 'PATCH',
        body: JSON.stringify({ activo: false }),
      });
      setSalones((prev) =>
        prev.map((s) => (s.id_salon === confirmarEliminar.id_salon ? { ...s, ...actualizado } : s)),
      );
      setConfirmarEliminar(null);
    } catch (err) {
      setEliminarError(err.message);
    } finally {
      setDesactivando(false);
    }
  }

  if (loading) return <PageLoader />;

  return (
    <div className="flex flex-col gap-6 pt-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-sans text-2xl font-bold text-text-primary">Salones</h1>
          <p className="mt-1 text-sm text-text-muted">
            Catálogo de salones físicos usados para armar la grilla de horarios.
          </p>
        </div>
        <Button type="button" variant="primary" onClick={handleAbrirCrear}>
          Crear salón
        </Button>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <Table>
        <Table.Head>
          <tr>
            <Table.HeadCell>Nombre</Table.HeadCell>
            <Table.HeadCell>Capacidad</Table.HeadCell>
            <Table.HeadCell>Estado</Table.HeadCell>
            <Table.HeadCell></Table.HeadCell>
          </tr>
        </Table.Head>
        <tbody>
          {salones.map((s) => (
            <Table.Row key={s.id_salon}>
              <Table.Cell>{s.nombre}</Table.Cell>
              <Table.Cell className="text-text-muted">{s.capacidad}</Table.Cell>
              <Table.Cell>
                <Badge variant={s.activo ? 'revisado' : 'default'}>
                  {s.activo ? 'Activo' : 'Inactivo'}
                </Badge>
              </Table.Cell>
              <Table.Cell>
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => handleAbrirEditar(s)}>
                    Editar
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => handleAbrirEliminar(s)}
                  >
                    Eliminar
                  </Button>
                </div>
              </Table.Cell>
            </Table.Row>
          ))}
        </tbody>
      </Table>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editando ? 'Editar salón' : 'Crear salón'}
      >
        <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
          {formError && <Alert variant="error">{formError}</Alert>}

          <Input name="nombre" label="Nombre" value={form.nombre} onChange={handleChange} required />

          <Input
            name="capacidad"
            type="number"
            min="1"
            label="Capacidad"
            value={form.capacidad}
            onChange={handleChange}
            required
          />

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

          <Button type="submit" variant="primary" loading={submitting} className="mt-2 w-full">
            {editando ? 'Guardar cambios' : 'Crear salón'}
          </Button>
        </form>
      </Modal>

      <Modal
        open={Boolean(confirmarEliminar)}
        onClose={() => setConfirmarEliminar(null)}
        title="Eliminar salón"
      >
        <div className="flex flex-col gap-4">
          {eliminarError && <Alert variant="error">{eliminarError}</Alert>}
          <p className="text-sm text-text-primary">
            ¿Eliminar el salón "{confirmarEliminar?.nombre}"? Esta acción no se puede deshacer.
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setConfirmarEliminar(null)}>
              Cancelar
            </Button>
            {eliminarEnUso && (
              <Button
                type="button"
                variant="secondary"
                loading={desactivando}
                onClick={handleDesactivarEnSuLugar}
              >
                Desactivar en su lugar
              </Button>
            )}
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
