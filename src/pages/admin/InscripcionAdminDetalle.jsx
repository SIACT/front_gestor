import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Eye } from 'lucide-react';
import { apiFetch } from '../../api/client';
import { ESTADO_INSCRIPCION_VARIANT, capitalizar, formatCOP, formatFecha } from '../../utils/formato';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { Modal } from '../../components/ui/Modal';
import { Alert } from '../../components/ui/Alert';
import { PageLoader } from '../../components/ui/PageLoader';
import { Spinner } from '../../components/ui/Spinner';

const ESTADOS = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'revisado', label: 'Revisado' },
  { value: 'rechazado', label: 'Rechazado' },
];

const ESTADOS_INSCRIPCION = ['pendiente', 'confirmada', 'rechazada', 'cancelada'];

function ArchivoItem({ archivo, onRefrescar }) {
  const [estado, setEstado] = useState(archivo.estado);
  const [comentarios, setComentarios] = useState(archivo.comentarios ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmarRechazo, setConfirmarRechazo] = useState(false);
  const [verLoading, setVerLoading] = useState(false);
  const [verError, setVerError] = useState('');

  async function enviarRevision() {
    setError('');
    setSubmitting(true);
    try {
      await apiFetch(`/archivos/${archivo.id_archivo}/revision`, {
        method: 'PATCH',
        body: JSON.stringify({ estado, comentarios: comentarios || undefined }),
      });
      await onRefrescar();
      setConfirmarRechazo(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (estado === 'rechazado') {
      setConfirmarRechazo(true);
      return;
    }
    enviarRevision();
  }

  async function handleVer() {
    setVerError('');
    setVerLoading(true);
    try {
      const data = await apiFetch(`/archivos/${archivo.id_archivo}/url`);
      window.open(data.url, '_blank');
    } catch (err) {
      setVerError(err.message);
    } finally {
      setVerLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 border-b border-border pb-4 last:border-0 last:pb-0">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-text-primary">{archivo.tipo_archivo}</p>
          <p className="text-sm text-text-muted">{archivo.archivo_nombre}</p>
          {archivo.comentarios && (
            <p className="mt-1 text-xs text-text-muted">{archivo.comentarios}</p>
          )}
        </div>
        <Badge variant={archivo.estado}>{archivo.estado}</Badge>
      </div>

      {verError && <Alert variant="error">{verError}</Alert>}
      <Button
        type="button"
        variant="secondary"
        size="sm"
        loading={verLoading}
        onClick={handleVer}
        className="self-start"
      >
        <Eye className="size-4" />
        Ver archivo
      </Button>

      <form className="flex flex-col gap-2 sm:flex-row sm:items-end" onSubmit={handleSubmit}>
        {!confirmarRechazo && error && (
          <Alert variant="error" className="sm:w-full">
            {error}
          </Alert>
        )}
        <Select
          label="Estado"
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
          className="sm:w-40"
        >
          {ESTADOS.map((e) => (
            <option key={e.value} value={e.value}>
              {e.label}
            </option>
          ))}
        </Select>
        <Textarea
          label="Comentarios"
          rows={2}
          value={comentarios}
          onChange={(e) => setComentarios(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" variant="primary" size="sm" loading={submitting}>
          Guardar
        </Button>
      </form>

      <Modal open={confirmarRechazo} onClose={() => setConfirmarRechazo(false)} title="Rechazar archivo">
        <div className="flex flex-col gap-4">
          {error && <Alert variant="error">{error}</Alert>}
          <p className="text-sm text-text-primary">
            ¿Confirmas que quieres marcar "{archivo.archivo_nombre}" como rechazado?
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setConfirmarRechazo(false)}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" loading={submitting} onClick={enviarRevision}>
              Rechazar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export function InscripcionAdminDetalle() {
  const { id } = useParams();
  const [inscripcion, setInscripcion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [archivos, setArchivos] = useState([]);
  const [archivosLoading, setArchivosLoading] = useState(true);
  const [archivosError, setArchivosError] = useState('');

  const [descuentosDisponibles, setDescuentosDisponibles] = useState([]);

  function cargarInscripcion() {
    return apiFetch(`/inscripciones/${id}`).then(setInscripcion);
  }

  function cargarArchivos() {
    return apiFetch(`/inscripciones/${id}/archivos`).then((data) => setArchivos(data ?? []));
  }

  useEffect(() => {
    setLoading(true);
    setError('');
    cargarInscripcion()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

    setArchivosLoading(true);
    setArchivosError('');
    cargarArchivos()
      .catch((err) => setArchivosError(err.message))
      .finally(() => setArchivosLoading(false));

    apiFetch('/descuentos')
      .then((data) => setDescuentosDisponibles(data ?? []))
      .catch(() => setDescuentosDisponibles([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // --- Descuentos aplicados ---
  const [confirmandoQuitar, setConfirmandoQuitar] = useState(null);
  const [quitandoId, setQuitandoId] = useState(null);
  const [quitarError, setQuitarError] = useState('');

  function handleAbrirQuitar(entry) {
    setConfirmandoQuitar(entry);
    setQuitarError('');
  }

  async function handleConfirmarQuitar() {
    setQuitarError('');
    setQuitandoId(confirmandoQuitar.id_descuento);
    try {
      const actualizado = await apiFetch(
        `/inscripciones/${id}/descuentos/${confirmandoQuitar.id_descuento}`,
        { method: 'DELETE' },
      );
      setInscripcion(actualizado);
      setConfirmandoQuitar(null);
    } catch (err) {
      setQuitarError(err.message);
    } finally {
      setQuitandoId(null);
    }
  }

  const [descuentoSeleccionado, setDescuentoSeleccionado] = useState('');
  const [agregando, setAgregando] = useState(false);
  const [agregarError, setAgregarError] = useState('');

  async function handleAgregarDescuento(e) {
    e.preventDefault();
    if (!descuentoSeleccionado) return;
    setAgregarError('');
    setAgregando(true);
    try {
      const actualizado = await apiFetch(`/inscripciones/${id}/descuentos`, {
        method: 'POST',
        body: JSON.stringify({ id_descuento: Number(descuentoSeleccionado) }),
      });
      setInscripcion(actualizado);
      setDescuentoSeleccionado('');
    } catch (err) {
      setAgregarError(err.message);
    } finally {
      setAgregando(false);
    }
  }

  // --- Comprobante ---
  const [revisionForm, setRevisionForm] = useState({
    estado_comprobante: 'pendiente',
    comentarios_revision: '',
    monto_pagado: '',
  });
  const [revisionSubmitting, setRevisionSubmitting] = useState(false);
  const [revisionError, setRevisionError] = useState('');
  const [confirmarRechazoComprobante, setConfirmarRechazoComprobante] = useState(false);
  const [verComprobanteLoading, setVerComprobanteLoading] = useState(false);
  const [verComprobanteError, setVerComprobanteError] = useState('');

  useEffect(() => {
    if (inscripcion?.comprobante) {
      setRevisionForm({
        estado_comprobante: inscripcion.comprobante.estado_comprobante ?? 'pendiente',
        comentarios_revision: inscripcion.comprobante.comentarios_revision ?? '',
        monto_pagado:
          inscripcion.comprobante.monto_pagado != null
            ? String(inscripcion.comprobante.monto_pagado)
            : '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inscripcion]);

  async function enviarRevisionComprobante() {
    setRevisionError('');
    setRevisionSubmitting(true);
    try {
      const body = { estado_comprobante: revisionForm.estado_comprobante };
      if (revisionForm.comentarios_revision) body.comentarios_revision = revisionForm.comentarios_revision;
      if (revisionForm.monto_pagado !== '') body.monto_pagado = Number(revisionForm.monto_pagado);

      await apiFetch(`/inscripciones/${id}/comprobante/revision`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      await cargarInscripcion();
      setConfirmarRechazoComprobante(false);
    } catch (err) {
      setRevisionError(err.message);
    } finally {
      setRevisionSubmitting(false);
    }
  }

  function handleRevisionSubmit(e) {
    e.preventDefault();
    if (revisionForm.estado_comprobante === 'rechazado') {
      setConfirmarRechazoComprobante(true);
      return;
    }
    enviarRevisionComprobante();
  }

  async function handleVerComprobante() {
    setVerComprobanteError('');
    setVerComprobanteLoading(true);
    try {
      const data = await apiFetch(`/inscripciones/${id}/comprobante/url`);
      window.open(data.url, '_blank');
    } catch (err) {
      setVerComprobanteError(err.message);
    } finally {
      setVerComprobanteLoading(false);
    }
  }

  // --- Estado de la inscripción ---
  const [estadoSeleccionado, setEstadoSeleccionado] = useState('');
  const [actualizandoEstado, setActualizandoEstado] = useState(false);
  const [estadoError, setEstadoError] = useState('');

  useEffect(() => {
    if (inscripcion) {
      setEstadoSeleccionado(inscripcion.estado_inscripcion);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inscripcion]);

  async function handleActualizarEstado() {
    setEstadoError('');
    setActualizandoEstado(true);
    try {
      const actualizado = await apiFetch(`/inscripciones/${id}/estado`, {
        method: 'PATCH',
        body: JSON.stringify({ estado_inscripcion: estadoSeleccionado }),
      });
      setInscripcion(actualizado);
    } catch (err) {
      setEstadoError(err.message);
    } finally {
      setActualizandoEstado(false);
    }
  }

  // --- Gestión (soft-delete / reactivar) ---
  const [confirmarEliminar, setConfirmarEliminar] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [eliminarError, setEliminarError] = useState('');
  const [reactivando, setReactivando] = useState(false);
  const [reactivarError, setReactivarError] = useState('');

  function handleAbrirEliminar() {
    setConfirmarEliminar(true);
    setEliminarError('');
  }

  async function handleEliminar() {
    setEliminarError('');
    setEliminando(true);
    try {
      const resultado = await apiFetch(`/inscripciones/${id}`, { method: 'DELETE' });
      setInscripcion(resultado.inscripcion);
      setConfirmarEliminar(false);
    } catch (err) {
      setEliminarError(err.message);
    } finally {
      setEliminando(false);
    }
  }

  async function handleReactivar() {
    setReactivarError('');
    setReactivando(true);
    try {
      const resultado = await apiFetch(`/inscripciones/${id}/reactivar`, { method: 'POST' });
      setInscripcion(resultado.inscripcion);
    } catch (err) {
      setReactivarError(err.message);
    } finally {
      setReactivando(false);
    }
  }

  if (loading) return <PageLoader />;

  if (error) {
    return (
      <div className="mx-auto w-full max-w-lg">
        <Alert variant="error">{error}</Alert>
      </div>
    );
  }

  if (!inscripcion) return null;

  const costoBase = Number(inscripcion.costo_base);
  const descuentoAplicado = Number(inscripcion.descuento_aplicado);
  const costoFinal = Number(inscripcion.costo_final);
  const descuentosAplicados = inscripcion.inscripcion_descuentos ?? [];
  const comprobante = inscripcion.comprobante;

  const idsAplicados = new Set(descuentosAplicados.map((d) => d.id_descuento));
  const opcionesDisponibles = descuentosDisponibles.filter(
    (d) => d.activo && !idsAplicados.has(d.id_descuento),
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      {!inscripcion.activo && (
        <Alert variant="warning">
          Esta inscripción está desactivada. Algunas acciones pueden no tener efecto esperado.
        </Alert>
      )}

      <div>
        <Link
          to="/admin/inscripciones"
          className="text-sm text-text-muted transition-colors hover:text-text-primary"
        >
          ← Inscripciones
        </Link>
        <h1 className="mt-2 font-sans text-2xl font-bold text-text-primary">
          Inscripción #{inscripcion.id_inscripcion}
        </h1>
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium uppercase tracking-wide text-text-muted">
            Datos generales
          </h2>
          <Badge variant={ESTADO_INSCRIPCION_VARIANT[inscripcion.estado_inscripcion] ?? 'default'}>
            {inscripcion.estado_inscripcion}
          </Badge>
        </div>
        <dl className="mt-4 flex flex-col gap-3 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-text-muted">Usuario</dt>
            <dd className="text-right text-text-primary">
              {capitalizar(inscripcion.usuario?.nombre)} {capitalizar(inscripcion.usuario?.apellido)}
              <span className="block text-xs text-text-muted">{inscripcion.usuario?.correo}</span>
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-text-muted">Categoría</dt>
            <dd className="text-text-primary">{inscripcion.categoria?.nombre ?? '—'}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-text-muted">Tipo de asistente</dt>
            <dd className="text-text-primary">{inscripcion.tipo_asistente?.tipo ?? '—'}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-text-muted">Fecha de inscripción</dt>
            <dd className="text-text-primary">{formatFecha(inscripcion.fecha_inscripcion)}</dd>
          </div>
        </dl>
      </Card>

      <Card>
        <h2 className="text-sm font-medium uppercase tracking-wide text-text-muted">
          Resumen de costos
        </h2>
        <dl className="mt-4 flex flex-col gap-3">
          <div className="flex items-center justify-between text-sm">
            <dt className="text-text-muted">Costo base</dt>
            <dd className="text-text-primary">{formatCOP(costoBase)}</dd>
          </div>
          {descuentoAplicado > 0 && (
            <div className="flex items-center justify-between text-sm">
              <dt className="text-text-muted">Descuento aplicado</dt>
              <dd className="text-success-text">-{formatCOP(descuentoAplicado)}</dd>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-border pt-3">
            <dt className="text-sm font-medium text-text-muted">Costo final</dt>
            <dd className="text-2xl font-bold text-accent">{formatCOP(costoFinal)}</dd>
          </div>
        </dl>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium uppercase tracking-wide text-text-muted">
            Estado de la inscripción
          </h2>
          <Badge variant={ESTADO_INSCRIPCION_VARIANT[inscripcion.estado_inscripcion] ?? 'default'}>
            {inscripcion.estado_inscripcion}
          </Badge>
        </div>

        {estadoError && (
          <Alert variant="error" className="mt-4">
            {estadoError}
          </Alert>
        )}

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <Select
            label="Nuevo estado"
            value={estadoSeleccionado}
            onChange={(e) => setEstadoSeleccionado(e.target.value)}
            className="flex-1"
          >
            {ESTADOS_INSCRIPCION.map((valor) => (
              <option key={valor} value={valor}>
                {valor}
              </option>
            ))}
          </Select>
          <Button
            type="button"
            variant="primary"
            loading={actualizandoEstado}
            disabled={estadoSeleccionado === inscripcion.estado_inscripcion}
            onClick={handleActualizarEstado}
          >
            Actualizar estado
          </Button>
        </div>
        <p className="mt-2 text-xs text-text-muted">
          El estado de la inscripción es independiente del estado del comprobante de pago — debes
          actualizarlo manualmente.
        </p>
      </Card>

      <Card>
        <h2 className="text-sm font-medium uppercase tracking-wide text-text-muted">
          Descuentos aplicados
        </h2>

        {descuentosAplicados.length === 0 ? (
          <p className="mt-4 text-sm text-text-muted">Esta inscripción no tiene descuentos aplicados.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {descuentosAplicados.map((d) => (
              <li key={d.id_descuento} className="flex items-center justify-between gap-4 text-sm">
                <div>
                  <span className="text-text-primary">{d.descuento.nombre}</span>{' '}
                  <Badge variant="default">{d.descuento.porcentaje_descuento}%</Badge>
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={quitandoId !== null}
                  onClick={() => handleAbrirQuitar(d)}
                >
                  Quitar
                </Button>
              </li>
            ))}
          </ul>
        )}

        <form
          className="mt-6 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-end"
          onSubmit={handleAgregarDescuento}
        >
          {agregarError && (
            <Alert variant="error" className="sm:w-full">
              {agregarError}
            </Alert>
          )}
          <Select
            label="Agregar descuento"
            value={descuentoSeleccionado}
            onChange={(e) => setDescuentoSeleccionado(e.target.value)}
            disabled={opcionesDisponibles.length === 0}
            className="flex-1"
          >
            <option value="">Selecciona un descuento</option>
            {opcionesDisponibles.map((d) => (
              <option key={d.id_descuento} value={d.id_descuento}>
                {d.nombre} ({d.porcentaje_descuento}%)
              </option>
            ))}
          </Select>
          <Button type="submit" variant="primary" loading={agregando} disabled={!descuentoSeleccionado}>
            Agregar descuento
          </Button>
        </form>
        {opcionesDisponibles.length === 0 && (
          <p className="mt-2 text-xs text-text-muted">
            No hay más descuentos disponibles para agregar.
          </p>
        )}

        <Modal
          open={Boolean(confirmandoQuitar)}
          onClose={() => setConfirmandoQuitar(null)}
          title="Quitar descuento"
        >
          <div className="flex flex-col gap-4">
            {quitarError && <Alert variant="error">{quitarError}</Alert>}
            <p className="text-sm text-text-primary">
              ¿Quitar el descuento "{confirmandoQuitar?.descuento?.nombre}" de esta inscripción?
            </p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setConfirmandoQuitar(null)}>
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                loading={quitandoId === confirmandoQuitar?.id_descuento}
                onClick={handleConfirmarQuitar}
              >
                Quitar
              </Button>
            </div>
          </div>
        </Modal>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium uppercase tracking-wide text-text-muted">
            Comprobante de pago
          </h2>
          {comprobante && (
            <Badge variant={comprobante.estado_comprobante}>{comprobante.estado_comprobante}</Badge>
          )}
        </div>

        {!comprobante ? (
          <p className="mt-4 text-sm text-text-muted">
            El usuario aún no ha subido comprobante de pago.
          </p>
        ) : (
          <div className="mt-4 flex flex-col gap-4">
            <dl className="flex flex-col gap-2 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-text-muted">Archivo</dt>
                <dd className="text-text-primary">{comprobante.archivo_nombre}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-text-muted">Monto pagado</dt>
                <dd className="text-text-primary">{formatCOP(comprobante.monto_pagado)}</dd>
              </div>
            </dl>

            {comprobante.estado_comprobante === 'rechazado' && comprobante.comentarios_revision && (
              <Alert variant="warning">{comprobante.comentarios_revision}</Alert>
            )}

            {verComprobanteError && <Alert variant="error">{verComprobanteError}</Alert>}
            <Button
              type="button"
              variant="secondary"
              loading={verComprobanteLoading}
              onClick={handleVerComprobante}
              className="self-start"
            >
              <Eye className="size-4" />
              Ver comprobante
            </Button>

            <form
              className="flex flex-col gap-3 border-t border-border pt-4"
              onSubmit={handleRevisionSubmit}
            >
              {!confirmarRechazoComprobante && revisionError && (
                <Alert variant="error">{revisionError}</Alert>
              )}
              <Select
                label="Estado del comprobante"
                value={revisionForm.estado_comprobante}
                onChange={(e) =>
                  setRevisionForm((prev) => ({ ...prev, estado_comprobante: e.target.value }))
                }
              >
                {ESTADOS.map((e) => (
                  <option key={e.value} value={e.value}>
                    {e.label}
                  </option>
                ))}
              </Select>
              <Textarea
                label="Comentarios de revisión (opcional)"
                rows={3}
                value={revisionForm.comentarios_revision}
                onChange={(e) =>
                  setRevisionForm((prev) => ({ ...prev, comentarios_revision: e.target.value }))
                }
              />
              <Input
                type="number"
                min="0"
                label="Monto pagado (opcional)"
                value={revisionForm.monto_pagado}
                onChange={(e) => setRevisionForm((prev) => ({ ...prev, monto_pagado: e.target.value }))}
              />
              <Button type="submit" variant="primary" loading={revisionSubmitting} className="self-start">
                Guardar revisión
              </Button>
            </form>
          </div>
        )}

        <Modal
          open={confirmarRechazoComprobante}
          onClose={() => setConfirmarRechazoComprobante(false)}
          title="Rechazar comprobante"
        >
          <div className="flex flex-col gap-4">
            {revisionError && <Alert variant="error">{revisionError}</Alert>}
            <p className="text-sm text-text-primary">
              ¿Confirmas que quieres marcar este comprobante como rechazado? El usuario será notificado.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setConfirmarRechazoComprobante(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                loading={revisionSubmitting}
                onClick={enviarRevisionComprobante}
              >
                Rechazar
              </Button>
            </div>
          </div>
        </Modal>
      </Card>

      <Card>
        <h2 className="text-sm font-medium uppercase tracking-wide text-text-muted">
          Archivos adicionales
        </h2>
        {archivosLoading ? (
          <div className="mt-4 flex justify-center">
            <Spinner className="size-6 text-accent" />
          </div>
        ) : archivosError ? (
          <Alert variant="error" className="mt-4">
            {archivosError}
          </Alert>
        ) : archivos.length === 0 ? (
          <p className="mt-4 text-sm text-text-muted">Sin archivos adicionales subidos.</p>
        ) : (
          <div className="mt-4 flex flex-col gap-4">
            {archivos.map((a) => (
              <ArchivoItem key={a.id_archivo} archivo={a} onRefrescar={cargarArchivos} />
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h2 className="text-sm font-medium uppercase tracking-wide text-text-muted">
          Gestión de la inscripción
        </h2>

        {inscripcion.activo ? (
          <div className="mt-4">
            {!confirmarEliminar && eliminarError && (
              <Alert variant="error" className="mb-3">
                {eliminarError}
              </Alert>
            )}
            <Button type="button" variant="destructive" onClick={handleAbrirEliminar}>
              Eliminar inscripción
            </Button>
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            <Alert variant="warning">Esta inscripción está desactivada.</Alert>
            {reactivarError && <Alert variant="error">{reactivarError}</Alert>}
            <Button
              type="button"
              variant="primary"
              loading={reactivando}
              onClick={handleReactivar}
              className="self-start"
            >
              Reactivar inscripción
            </Button>
          </div>
        )}

        <Modal
          open={confirmarEliminar}
          onClose={() => setConfirmarEliminar(false)}
          title="Eliminar inscripción"
        >
          <div className="flex flex-col gap-4">
            {eliminarError && <Alert variant="error">{eliminarError}</Alert>}
            <p className="text-sm text-text-primary">
              Esto desactivará la inscripción. No se borra permanentemente y puede reactivarse
              después. ¿Continuar?
            </p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setConfirmarEliminar(false)}>
                Cancelar
              </Button>
              <Button type="button" variant="destructive" loading={eliminando} onClick={handleEliminar}>
                Eliminar
              </Button>
            </div>
          </div>
        </Modal>
      </Card>
    </div>
  );
}
