import { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Alert } from '../../components/ui/Alert';
import { PageLoader } from '../../components/ui/PageLoader';

const FORM_INICIAL = { nombre: '', descripcion: '', activo: true };

export function AreasEstudio() {
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiFetch('/areas-estudio')
      .then((data) => setAreas(data ?? []))
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
      descripcion: item.descripcion ?? '',
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
        if (form.descripcion !== (editando.descripcion ?? '')) {
          cambios.descripcion = form.descripcion || null;
        }
        if (form.activo !== editando.activo) cambios.activo = form.activo;

        const actualizado = await apiFetch(`/areas-estudio/${editando.id_area}`, {
          method: 'PATCH',
          body: JSON.stringify(cambios),
        });
        setAreas((prev) =>
          prev.map((a) => (a.id_area === editando.id_area ? { ...a, ...actualizado } : a)),
        );
      } else {
        const nueva = await apiFetch('/areas-estudio', {
          method: 'POST',
          body: JSON.stringify({ nombre: form.nombre, descripcion: form.descripcion || undefined }),
        });
        setAreas((prev) => [...prev, nueva]);
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
    <div className="flex flex-col gap-6 pt-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-sans text-2xl font-bold text-text-primary">Áreas de estudio</h1>
          <p className="mt-1 text-sm text-text-muted">
            Catálogo de áreas temáticas disponibles para proponer ponencias.
          </p>
        </div>
        <Button type="button" variant="primary" onClick={handleAbrirCrear}>
          Crear área
        </Button>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <Table>
        <Table.Head>
          <tr>
            <Table.HeadCell>Nombre</Table.HeadCell>
            <Table.HeadCell>Descripción</Table.HeadCell>
            <Table.HeadCell>Estado</Table.HeadCell>
            <Table.HeadCell></Table.HeadCell>
          </tr>
        </Table.Head>
        <tbody>
          {areas.map((a) => (
            <Table.Row key={a.id_area}>
              <Table.Cell>{a.nombre}</Table.Cell>
              <Table.Cell className="text-text-muted">{a.descripcion || '—'}</Table.Cell>
              <Table.Cell>
                <Badge variant={a.activo ? 'revisado' : 'default'}>
                  {a.activo ? 'Activo' : 'Inactivo'}
                </Badge>
              </Table.Cell>
              <Table.Cell>
                <Button type="button" variant="ghost" size="sm" onClick={() => handleAbrirEditar(a)}>
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
        title={editando ? 'Editar área de estudio' : 'Crear área de estudio'}
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
            Las áreas de estudio no se eliminan, se desactivan.
          </p>

          <Button type="submit" variant="primary" loading={submitting} className="mt-2 w-full">
            {editando ? 'Guardar cambios' : 'Crear área'}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
