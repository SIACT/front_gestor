import { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';
import { Table } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Alert } from '../../components/ui/Alert';
import { PageLoader } from '../../components/ui/PageLoader';

const FORM_INICIAL = { nombre: '', descripcion: '' };

export function Categorias() {
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [eliminando, setEliminando] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    apiFetch('/categorias')
      .then((data) => setCategorias(data ?? []))
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
    setForm({ nombre: item.nombre, descripcion: item.descripcion ?? '' });
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
        if (form.descripcion !== (editando.descripcion ?? '')) cambios.descripcion = form.descripcion;

        const actualizado = await apiFetch(`/categorias/${editando.id_categoria}`, {
          method: 'PATCH',
          body: JSON.stringify(cambios),
        });
        setCategorias((prev) =>
          prev.map((c) => (c.id_categoria === editando.id_categoria ? { ...c, ...actualizado } : c)),
        );
      } else {
        const nueva = await apiFetch('/categorias', {
          method: 'POST',
          body: JSON.stringify({
            nombre: form.nombre,
            descripcion: form.descripcion || undefined,
          }),
        });
        setCategorias((prev) => [...prev, nueva]);
      }
      setModalOpen(false);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleAbrirEliminar(item) {
    setEliminando(item);
    setDeleteError('');
  }

  async function handleConfirmarEliminar() {
    setDeleteError('');
    setDeleting(true);
    try {
      await apiFetch(`/categorias/${eliminando.id_categoria}`, { method: 'DELETE' });
      setCategorias((prev) => prev.filter((c) => c.id_categoria !== eliminando.id_categoria));
      setEliminando(null);
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <PageLoader />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-sans text-2xl font-bold text-text-primary">Categorías</h1>
          <p className="mt-1 text-sm text-text-muted">
            Categorías disponibles para clasificar las inscripciones.
          </p>
        </div>
        <Button type="button" variant="primary" onClick={handleAbrirCrear}>
          Crear categoría
        </Button>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <Table>
        <Table.Head>
          <tr>
            <Table.HeadCell>Nombre</Table.HeadCell>
            <Table.HeadCell>Descripción</Table.HeadCell>
            <Table.HeadCell></Table.HeadCell>
          </tr>
        </Table.Head>
        <tbody>
          {categorias.map((c) => (
            <Table.Row key={c.id_categoria}>
              <Table.Cell>{c.nombre}</Table.Cell>
              <Table.Cell className="text-text-muted">{c.descripcion || '—'}</Table.Cell>
              <Table.Cell>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => handleAbrirEditar(c)}>
                    Editar
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-error-text hover:bg-error-bg"
                    onClick={() => handleAbrirEliminar(c)}
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
        title={editando ? 'Editar categoría' : 'Crear categoría'}
      >
        <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
          {formError && <Alert variant="error">{formError}</Alert>}

          <Input name="nombre" label="Nombre" value={form.nombre} onChange={handleChange} required />

          <Input
            name="descripcion"
            label="Descripción (opcional)"
            value={form.descripcion}
            onChange={handleChange}
          />

          <Button type="submit" variant="primary" loading={submitting} className="mt-2 w-full">
            {editando ? 'Guardar cambios' : 'Crear categoría'}
          </Button>
        </form>
      </Modal>

      <Modal
        open={Boolean(eliminando)}
        onClose={() => setEliminando(null)}
        title="Eliminar categoría"
      >
        <div className="flex flex-col gap-4">
          {deleteError && <Alert variant="error">{deleteError}</Alert>}
          <p className="text-sm text-text-primary">
            ¿Eliminar la categoría "{eliminando?.nombre}"? Esta acción no se puede deshacer.
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setEliminando(null)}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              loading={deleting}
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
