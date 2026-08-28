// Los ids numéricos de rol son el contrato estable con el backend y nunca cambian.
// Los nombres visibles sí pueden cambiar (ej. "Ponente" -> "Expositor") sin afectar
// ninguna lógica de permisos, siempre que las comparaciones usen ROLES.* y no texto.
export const ROLES = {
  ADMIN: 1,
  PONENTE: 2,
  ESTUDIANTE: 3,
  ADMIN_CONGRESO: 4,
};

// Fallback únicamente para cuando la respuesta del backend no incluya rol.nombre.
export const ROL_LABELS = {
  [ROLES.ADMIN]: 'Admin',
  [ROLES.PONENTE]: 'Expositor',
  [ROLES.ESTUDIANTE]: 'Asistente',
  [ROLES.ADMIN_CONGRESO]: 'Admin de Congreso',
};
