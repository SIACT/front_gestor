import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../api/client';
import { formatCOP } from '../../utils/formato';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { Alert } from '../../components/ui/Alert';
import { PageLoader } from '../../components/ui/PageLoader';

const FORM_INICIAL = { tipo: '', costo_base: '', activo: true, id_categoria: '' };

export function TiposAsistente() {
  const [tipos, setTipos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('');

  useEffect(() => {
    Promise.all([apiFetch('/tipos-asistente'), apiFetch('/categorias')])
      .then(([tiposData, categoriasData]) => {
        setTipos(tiposData ?? []);
        setCategorias(categoriasData ?? []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const categoriasDisponibles = useMemo(() => {
    const mapa = new Map();
    for (const t of tipos) {
      const cat = t.categoria;
      if (cat && !mapa.has(cat.id_categoria)) {
        mapa.set(cat.id_categoria, cat.nombre);
      }
    }
    return Array.from(mapa.entries()).map(([id_categoria, nombre]) => ({ id_categoria, nombre }));
  }, [tipos]);

  const tiposFiltrados = useMemo(() => {
    return tipos.filter((t) => {
      if (categoriaFiltro && String(t.categoria?.id_categoria) !== categoriaFiltro) return false;
      if (estadoFiltro === 'activo' && !t.activo) return false;
      if (estadoFiltro === 'inactivo' && t.activo) return false;
      return true;
    });
  }, [tipos, categoriaFiltro, estadoFiltro]);

  const hayFiltrosActivos = Boolean(categoriaFiltro || estadoFiltro);

  function handleLimpiarFiltros() {
    setCategoriaFiltro('');
    setEstadoFiltro('');
  }

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
      id_categoria: String(item.categoria?.id_categoria ?? ''),
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
        if (Number(form.id_categoria) !== Number(editando.categoria?.id_categoria)) {
          cambios.id_categoria = Number(form.id_categoria);
        }

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
          body: JSON.stringify({
            tipo: form.tipo,
            costo_base: Number(form.costo_base),
            id_categoria: Number(form.id_categoria),
          }),
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
    <div className="flex flex-col gap-6 pt-6">
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

      <div className="flex flex-wrap items-end gap-3">
        <Select
          label="Categoría"
          value={categoriaFiltro}
          onChange={(e) => setCategoriaFiltro(e.target.value)}
          className="w-48"
        >
          <option value="">Todas las categorías</option>
          {categoriasDisponibles.map((c) => (
            <option key={c.id_categoria} value={c.id_categoria}>
              {c.nombre}
            </option>
          ))}
        </Select>
        <Select
          label="Estado"
          value={estadoFiltro}
          onChange={(e) => setEstadoFiltro(e.target.value)}
          className="w-40"
        >
          <option value="">Todos</option>
          <option value="activo">Activos</option>
          <option value="inactivo">Inactivos</option>
        </Select>
        {hayFiltrosActivos && (
          <Button type="button" variant="ghost" onClick={handleLimpiarFiltros}>
            Limpiar filtros
          </Button>
        )}
      </div>

      <p className="text-sm text-text-muted">
        Mostrando {tiposFiltrados.length} de {tipos.length} tipos de asistente
      </p>

      {tiposFiltrados.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface px-6 py-12 text-center">
          <p className="text-sm text-text-muted">
            Ningún tipo de asistente coincide con los filtros aplicados.
          </p>
          {hayFiltrosActivos && (
            <Button type="button" variant="ghost" onClick={handleLimpiarFiltros}>
              Limpiar filtros
            </Button>
          )}
        </div>
      ) : (
        <Table>
          <Table.Head>
            <tr>
              <Table.HeadCell>Tipo</Table.HeadCell>
              <Table.HeadCell>Categoría</Table.HeadCell>
              <Table.HeadCell>Costo base</Table.HeadCell>
              <Table.HeadCell>Estado</Table.HeadCell>
              <Table.HeadCell></Table.HeadCell>
            </tr>
          </Table.Head>
          <tbody>
            {tiposFiltrados.map((t) => (
              <Table.Row key={t.id_tipo_asistente}>
                <Table.Cell>{t.tipo}</Table.Cell>
                <Table.Cell className="text-text-muted">{t.categoria?.nombre}</Table.Cell>
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
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editando ? 'Editar tipo de asistente' : 'Crear tipo de asistente'}
      >
        <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
          {formError && <Alert variant="error">{formError}</Alert>}

          <Input name="tipo" label="Tipo" value={form.tipo} onChange={handleChange} required />

          <Select
            name="id_categoria"
            label="Categoría"
            value={form.id_categoria}
            onChange={handleChange}
            required
          >
            <option value="" disabled>
              Elige una categoría
            </option>
            {categorias.map((c) => (
              <option key={c.id_categoria} value={c.id_categoria}>
                {c.nombre}
              </option>
            ))}
          </Select>

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
