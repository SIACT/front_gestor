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

// Para timestamps (instante exacto, ej. Talks.presento_marcado_en): fecha + hora local del
// navegador, como "15 de junio de 2026, 3:45 PM". es-CO escribe el periodo como "p. m.", así que
// se reemplaza esa parte por AM/PM; los espacios especiales (U+202F/U+00A0) se normalizan.
export function formatFechaHora(value) {
  const fecha = new Date(value);
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
    .formatToParts(fecha)
    .map((parte) => (parte.type === 'dayPeriod' ? (fecha.getHours() < 12 ? 'AM' : 'PM') : parte.value))
    .join('')
    .replace(/[\u202f\u00a0]/g, ' ');
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
  carta_compromiso: 'alerta',
  confirmada: 'revisado',
  rechazada: 'rechazado',
  cancelada: 'default',
};

export const ESTADO_INSCRIPCION_LABEL = {
  pendiente: 'Pendiente',
  carta_compromiso: 'Carta de compromiso',
  confirmada: 'Confirmada',
  rechazada: 'Rechazada',
  cancelada: 'Cancelada',
};

// Estado de inscripción en minúscula para usarlo dentro de una frase ("estado: pendiente de
// pago"). Distinto de ESTADO_INSCRIPCION_LABEL (etiquetas/filtros): aquí se explica el pago.
const ESTADO_INSCRIPCION_CLARO = {
  pendiente: 'pendiente de pago',
  carta_compromiso: 'carta de compromiso',
  rechazada: 'rechazada',
  cancelada: 'cancelada',
  confirmada: 'confirmada',
};

// Valor desconocido: se devuelve tal cual.
export function estadoInscripcionClaro(estado) {
  return ESTADO_INSCRIPCION_CLARO[estado] ?? estado;
}
