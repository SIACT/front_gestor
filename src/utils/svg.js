
// security rule of module of Certification: the SVG of a template is NEVER inserted into the DOM as markup (neither dangerouslySetInnerHTML nor innerHTML). It is always displayed as a static image via data URI: an <img> does not execute scripts or handlers that the SVG might bring, even if the backend already sanitizes it — this is an additional layer of defense.
// DOm like markup (neither dangerouslySetInnerHTML nor innerHTML). It is always displayed as a static image via data URI: an <img> does not execute scripts or handlers that the SVG might bring, even if the backend already sanitizes it — this is an additional layer of defense.
// astectic way data URI: an <img> does not execute scripts or handlers that the SVG might bring, even if the backend already sanitizes it — this is an additional layer of defense.
// the back end already sanitizes it — this is an additional layer of defense.

export function svgADataUri(svgTexto) {
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgTexto)))}`;
}

// Lee ancho/alto del viewBox con regex sobre el texto crudo (sin DOMParser ni DOM vivo).
// Acepta comillas simples o dobles y separadores de espacio o coma. null si no hay viewBox válido.
export function extraerViewBox(svgTexto) {
  const match = /viewBox\s*=\s*["']\s*-?[\d.]+[\s,]+-?[\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)\s*["']/.exec(svgTexto);
  if (!match) return null;
  const ancho = Number(match[1]);
  const alto = Number(match[2]);
  return ancho > 0 && alto > 0 ? { ancho, alto } : null;
}
