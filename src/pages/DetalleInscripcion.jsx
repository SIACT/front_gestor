import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiFetch, API_URL } from '../api/client';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { PageLoader } from '../components/ui/PageLoader';
import { Spinner } from '../components/ui/Spinner';

function formatCOP(value) {
  return Number(value).toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  });
}

export function DetalleInscripcion() {
  const { id } = useParams();
  const [inscripcion, setInscripcion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const [archivos, setArchivos] = useState([]);
  const [archivosLoading, setArchivosLoading] = useState(true);
  const [archivosError, setArchivosError] = useState('');
  const [archivoNuevo, setArchivoNuevo] = useState(null);
  const [tipoArchivo, setTipoArchivo] = useState('');
  const [uploadingArchivo, setUploadingArchivo] = useState(false);
  const [uploadArchivoError, setUploadArchivoError] = useState('');
  const [uploadArchivoKey, setUploadArchivoKey] = useState(0);
  const [archivoAEliminar, setArchivoAEliminar] = useState(null);
  const [eliminandoArchivoId, setEliminandoArchivoId] = useState(null);
  const [eliminarArchivoError, setEliminarArchivoError] = useState('');

  function cargarInscripcion() {
    return apiFetch(`/inscripciones/${id}`).then(setInscripcion);
  }

  function cargarArchivos() {
    return apiFetch(`/inscripciones/${id}/archivos`).then((data) => setArchivos(data ?? []));
  }

  useEffect(() => {
    setLoading(true);
    cargarInscripcion()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

    setArchivosLoading(true);
    setArchivosError('');
    cargarArchivos()
      .catch((err) => setArchivosError(err.message))
      .finally(() => setArchivosLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleUpload(e) {
    e.preventDefault();
    if (!file) return;
    setUploadError('');
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('archivo', file);
      const res = await fetch(`${API_URL}/inscripciones/${id}/comprobante`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.error?.message || 'Error al subir el comprobante');
      }
      await cargarInscripcion();
      setFile(null);
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleUploadArchivo(e) {
    e.preventDefault();
    if (!archivoNuevo) return;
    setUploadArchivoError('');
    setUploadingArchivo(true);
    try {
      const formData = new FormData();
      formData.append('archivo', archivoNuevo);
      if (tipoArchivo) formData.append('tipo_archivo', tipoArchivo);
      const res = await fetch(`${API_URL}/inscripciones/${id}/archivos`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.error?.message || 'Error al subir el archivo');
      }
      await cargarArchivos();
      setArchivoNuevo(null);
      setTipoArchivo('');
      setUploadArchivoKey((k) => k + 1);
    } catch (err) {
      setUploadArchivoError(err.message);
    } finally {
      setUploadingArchivo(false);
    }
  }

  async function handleEliminarArchivo() {
    if (!archivoAEliminar) return;
    setEliminarArchivoError('');
    setEliminandoArchivoId(archivoAEliminar.id_archivo);
    try {
      await apiFetch(`/archivos/${archivoAEliminar.id_archivo}`, { method: 'DELETE' });
      await cargarArchivos();
      setArchivoAEliminar(null);
    } catch (err) {
      setEliminarArchivoError(err.message);
    } finally {
      setEliminandoArchivoId(null);
    }
  }

  if (loading) return <PageLoader />;

  if (error) {
    return (
      <div className="mx-auto w-full max-w-lg px-6 py-12">
        <Alert variant="error">{error}</Alert>
      </div>
    );
  }

  if (!inscripcion) return null;

  const costoBase = Number(inscripcion.costo_base);
  const descuentoAplicado = Number(inscripcion.descuento_aplicado);
  const costoFinal = Number(inscripcion.costo_final);
  const descuentos = inscripcion.inscripcion_descuentos ?? [];
  const comprobante = inscripcion.comprobante;
  const mostrarFormularioSubida = !comprobante || comprobante.estado_comprobante !== 'revisado';

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-6 py-12">
      <div>
        <h1 className="font-sans text-2xl font-bold text-text-primary">
          Inscripción {inscripcion.id_inscripcion}  ALTENCOA 11-2026
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Estado: <span className="capitalize text-text-primary">{inscripcion.estado_inscripcion}</span>
        </p>
      </div>

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
        <h2 className="text-sm font-medium uppercase tracking-wide text-text-muted">
          Descuentos aplicados
        </h2>
        {descuentos.length === 0 ? (
          <p className="mt-4 text-sm text-text-muted">No tienes descuentos aplicados aún.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {descuentos.map((d) => (
              <li key={d.id_descuento} className="flex items-center justify-between text-sm">
                <span className="text-text-primary">{d.descuento.nombre}</span>
                <Badge variant="default">{d.descuento.porcentaje_descuento}%</Badge>
              </li>
            ))}
          </ul>
        )}
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

        {comprobante?.estado_comprobante === 'rechazado' && comprobante.comentarios_revision && (
          <Alert variant="warning" className="mt-4">
            {comprobante.comentarios_revision}
          </Alert>
        )}

        {mostrarFormularioSubida && (
          <form className="mt-4 flex flex-col gap-3" onSubmit={handleUpload}>
            {uploadError && <Alert variant="error">{uploadError}</Alert>}
            <input
              key={comprobante?.id_comprobante ?? 'new'}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-muted file:mr-3 file:rounded-md file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-background hover:file:bg-accent-hover"
            />
            <Button type="submit" variant="primary" loading={uploading} disabled={!file} className="self-start">
              {comprobante ? 'Reemplazar comprobante' : 'Subir comprobante'}
            </Button>
          </form>
        )}
      </Card>

      <Card>
        <h2 className="text-sm font-medium uppercase tracking-wide text-text-muted">
          Archivos adicionales
        </h2>

        {archivosError && (
          <Alert variant="error" className="mt-4">
            {archivosError}
          </Alert>
        )}

        {archivosLoading ? (
          <div className="mt-4 flex justify-center">
            <Spinner className="size-6 text-accent" />
          </div>
        ) : archivos.length === 0 ? (
          <p className="mt-4 text-sm text-text-muted">Aún no has subido archivos adicionales.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-4">
            {archivos.map((a) => (
              <li
                key={a.id_archivo}
                className="flex flex-col gap-2 border-b border-border pb-4 last:border-0 last:pb-0"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-text-primary">{a.archivo_nombre}</p>
                    <p className="text-sm text-text-muted">{a.tipo_archivo}</p>
                  </div>
                  <Badge variant={a.estado}>{a.estado}</Badge>
                </div>

                {a.estado === 'rechazado' && a.comentarios && (
                  <Alert variant="warning">{a.comentarios}</Alert>
                )}

                {a.estado !== 'revisado' && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="self-start"
                    onClick={() => {
                      setEliminarArchivoError('');
                      setArchivoAEliminar(a);
                    }}
                  >
                    Eliminar
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}

        <form
          className="mt-6 flex flex-col gap-3 border-t border-border pt-4"
          onSubmit={handleUploadArchivo}
        >
          {uploadArchivoError && <Alert variant="error">{uploadArchivoError}</Alert>}
          <Input
            label="Tipo de archivo (opcional)"
            placeholder="ej. carta_aceptacion, cv"
            value={tipoArchivo}
            onChange={(e) => setTipoArchivo(e.target.value)}
          />
          <input
            key={uploadArchivoKey}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => setArchivoNuevo(e.target.files?.[0] ?? null)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-muted file:mr-3 file:rounded-md file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-background hover:file:bg-accent-hover"
          />
          <Button
            type="submit"
            variant="primary"
            loading={uploadingArchivo}
            disabled={!archivoNuevo}
            className="self-start"
          >
            Subir archivo
          </Button>
        </form>

        <Modal
          open={Boolean(archivoAEliminar)}
          onClose={() => setArchivoAEliminar(null)}
          title="Eliminar archivo"
        >
          <div className="flex flex-col gap-4">
            {eliminarArchivoError && <Alert variant="error">{eliminarArchivoError}</Alert>}
            <p className="text-sm text-text-primary">
              ¿Eliminar este archivo? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setArchivoAEliminar(null)}>
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                loading={eliminandoArchivoId === archivoAEliminar?.id_archivo}
                onClick={handleEliminarArchivo}
              >
                Eliminar
              </Button>
            </div>
          </div>
        </Modal>
      </Card>
    </div>
  );
}
