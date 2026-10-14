import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiFetch } from '../../api/client';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { Alert } from '../../components/ui/Alert';
import { PageLoader } from '../../components/ui/PageLoader';

const FORM_INICIAL = { nombre: '', descripcion: '', activo: true, articulo: '' };

// El backend solo acepta 'el', 'la' o null (el null real del JSON): cualquier otra cosa se trata como
// "sin artículo". normalizarArticulo limpia lo que llega del servidor; aArticuloApi convierte el
// valor del <select> ('' = "Sin definir") y es el ÚNICO camino del artículo hacia el backend.
function normalizarArticulo(valor) {
  return valor === 'el' || valor === 'la' ? valor : null;
}

function aArticuloApi(valor) {
  return valor === 'el' || valor === 'la' ? valor : null;
}

function normalizarTipo(tipo) {
  return { ...tipo, articulo: normalizarArticulo(tipo.articulo) };
}

export function TiposParticipacion() {
  const { id_congreso } = useParams();
  const [tipos, setTipos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiFetch(`/congresos/${id_congreso}/tipos-participacion`)
      .then((data) => setTipos((data ?? []).map(normalizarTipo)))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id_congreso]);

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
      articulo: item.articulo ?? '',
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
        // Ambos lados normalizados: '' contra null no cuenta como cambio (enviaría articulo: '' → 400).
        const articulo = aArticuloApi(form.articulo);
        if (articulo !== normalizarArticulo(editando.articulo)) cambios.articulo = articulo;

        const actualizado = await apiFetch(
          `/congresos/${id_congreso}/tipos-participacion/${editando.id_tipo_participacion}`,
          { method: 'PATCH', body: JSON.stringify(cambios) },
        );
        setTipos((prev) =>
          prev.map((t) =>
            t.id_tipo_participacion === editando.id_tipo_participacion ? normalizarTipo({ ...t, ...actualizado }) : t,
          ),
        );
      } else {
        const nuevo = await apiFetch(`/congresos/${id_congreso}/tipos-participacion`, {
          method: 'POST',
          body: JSON.stringify({
            nombre: form.nombre,
            descripcion: form.descripcion || undefined,
            articulo: aArticuloApi(form.articulo),
          }),
        });
        setTipos((prev) => [...prev, normalizarTipo(nuevo)]);
      }
      setModalOpen(false);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <PageLoader />;

  const activosSinArticulo = tipos.filter((t) => t.activo === true && t.articulo === null).length;
  const nombreVistaPrevia = form.nombre.trim() === '' ? '(nombre)' : form.nombre;

  return (
    <div className="flex flex-col gap-6 pt-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-sans text-2xl font-bold text-text-primary">Tipos de participación</h1>
          <p className="mt-1 text-sm text-text-muted">
            Catálogo de tipos de ponencia disponibles al proponer una charla.
          </p>
        </div>
        <Button type="button" variant="primary" onClick={handleAbrirCrear}>
          Crear tipo
        </Button>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {activosSinArticulo > 0 && (
        <Alert variant="warning">
          {activosSinArticulo === 1
            ? '1 tipo no tiene artículo: el certificado imprimirá solo su nombre.'
            : `${activosSinArticulo} tipos no tienen artículo: el certificado imprimirá solo sus nombres.`}
        </Alert>
      )}

      <Table>
        <Table.Head>
          <tr>
            <Table.HeadCell>Nombre</Table.HeadCell>
            <Table.HeadCell>Artículo</Table.HeadCell>
            <Table.HeadCell>Descripción</Table.HeadCell>
            <Table.HeadCell>Estado</Table.HeadCell>
            <Table.HeadCell></Table.HeadCell>
          </tr>
        </Table.Head>
        <tbody>
          {tipos.map((t) => (
            <Table.Row key={t.id_tipo_participacion}>
              <Table.Cell>{t.nombre}</Table.Cell>
              <Table.Cell>
                {t.articulo === null ? <Badge variant="pendiente">Sin definir</Badge> : t.articulo}
              </Table.Cell>
              <Table.Cell className="text-text-muted">{t.descripcion || '—'}</Table.Cell>
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
        title={editando ? 'Editar tipo de participación' : 'Crear tipo de participación'}
      >
        <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
          {formError && <Alert variant="error">{formError}</Alert>}

          <Input name="nombre" label="Nombre" value={form.nombre} onChange={handleChange} required />

          <div className="flex flex-col gap-1">
            <Select name="articulo" label="Artículo" value={form.articulo} onChange={handleChange}>
              <option value="">Sin definir</option>
              <option value="el">el</option>
              <option value="la">la</option>
            </Select>
            <p className="text-xs text-text-muted">
              En el certificado:{' '}
              {form.articulo === '' ? `${nombreVistaPrevia} (sin artículo)` : `${form.articulo} ${nombreVistaPrevia}`}
            </p>
          </div>

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
            Los tipos de participación no se eliminan, se desactivan.
          </p>

          <Button type="submit" variant="primary" loading={submitting} className="mt-2 w-full">
            {editando ? 'Guardar cambios' : 'Crear tipo'}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
