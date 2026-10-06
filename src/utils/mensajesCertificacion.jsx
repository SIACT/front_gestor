import { Link } from 'react-router-dom';

// 500 de /emitir, /emitir-lote y /generar-prueba cuando la plantilla tiene QR y el servidor no sabe
// a qué URL pública debe apuntar. Lo resuelve quien administra el servidor, no el Admin del congreso.
export const MENSAJE_FRONTEND_URL_NO_CONFIGURADA =
  'El servidor no tiene configurada la URL pública del sitio. Avisa al administrador técnico.';

// Mensaje específico por código de error de POST /certificacion/emitir (sin genéricos). Los que
// ya traen el detalle útil desde el backend (ej. ASISTENCIA_INSUFICIENTE con "X de Y días") se
// muestran tal cual.
export function mensajeErrorEmision(error, idCongreso) {
  switch (error.code) {
    case 'PLANTILLA_NOT_FOUND':
      return (
        <>
          No hay plantilla para este tipo de certificado. Configura primero la plantilla en el{' '}
          <Link to={`/congresos/${idCongreso}/admin/editor-certificado`} className="font-medium underline">
            Editor de certificados
          </Link>
          .
        </>
      );
    case 'INSCRIPCION_NO_CONFIRMADA':
      return 'La inscripción no está confirmada: solo las inscripciones confirmadas pueden recibir certificado (la carta de compromiso no habilita la emisión).';
    case 'ASISTENCIA_INSUFICIENTE':
      return `No cumple la asistencia requerida. ${error.message}`;
    case 'TRABAJO_NO_PRESENTO':
      return "Este trabajo no está marcado como 'Presentó': no se puede emitir el certificado de participación.";
    case 'UMBRAL_NO_CONFIGURADO':
      return 'Configura primero el umbral de días de asistencia requeridos del congreso.';
    case 'FRONTEND_URL_NO_CONFIGURADA':
      return MENSAJE_FRONTEND_URL_NO_CONFIGURADA;
    default:
      return error.message;
  }
}
