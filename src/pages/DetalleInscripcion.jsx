import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiFetch } from '../api/client';

const ESTADO_COMPROBANTE_CLASS = {
  pendiente: 'badge badge-pendiente',
  revisado: 'badge badge-revisado',
  rechazado: 'badge badge-rechazado',
};

export function DetalleInscripcion() {
  const { id } = useParams();
  const [inscripcion, setInscripcion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [archivo, setArchivo] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  function cargarInscripcion() {
    return apiFetch(`/inscripciones/${id}`).then(setInscripcion);
  }

  useEffect(() => {
    cargarInscripcion()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleUpload(e) {
    e.preventDefault();
    if (!archivo) return;
    setUploadError('');
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('archivo', archivo);
      await apiFetch(`/inscripciones/${id}/comprobante`, {
        method: 'POST',
        body: formData,
      });
      await cargarInscripcion();
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  }

  if (loading) return <div className="loading-screen">Cargando...</div>;
  if (error) return <div className="page-center"><p className="alert alert-error">{error}</p></div>;
  if (!inscripcion) return null;

  const descuentos = inscripcion.inscripcion_descuentos ?? [];
  const estadoComprobante = inscripcion.comprobante?.estado_comprobante;

  return (
    <div className="page-center">
      <div className="card">
        <h1>Inscripción #{inscripcion.id_inscripcion}</h1>
        <p>
          <strong>Estado:</strong> {inscripcion.estado_inscripcion}
        </p>
        <p>
          <strong>Costo base:</strong> ${inscripcion.costo_base}
        </p>
        <p>
          <strong>Descuento aplicado:</strong> ${inscripcion.descuento_aplicado}
        </p>
        <p>
          <strong>Costo final:</strong> ${inscripcion.costo_final}
        </p>

        {descuentos.length > 0 && (
          <>
            <h2>Descuentos aplicados</h2>
            <ul>
              {descuentos.map((d) => (
                <li key={d.id_descuento ?? d.descuento?.id_descuento}>
                  {d.descuento?.nombre} — {d.descuento?.porcentaje_descuento}%
                </li>
              ))}
            </ul>
          </>
        )}

        <h2>Comprobante de pago</h2>
        {estadoComprobante && (
          <p>
            Estado actual:{' '}
            <span className={ESTADO_COMPROBANTE_CLASS[estadoComprobante] ?? 'badge'}>
              {estadoComprobante}
            </span>
          </p>
        )}
        <form className="form" onSubmit={handleUpload}>
          {uploadError && <p className="alert alert-error">{uploadError}</p>}
          <input
            type="file"
            onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
            required
          />
          <button type="submit" disabled={uploading}>
            {uploading ? 'Subiendo...' : 'Subir comprobante'}
          </button>
        </form>
      </div>
    </div>
  );
}
