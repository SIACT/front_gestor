import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiFetch, API_URL } from '../api/client';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { PageLoader } from '../components/ui/PageLoader';

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

  function cargarInscripcion() {
    return apiFetch(`/inscripciones/${id}`).then(setInscripcion);
  }

  useEffect(() => {
    setLoading(true);
    cargarInscripcion()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
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
          Inscripción #{inscripcion.id_inscripcion}
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
    </div>
  );
}
