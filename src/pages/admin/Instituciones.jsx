import { useEffect, useState } from 'react';
import { apiFetch, API_URL } from '../../api/client';
import { formatFecha } from '../../utils/formato';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Alert } from '../../components/ui/Alert';
import { Card } from '../../components/ui/Card';
import { PageLoader } from '../../components/ui/PageLoader';

const FORM_INICIAL = { nombre: '', activo: true };

export function Instituciones() {
  const [instituciones, setInstituciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [archivoCsv, setArchivoCsv] = useState(null);
  const [importando, setImportando] = useState(false);
  const [importError, setImportError] = useState('');
  const [importResultado, setImportResultado] = useState(null);
  const [csvInputKey, setCsvInputKey] = useState(0);

  function cargarInstituciones() {
    return apiFetch('/instituciones').then((data) => setInstituciones(data ?? []));
  }

  useEffect(() => {
    cargarInstituciones()
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
    setForm({ nombre: item.nombre, activo: item.activo });
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
        if (form.activo !== editando.activo) cambios.activo = form.activo;

        const actualizado = await apiFetch(`/instituciones/${editando.id_institucion}`, {
          method: 'PATCH',
          body: JSON.stringify(cambios),
        });
        setInstituciones((prev) =>
          prev.map((i) =>
            i.id_institucion === editando.id_institucion ? { ...i, ...actualizado } : i,
          ),
        );
      } else {
        const nueva = await apiFetch('/instituciones', {
          method: 'POST',
          body: JSON.stringify({ nombre: form.nombre }),
        });
        setInstituciones((prev) => [...prev, nueva]);
      }
      setModalOpen(false);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleImportarCsv(e) {
    e.preventDefault();
    if (!archivoCsv) return;
    setImportError('');
    setImportResultado(null);
    setImportando(true);
    try {
      const formData = new FormData();
      formData.append('archivo', archivoCsv);
      const res = await fetch(`${API_URL}/instituciones/importar-csv`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.error?.message || 'Error al importar el CSV');
      }
      setImportResultado(body?.data);
      setArchivoCsv(null);
      setCsvInputKey((k) => k + 1);
      await cargarInstituciones();
    } catch (err) {
      setImportError(err.message);
    } finally {
      setImportando(false);
    }
  }

  if (loading) return <PageLoader />;

  return (
    <div className="flex flex-col gap-6 pt-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-sans text-2xl font-bold text-text-primary">Instituciones</h1>
          <p className="mt-1 text-sm text-text-muted">
            Catálogo de instituciones sugeridas en el registro de usuarios.
          </p>
        </div>
        <Button type="button" variant="primary" onClick={handleAbrirCrear}>
          Crear institución
        </Button>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <Table>
        <Table.Head>
          <tr>
            <Table.HeadCell>Nombre</Table.HeadCell>
            <Table.HeadCell>Estado</Table.HeadCell>
            <Table.HeadCell>Creada</Table.HeadCell>
            <Table.HeadCell></Table.HeadCell>
          </tr>
        </Table.Head>
        <tbody>
          {instituciones.map((i) => (
            <Table.Row key={i.id_institucion}>
              <Table.Cell>{i.nombre}</Table.Cell>
              <Table.Cell>
                <Badge variant={i.activo ? 'revisado' : 'default'}>
                  {i.activo ? 'Activo' : 'Inactivo'}
                </Badge>
              </Table.Cell>
              <Table.Cell className="text-text-muted">
                {i.fecha_creacion ? formatFecha(i.fecha_creacion) : '—'}
              </Table.Cell>
              <Table.Cell>
                <Button type="button" variant="ghost" size="sm" onClick={() => handleAbrirEditar(i)}>
                  Editar
                </Button>
              </Table.Cell>
            </Table.Row>
          ))}
        </tbody>
      </Table>

      <Card>
        <h2 className="font-sans text-lg font-semibold text-text-primary">Importación masiva</h2>
        <p className="mt-1 text-sm text-text-muted">
          Sube un archivo CSV con nombres de instituciones para agregarlas al catálogo.
        </p>

        <form className="mt-4 flex flex-col gap-3" onSubmit={handleImportarCsv}>
          {importError && <Alert variant="error">{importError}</Alert>}

          <input
            key={csvInputKey}
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setArchivoCsv(e.target.files?.[0] ?? null)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-muted file:mr-3 file:rounded-md file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-background hover:file:bg-accent-hover"
          />

          <Button
            type="submit"
            variant="primary"
            loading={importando}
            disabled={!archivoCsv}
            className="self-start"
          >
            Importar CSV
          </Button>
        </form>

        {importResultado && (
          <Alert variant="success" className="mt-4">
            <p>
              {importResultado.total_procesados} procesados, {importResultado.creados} creados,{' '}
              {importResultado.ya_existian} ya existían
            </p>
            {importResultado.nombres_creados?.length > 0 && (
              <ul className="mt-2 list-inside list-disc text-xs">
                {importResultado.nombres_creados.map((nombre) => (
                  <li key={nombre}>{nombre}</li>
                ))}
              </ul>
            )}
          </Alert>
        )}
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editando ? 'Editar institución' : 'Crear institución'}
      >
        <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
          {formError && <Alert variant="error">{formError}</Alert>}

          <Input name="nombre" label="Nombre" value={form.nombre} onChange={handleChange} required />

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
            Las instituciones no se eliminan, se desactivan.
          </p>

          <Button type="submit" variant="primary" loading={submitting} className="mt-2 w-full">
            {editando ? 'Guardar cambios' : 'Crear institución'}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
