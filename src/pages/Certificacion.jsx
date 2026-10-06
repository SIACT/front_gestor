import { useEffect, useState } from 'react';
import { apiFetch } from '../api/client';
import { useCongreso } from '../context/CongresoContext';
import { formatFecha } from '../utils/formato';
import { Logo } from '../components/ui/Logo';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Alert } from '../components/ui/Alert';
import { PageLoader } from '../components/ui/PageLoader';
import { BotonDescargarCertificado } from '../components/BotonDescargarCertificado';

const TIPO_LABEL = {
  asistencia: 'Asistencia',
  participacion: 'Participación',
};

export function Certificacion() {
  const { congreso, misInscripcion } = useCongreso();
  const idCongreso = congreso?.id_congreso;
  const idInscripcion = misInscripcion?.id_inscripcion;

  const [certificados, setCertificados] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  // Se incrementa para volver a pedir la lista (p. ej. si un certificado ya no existe al descargarlo).
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    if (!idInscripcion) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    apiFetch(`/congresos/${idCongreso}/certificacion/certificados/${idInscripcion}`)
      .then((data) => setCertificados(data ?? []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [idCongreso, idInscripcion, recarga]);

  return (
    <div className="flex flex-col items-center gap-8 px-4 pt-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <Logo variant="altenua" className="h-16 w-auto" />
        <h1 className="font-display text-2xl text-text-primary">Certificación</h1>
      </div>

      <div className="flex w-full max-w-2xl flex-col gap-4">
        {loading ? (
          <PageLoader />
        ) : !idInscripcion ? (
          <p className="text-center text-sm text-text-muted">
            Necesitas una inscripción en este congreso para tener certificados.
          </p>
        ) : error ? (
          <Alert variant="error">{error}</Alert>
        ) : certificados.length === 0 ? (
          <p className="text-center text-sm text-text-muted">Aún no tienes certificados disponibles.</p>
        ) : (
          certificados.map((certificado) => (
            <Card key={certificado.id_certificado} className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="default">{TIPO_LABEL[certificado.tipo] ?? certificado.tipo}</Badge>
                  <span className="text-xs text-text-muted">Emitido el {formatFecha(certificado.fecha_emision)}</span>
                </div>
                {certificado.tipo === 'participacion' && certificado.talk?.titulo && (
                  <p className="font-medium text-text-primary">{certificado.talk.titulo}</p>
                )}
              </div>
              <BotonDescargarCertificado
                idCongreso={idCongreso}
                idInscripcion={idInscripcion}
                idCertificado={certificado.id_certificado}
                onNoEncontrado={() => setRecarga((n) => n + 1)}
              />
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
