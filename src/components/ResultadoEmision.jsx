import { Alert } from './ui/Alert';
import { mensajeErrorEmision } from '../utils/mensajesCertificacion';

// resultado: { nombre, data } en éxito o { nombre, error } en fallo; null para no mostrar nada.
export function ResultadoEmision({ resultado, idCongreso, className }) {
  if (!resultado) return null;
  const quien = resultado.nombre ? `${resultado.nombre}: ` : '';

  if (resultado.error) {
    return (
      <Alert variant="error" className={className}>
        {quien}
        {mensajeErrorEmision(resultado.error, idCongreso)}
      </Alert>
    );
  }

  const { ya_existia, codigo_verificacion } = resultado.data ?? {};
  return (
    <Alert variant={ya_existia ? 'warning' : 'success'} className={className}>
      {quien}
      {ya_existia ? 'ya tenía este certificado emitido' : 'certificado emitido'}
      {codigo_verificacion && (
        <>
          {' '}
          (código de verificación <span className="font-mono">{codigo_verificacion}</span>)
        </>
      )}
      .
    </Alert>
  );
}
