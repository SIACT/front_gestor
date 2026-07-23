export function capitalizar(str) {
  if (!str) return str;
  return str
    .split(' ')
    .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1))
    .join(' ');
}
