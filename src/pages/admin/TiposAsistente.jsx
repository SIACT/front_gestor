import { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';
import { formatCOP } from '../../utils/formato';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Alert } from '../../components/ui/Alert';
import { PageLoader } from '../../components/ui/PageLoader';

const FORM_INICIAL = { tipo: '', costo_base: '', activo: true };

export function TiposAsistente() {
  const [tipos, setTipos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiFetch('/tipos-asistente')
      .then((data) => setTipos(data ?? []))
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
      tipo: item.tipo,
      costo_base: String(item.costo_base),
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
        if (form.tipo !== editando.tipo) cambios.tipo = form.tipo;
        if (Number(form.costo_base) !== Number(editando.costo_base)) {
          cambios.costo_base = Number(form.costo_base);
        }
        if (form.activo !== editando.activo) cambios.activo = form.activo;

        const actualizado = await apiFetch(`/tipos-asistente/${editando.id_tipo_asistente}`, {
          method: 'PATCH',
          body: JSON.stringify(cambios),
        });
        setTipos((prev) =>
          prev.map((t) =>
            t.id_tipo_asistente === editando.id_tipo_asistente ? { ...t, ...actualizado } : t,
          ),
        );
      } else {
        const nuevo = await apiFetch('/tipos-asistente', {
          method: 'POST',
          body: JSON.stringify({ tipo: form.tipo, costo_base: Number(form.costo_base) }),
        });
        setTipos((prev) => [...prev, nuevo]);
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
          <h1 className="font-sans text-2xl font-bold text-text-primary">Tipos de asistente</h1>
          <p className="mt-1 text-sm text-text-muted">
            Define los tipos de asistente disponibles y su costo base.
          </p>
        </div>
        <Button type="button" variant="primary" onClick={handleAbrirCrear}>
          Crear tipo
        </Button>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <Table>
        <Table.Head>
          <tr>
            <Table.HeadCell>Tipo</Table.HeadCell>
            <Table.HeadCell>Costo base</Table.HeadCell>
            <Table.HeadCell>Estado</Table.HeadCell>
            <Table.HeadCell></Table.HeadCell>
          </tr>
        </Table.Head>
        <tbody>
          {tipos.map((t) => (
            <Table.Row key={t.id_tipo_asistente}>
              <Table.Cell>{t.tipo}</Table.Cell>
              <Table.Cell className="text-text-muted">{formatCOP(t.costo_base)}</Table.Cell>
              <Table.Cell>
                <Badge variant={t.activo ? 'revisado' : 'default'}>
                  {t.activo ? 'Activo' : 'Inactivo'}
                </Badge>
              </Table.Cell>
              <Table.Cell>
                <Button type="button" variant="ghost" size="sm" onClick={() => handleAbrirEditar(t)}>
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
        title={editando ? 'Editar tipo de asistente' : 'Crear tipo de asistente'}
      >
        <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
          {formError && <Alert variant="error">{formError}</Alert>}

          <Input name="tipo" label="Tipo" value={form.tipo} onChange={handleChange} required />

          <Input
            name="costo_base"
            type="number"
            min="0"
            step="1"
            label="Costo base (COP)"
            value={form.costo_base}
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

          <p className="text-xs text-text-muted">
            Los tipos de asistente no se eliminan, se desactivan.
          </p>

          <Button type="submit" variant="primary" loading={submitting} className="mt-2 w-full">
            {editando ? 'Guardar cambios' : 'Crear tipo'}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
