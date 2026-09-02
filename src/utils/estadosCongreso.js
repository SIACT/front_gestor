// Los 4 estados fijos de un congreso (backend: config/estadosCongreso.js) y su
// lógica de bloqueo asociada. Independiente de Congreso.activo — activo=false
// bloquea todo sin importar el estado, mismo efecto que 'finalizado'.
export const ESTADOS_CONGRESO = [
  'planeacion',
  'inscripciones_abiertas',
  'convocatoria_cerrada',
  'finalizado',
];

export const ESTADO_CONGRESO_LABELS = {
  planeacion: 'En planeación',
  inscripciones_abiertas: 'Inscripciones abiertas',
  convocatoria_cerrada: 'Convocatoria de ponencias cerrada',
  finalizado: 'Finalizado',
};

// Reutiliza las variantes de color ya existentes en Badge.jsx (gris/verde/ámbar/rojo).
export const ESTADO_CONGRESO_VARIANT = {
  planeacion: 'default',
  inscripciones_abiertas: 'revisado',
  convocatoria_cerrada: 'pendiente',
  finalizado: 'rechazado',
};
