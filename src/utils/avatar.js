const DICEBEAR_BASE = 'https://api.dicebear.com/9.x/avataaars/svg';

export function avatarUrlDesdeSeed(seed) {
  return `${DICEBEAR_BASE}?seed=${encodeURIComponent(seed)}`;
}

export function obtenerSeedAvatar(user) {
  if (!user) return null;
  return localStorage.getItem(`avatar-seed-${user.id_usuario}`) || user.correo;
}

export function obtenerAvatarUrl(user) {
  const seed = obtenerSeedAvatar(user);
  return seed ? avatarUrlDesdeSeed(seed) : null;
}
