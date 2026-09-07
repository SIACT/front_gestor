import { InlineMath } from 'react-katex';

const PATRON_FORMULA = /\$([^$]+)\$/g;

// String.split con un regex de un solo grupo de captura intercala
// [textoPlano, formula, textoPlano, formula, ..., textoPlano]: los índices
// impares son siempre el contenido capturado (la fórmula, sin los signos $).
function renderSegmentos(fragmento) {
  return fragmento.split(PATRON_FORMULA).map((parte, index) =>
    index % 2 === 1 ? (
      <InlineMath key={index} math={parte} renderError={() => `$${parte}$`} />
    ) : (
      parte
    ),
  );
}

// text-justify solo se ve bien por bloque (<p>), y CSS justifica toda línea de
// un bloque salvo la última — eso incluye líneas cortadas por un salto de línea
// forzado, no solo las que el navegador envuelve solo. Un \n suelto (frecuente
// en texto pegado desde PDF) se reintegra como espacio para que sea el propio
// navegador quien decida dónde cortar cada línea; solo un salto de línea doble
// (párrafo real) genera un <p> nuevo, cuya última línea sí queda sin estirar.
export function TextoConFormulas({ texto }) {
  if (!texto) return null;

  const parrafos = texto
    .trim()
    .split(/\n{2,}/)
    .map((parrafo) => parrafo.replace(/\n/g, ' ').trim());

  return (
    <>
      {parrafos.map((parrafo, index) => (
        <p key={index} className={index > 0 ? 'mt-3' : undefined}>
          {renderSegmentos(parrafo)}
        </p>
      ))}
    </>
  );
}
