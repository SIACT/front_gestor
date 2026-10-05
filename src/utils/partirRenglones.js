// Margen para el redondeo de punto flotante al comparar anchos (mismo que el generador de PDF).
const TOLERANCIA = 0.001;

// Reparte un texto en renglones que caben en anchoMaximo. Es la MISMA regla que usa el backend al
// generar el PDF (generarPdf.service.js → partirEnRenglones), para que el visor parta igual:
// - espacios, tabulaciones y saltos de línea se colapsan en un solo espacio; extremos recortados
// - voraz por palabras: una palabra entra si "renglón + ' ' + palabra" (sin espacio final) cabe
// - una palabra más ancha que la caja se parte por caracteres, con al menos 1 carácter por trozo
//   (aunque esa letra sola no quepa), así el bucle siempre avanza
// - los renglones nunca llevan espacios al inicio ni al final
//
// medir(cadena) devuelve el ancho en las mismas unidades que anchoMaximo. Función pura: la
// medición se inyecta para poder probarla sin canvas.
export function partirEnRenglones(texto, anchoMaximo, medir) {
  const limpio = String(texto ?? '').replace(/\s+/g, ' ').trim();
  if (!limpio) return [''];
  const cabe = (s) => medir(s) <= anchoMaximo + TOLERANCIA;

  const renglones = [];
  let actual = '';
  for (const palabra of limpio.split(' ')) {
    const candidato = actual ? `${actual} ${palabra}` : palabra;
    if (cabe(candidato)) {
      actual = candidato;
      continue;
    }
    if (actual) renglones.push(actual);

    // [...palabra] y no palabra.split(''): no parte en dos un carácter fuera del plano básico (emoji)
    let resto = [...palabra];
    while (resto.length > 1 && !cabe(resto.join(''))) {
      let n = 1;
      while (n < resto.length - 1 && cabe(resto.slice(0, n + 1).join(''))) n++;
      renglones.push(resto.slice(0, n).join(''));
      resto = resto.slice(n);
    }
    actual = resto.join('');
  }
  renglones.push(actual);
  return renglones;
}
