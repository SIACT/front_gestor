export function capitalizar(str) {
  if (!str) return str;
  return str
    .split(' ')
    .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1))
    .join(' ');
}

export function capitalizarPais(valor) {
  return valor
    .trim()
    .toLowerCase()
    .split(' ')
    .map((palabra) => palabra.charAt(0).toUpperCase() + palabra.slice(1))
    .join(' ');
}

export function formatCOP(value) {
  return Number(value).toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  });
}

export function formatFecha(value) {
  return new Date(value).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export const ESTADO_INSCRIPCION_VARIANT = {
  pendiente: 'pendiente',
  confirmada: 'revisado',
  rechazada: 'rechazado',
  cancelada: 'default',
};
