import { Fragment, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../api/client';
import { useCongreso } from '../../context/CongresoContext';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { Modal } from '../../components/ui/Modal';
import { Alert } from '../../components/ui/Alert';
import { PageLoader } from '../../components/ui/PageLoader';

const CONTEXTOS = ['comprobante', 'archivo', 'talk', 'inscripcion', 'general'];

const FORM_INICIAL = { contexto: CONTEXTOS[0], texto: '', activo: true };

export function MensajesPredeterminados() {
  const { congreso } = useCongreso();
  const idCongreso = congreso?.id_congreso;

  const [mensajes, setMensajes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiFetch(`/congresos/${idCongreso}/mensajes-predeterminados`)
      .then((data) => setMensajes(data ?? []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [idCongreso]);

  // El backend ya ordena por contexto/texto, pero re-ordenamos en el cliente para que
  // los mensajes creados/editados localmente (sin recargar la lista) mantengan el
  // agrupamiento visual correcto.
  const mensajesOrdenados = useMemo(
    () =>
      [...mensajes].sort(
        (a, b) => a.contexto.localeCompare(b.contexto) || a.texto.localeCompare(b.texto),
      ),
    [mensajes],
  );

  function handleAbrirCrear() {
    setEditando(null);
    setForm(FORM_INICIAL);
    setFormError('');
    setModalOpen(true);
  }

  function handleAbrirEditar(item) {
    setEditando(item);
    setForm({
      contexto: item.contexto,
      texto: item.texto,
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
        if (form.contexto !== editando.contexto) cambios.contexto = form.contexto;
        if (form.texto !== editando.texto) cambios.texto = form.texto;
        if (form.activo !== editando.activo) cambios.activo = form.activo;

        const actualizado = await apiFetch(
          `/congresos/${idCongreso}/mensajes-predeterminados/${editando.id_mensaje}`,
          { method: 'PATCH', body: JSON.stringify(cambios) },
        );
        setMensajes((prev) =>
          prev.map((m) => (m.id_mensaje === editando.id_mensaje ? { ...m, ...actualizado } : m)),
        );
      } else {
        const nuevo = await apiFetch(`/congresos/${idCongreso}/mensajes-predeterminados`, {
          method: 'POST',
          body: JSON.stringify({ contexto: form.contexto, texto: form.texto }),
        });
        setMensajes((prev) => [...prev, nuevo]);
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
          <h1 className="font-sans text-2xl font-bold text-text-primary">Mensajes predeterminados</h1>
          <p className="mt-1 text-sm text-text-muted">
            Catálogo de sugerencias de texto para los formularios de revisión y comentarios.
          </p>
        </div>
        <Button type="button" variant="primary" onClick={handleAbrirCrear}>
          Crear mensaje
        </Button>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {mensajesOrdenados.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface px-6 py-12 text-center">
          <p className="text-sm text-text-muted">Todavía no hay mensajes predeterminados en este congreso.</p>
        </div>
      ) : (
        <Table>
          <Table.Head>
            <tr>
              <Table.HeadCell>Contexto</Table.HeadCell>
              <Table.HeadCell>Mensaje</Table.HeadCell>
              <Table.HeadCell>Estado</Table.HeadCell>
              <Table.HeadCell></Table.HeadCell>
            </tr>
          </Table.Head>
          <tbody>
            {mensajesOrdenados.map((m, index) => {
              const esNuevoGrupo = index === 0 || m.contexto !== mensajesOrdenados[index - 1].contexto;
              return (
                <Fragment key={m.id_mensaje}>
                  {esNuevoGrupo && (
                    <tr className="border-b border-border bg-background/60">
                      <Table.Cell colSpan={4} className="py-2 text-xs font-medium uppercase tracking-wide text-text-muted">
                        {m.contexto}
                      </Table.Cell>
                    </tr>
                  )}
                  <Table.Row>
                    <Table.Cell>
                      <Badge variant="default">{m.contexto}</Badge>
                    </Table.Cell>
                    <Table.Cell className="max-w-md">
                      <p className="line-clamp-2 text-text-primary">{m.texto}</p>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge variant={m.activo ? 'revisado' : 'default'}>
                        {m.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>
                      <Button type="button" variant="ghost" size="sm" onClick={() => handleAbrirEditar(m)}>
                        Editar
                      </Button>
                    </Table.Cell>
                  </Table.Row>
                </Fragment>
              );
            })}
          </tbody>
        </Table>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editando ? 'Editar mensaje predeterminado' : 'Crear mensaje predeterminado'}
      >
        <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
          {formError && <Alert variant="error">{formError}</Alert>}

          <Select name="contexto" label="Contexto" value={form.contexto} onChange={handleChange}>
            {CONTEXTOS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>

          <Textarea name="texto" label="Mensaje" value={form.texto} onChange={handleChange} required />

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
            Los mensajes predeterminados no se eliminan, se desactivan.
          </p>

          <Button type="submit" variant="primary" loading={submitting} className="mt-2 w-full">
            {editando ? 'Guardar cambios' : 'Crear mensaje'}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
