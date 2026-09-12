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

const CONECTORES = ['de', 'del', 'la', 'las', 'los', 'y', 'e', 'da', 'do', 'dos', 'van', 'von', 'di', 'el'];

export function capitalizarNombrePropio(valor) {
  return valor
    .trim()
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((palabra, index) => {
      if (index > 0 && CONECTORES.includes(palabra)) return palabra;
      return palabra.charAt(0).toUpperCase() + palabra.slice(1);
    })
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

// Para campos de fecha PURA (sin hora), como Schedule.fecha: 'YYYY-MM-DDT00:00:00.000Z' se
// interpreta como medianoche UTC, y en husos horarios negativos toLocaleDateString la muestra
// un día atrás. Se arma el Date con año/mes/día explícitos (mismo criterio que
// DatePicker.parseLocalDate) para evitar esa conversión.
export function formatFechaSolo(fechaISO) {
  const [year, month, day] = fechaISO.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// Schedule.hora_inicio/hora_fin viajan como Date @db.Time serializado a ISO sobre una fecha
// de referencia fija (ej. "1970-01-01T09:00:00.000Z"); el backend fuerza 'Z', así que extraer
// los caracteres 11-16 da la hora real sin ninguna conversión de huso horario.
export function formatHora(value) {
  return typeof value === 'string' ? value.slice(11, 16) : '';
}

export const ESTADO_INSCRIPCION_VARIANT = {
  pendiente: 'pendiente',
  confirmada: 'revisado',
  rechazada: 'rechazado',
  cancelada: 'default',
};
