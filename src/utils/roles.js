// Los ids numéricos de rol son el contrato estable con el backend y nunca cambian.
// Rol de CUENTA (Usuarios.id_rol): solo define qué puede administrar. Ya NO incluye
// Expositor/Asistente — eso ahora es rol de PARTICIPACIÓN, por inscripción (ver abajo).
export const ROLES = {
  ADMIN: 1,
  ADMIN_CONGRESO: 4,
  PARTICIPANTE: 5,
};

// Rol de PARTICIPACIÓN (Inscripcion.id_rol_participacion): se elige al inscribirse a
// CADA congreso, puede ser distinto entre congresos, y no vive en la cuenta.
export const ROL_PARTICIPACION = {
  EXPOSITOR: 2,
  ASISTENTE: 3,
};

// Fallback únicamente para cuando la respuesta del backend no incluya rol.nombre.
export const ROL_LABELS = {
  [ROLES.ADMIN]: 'Admin',
  [ROLES.ADMIN_CONGRESO]: 'Admin de Congreso',
  [ROLES.PARTICIPANTE]: 'Participante',
};
