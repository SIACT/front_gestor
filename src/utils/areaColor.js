// Asigna a cada área temática una de las variantes categóricas de Badge, de forma
// determinística por nombre (mismo nombre => siempre el mismo color, sin depender de la
// posición del área dentro de la lista que se esté renderizando en un momento dado).
const AREA_BADGE_VARIANTS = ['area-blue', 'area-teal', 'area-pink', 'area-indigo', 'area-cyan', 'area-purple'];

export function getAreaBadgeVariant(nombreArea) {
  if (!nombreArea) return 'default';

  let hash = 0;
  for (let i = 0; i < nombreArea.length; i++) {
    hash = (hash * 31 + nombreArea.charCodeAt(i)) | 0;
  }

  return AREA_BADGE_VARIANTS[Math.abs(hash) % AREA_BADGE_VARIANTS.length];
}
