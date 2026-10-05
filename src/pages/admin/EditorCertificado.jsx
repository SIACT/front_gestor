import { useEffect, useMemo, useRef, useState } from 'react';
import { AlignCenter, AlignLeft, AlignRight, FileText, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { API_URL, apiFetch } from '../../api/client';
import { useCongreso } from '../../context/CongresoContext';
import { extraerViewBox, svgADataUri } from '../../utils/svg';
import { partirEnRenglones } from '../../utils/partirRenglones';
import { MENSAJE_FRONTEND_URL_NO_CONFIGURADA } from '../../utils/mensajesCertificacion';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Alert } from '../../components/ui/Alert';
import { PageLoader } from '../../components/ui/PageLoader';

const TIPOS = [
  { valor: 'asistencia', label: 'Certificado de Asistencia' },
  { valor: 'participacion', label: 'Certificado de Participación' },
];

// Mismas variables que valida el backend (VARIABLES_POR_TIPO).
const VARIABLES_POR_TIPO = {
  asistencia: ['nombre', 'dias_asistencia', 'nombreCongreso', 'fecha', 'codigo_verificacion'],
  participacion: ['nombre', 'titulo', 'rol', 'nombreCongreso', 'fecha', 'codigo_verificacion'],
};

const ETIQUETA_VARIABLE = {
  nombre: 'Nombre',
  dias_asistencia: 'Días de asistencia',
  nombreCongreso: 'Nombre del congreso',
  fecha: 'Fecha',
  titulo: 'Título del trabajo',
  rol: 'Rol',
  codigo_verificacion: 'Código de verificación',
};

// Código falso que usa /generar-prueba (CODIGO_VERIFICACION_PRUEBA en el backend). El servidor lo
// impone siempre, así que el visor usa el mismo para mostrar exactamente lo que saldrá en el PDF.
const CODIGO_VERIFICACION_PRUEBA = '0123456789abcdef0123';

const EJEMPLOS = {
  nombre: 'María Fernanda Gómez Rodríguez',
  dias_asistencia: '3',
  titulo: 'Aplicaciones del aprendizaje automático en la educación',
  rol: 'Autor',
  codigo_verificacion: CODIGO_VERIFICACION_PRUEBA,
};

const ALINEACIONES = [
  { valor: 'izquierda', label: 'Izquierda', icon: AlignLeft },
  { valor: 'centro', label: 'Centro', icon: AlignCenter },
  { valor: 'derecha', label: 'Derecha', icon: AlignRight },
];

// pdfkit dibuja el texto con y = línea base y x anclado según la alineación (izquierda: empieza
// en x; centro: centrado en x; derecha: termina en x). Es exactamente la semántica de text-anchor.
// En campos con ancho_maximo el PDF alinea cada renglón dentro de su caja, que equivale a anclar
// todos los renglones en x.
const TEXT_ANCHOR = { izquierda: 'start', centro: 'middle', derecha: 'end' };

// Mismo enum que el backend (FAMILIAS_FUENTE). En el PDF cada clave se traduce a la fuente estándar
// de PDF; aquí, a la pila CSS más parecida (Arial, Times New Roman y Courier New comparten métricas
// con Helvetica, Times y Courier).
const FAMILIAS = {
  helvetica: { label: 'Sans-serif (Helvetica)', css: 'Helvetica, Arial, sans-serif' },
  times: { label: 'Serif (Times)', css: "'Times New Roman', Times, serif" },
  courier: { label: 'Monoespaciada (Courier)', css: "'Courier New', Courier, monospace" },
};

// Paso entre líneas base de renglones consecutivos, en múltiplos de tamano_fuente. Es el
// currentLineHeight(true) de pdfkit, medido en PDFs reales de generar-prueba: depende de la
// variante (no solo de la familia) porque cada AFM trae su propio alto y lineGap.
const FACTOR_INTERLINEADO = {
  helvetica: { normal: 1.156, negrita: 1.19, cursiva: 1.156, negritaCursiva: 1.19 },
  times: { normal: 1.116, negrita: 1.153, cursiva: 1.1, negritaCursiva: 1.139 },
  courier: { normal: 1.055, negrita: 1.051, cursiva: 1.055, negritaCursiva: 1.051 },
};

// Descenso de la fuente (AFM, en múltiplos de tamano_fuente). El PDF solo dibuja un renglón si su
// línea base + este descenso cabe en la página; si no, recorta y cierra el último con "…".
const FACTOR_DESCENSO = { helvetica: 0.207, times: 0.217, courier: 0.157 };

// Las plantillas guardadas antes de existir estas propiedades llegan sin ellas: Helvetica normal,
// una sola línea. cursiva/negrita quedan siempre como booleanos reales y ancho_maximo como número
// o null (el backend rechaza "true" o "200" como strings).
function normalizarCampo(campo) {
  return {
    ...campo,
    familia: Object.hasOwn(FAMILIAS, campo.familia) ? campo.familia : 'helvetica',
    cursiva: campo.cursiva === true,
    negrita: campo.negrita === true,
    ancho_maximo:
      typeof campo.ancho_maximo === 'number' && Number.isFinite(campo.ancho_maximo) && campo.ancho_maximo > 0
        ? campo.ancho_maximo
        : null,
  };
}

function variante(campo) {
  if (campo.negrita && campo.cursiva) return 'negritaCursiva';
  if (campo.negrita) return 'negrita';
  if (campo.cursiva) return 'cursiva';
  return 'normal';
}

function interlineado(campo) {
  return FACTOR_INTERLINEADO[campo.familia][variante(campo)] * campo.tamano_fuente;
}

// Ancho máximo de caja que no se sale del viewBox, según dónde ancla la alineación.
function maxAnchoPermitido(alineacion, x, anchoViewbox) {
  if (alineacion === 'izquierda') return anchoViewbox - x;
  if (alineacion === 'derecha') return x;
  return 2 * Math.min(x, anchoViewbox - x); // centro
}

// Inicio de la caja según la alineación (misma regla que valida y dibuja el backend).
function xCaja(campo) {
  if (campo.alineacion === 'centro') return campo.x - campo.ancho_maximo / 2;
  if (campo.alineacion === 'derecha') return campo.x - campo.ancho_maximo;
  return campo.x;
}

// Ancho mínimo útil de una caja: por debajo de esto se desactiva el salto de línea.
const ANCHO_MINIMO = 1;

// Recorta ancho_maximo para que la caja quede dentro del viewBox (el backend rechaza lo contrario
// con POSICION_FUERA_DE_RANGO). Se redondea hacia abajo a 0.1 para no pasarse por redondeo.
function ajustarCaja(campo, anchoViewbox) {
  if (campo.ancho_maximo === null) return { campo, ajuste: null };
  const maximo = Math.floor(maxAnchoPermitido(campo.alineacion, campo.x, anchoViewbox) * 10) / 10;
  if (campo.ancho_maximo <= maximo) return { campo, ajuste: null };
  if (maximo < ANCHO_MINIMO) return { campo: { ...campo, ancho_maximo: null }, ajuste: 'desactivado' };
  return { campo: { ...campo, ancho_maximo: maximo }, ajuste: 'reducido' };
}

const AVISOS_AJUSTE = {
  reducido: 'Se ajustó el ancho máximo para que la caja no se salga de la página.',
  desactivado:
    'Se desactivó "Partir en varias líneas": el campo quedó tan cerca del borde que la caja no cabe en la página.',
};

// Canvas oculto, creado una sola vez. A tamaño N (unidades del viewBox) un <text> mide lo mismo
// que N px en canvas, así que el ancho medido ya está en unidades del viewBox, sin factor de escala.
let contextoMedicion;
function crearMedidor(campo) {
  contextoMedicion ??= document.createElement('canvas').getContext('2d');
  const tamano = campo.tamano_fuente;
  if (!contextoMedicion) return (texto) => texto.length * tamano * 0.6;
  const fuente = `${campo.cursiva ? 'italic' : 'normal'} ${campo.negrita ? 'bold' : 'normal'} ${tamano}px ${FAMILIAS[campo.familia].css}`;
  // Se fija la fuente en cada medición: el contexto es compartido entre campos.
  return (texto) => {
    contextoMedicion.font = fuente;
    return contextoMedicion.measureText(texto).width;
  };
}

// Renglones de un campo, cacheados por todo lo que afecta la partición: arrastrar un campo (cambia
// solo x/y) no vuelve a medir. El caché se vacía si crece demasiado (al escribir en los inputs).
const cacheRenglones = new Map();
function renglonesDeCampo(campo, texto) {
  if (campo.ancho_maximo === null) return [texto];
  const clave = JSON.stringify([texto, campo.ancho_maximo, campo.tamano_fuente, campo.familia, campo.cursiva, campo.negrita]);
  let renglones = cacheRenglones.get(clave);
  if (!renglones) {
    if (cacheRenglones.size > 500) cacheRenglones.clear();
    renglones = partirEnRenglones(texto, campo.ancho_maximo, crearMedidor(campo));
    cacheRenglones.set(clave, renglones);
  }
  return renglones;
}

// Igual que el PDF: el primer renglón se dibuja siempre; si la línea base del último más el
// descenso no cabe en la página, el PDF recorta y termina con "…".
function desbordaPagina(campo, renglones, altoViewbox) {
  if (campo.ancho_maximo === null || renglones.length < 2) return false;
  const ultimaBase = campo.y + (renglones.length - 1) * interlineado(campo);
  return ultimaBase + FACTOR_DESCENSO[campo.familia] * campo.tamano_fuente > altoViewbox + 0.001;
}

// ─── QR de verificación ───────────────────────────────────────────────────────
// x, y: esquina superior izquierda; tamano: lado del cuadrado, incluida la zona de silencio blanca.
const QR_TAMANO_MINIMO = 40; // el backend rechaza menos
const QR_TAMANO_INICIAL = 80;
const QR_TAMANO_RECOMENDADO = 70; // por debajo puede no leerse impreso

// Las plantillas guardadas antes de existir el QR llegan sin la propiedad: sin QR.
function normalizarQr(qr) {
  return typeof qr?.x === 'number' && typeof qr?.y === 'number' && typeof qr?.tamano === 'number' ? qr : null;
}

function limitarQr({ x, y, tamano }, anchoVB, altoVB) {
  const t = Math.max(QR_TAMANO_MINIMO, Math.min(tamano, anchoVB, altoVB));
  return {
    x: Math.min(Math.max(x, 0), anchoVB - t),
    y: Math.min(Math.max(y, 0), altoVB - t),
    tamano: t,
  };
}

const aCentesimas = (valor) => Math.round(valor * 100) / 100;
const aCentesimasAbajo = (valor) => Math.floor(valor * 100 + 1e-9) / 100;

// Coordenada redondeada a 2 decimales que garantiza inicio + tamano <= límite tal como lo compara el
// backend (sin tolerancia): redondear hacia arriba o la suma en punto flotante pueden pasarse por 1e-13.
function coordenadaQr(valor, tamano, limite) {
  let c = Math.max(0, Math.min(aCentesimas(valor), aCentesimasAbajo(limite - tamano)));
  while (c > 0 && c + tamano > limite) c = Math.max(0, aCentesimas(c - 0.01));
  return c;
}

// Todo cambio del QR pasa por aquí: limitarQr y luego 2 decimales sin salirse del viewBox.
function ajustarQr(qr, viewBox) {
  const limitado = limitarQr(qr, viewBox.ancho, viewBox.alto);
  const tamano = Math.max(QR_TAMANO_MINIMO, aCentesimasAbajo(limitado.tamano));
  return {
    x: coordenadaQr(limitado.x, tamano, viewBox.ancho),
    y: coordenadaQr(limitado.y, tamano, viewBox.alto),
    tamano,
  };
}

// Tamaño máximo sin mover la esquina superior izquierda (al redimensionar se crece hacia abajo-derecha).
function tamanoMaximoQr(qr, viewBox) {
  return Math.min(viewBox.ancho - qr.x, viewBox.alto - qr.y);
}

function redimensionarQr(qr, tamano, viewBox) {
  return ajustarQr({ ...qr, tamano: Math.min(tamano, tamanoMaximoQr(qr, viewBox)) }, viewBox);
}

// El PDF dibuja el QR encima de los textos: un campo anclado dentro de la caja no se verá.
function campoBajoQr(campo, qr) {
  return (
    qr !== null && qr.x <= campo.x && campo.x <= qr.x + qr.tamano && qr.y <= campo.y && campo.y <= qr.y + qr.tamano
  );
}

// Marcador del QR en el visor: dibujo propio (caja blanca, tres cuadros de esquina y "QR"), NO un QR
// real — el real lo genera solo el servidor al producir el PDF.
function MarcadorQr({ qr, etiqueta, radio, onPointerDown, onPointerDownTamano, onPointerMove, onPointerUp }) {
  const { x, y, tamano } = qr;
  // Proporciones aproximadas de un QR real: zona de silencio ~10% y patrón de esquina ~20% del lado.
  const silencio = tamano * 0.1;
  const esquina = tamano * 0.2;
  const modulo = esquina / 7;
  const esquinas = [
    [x + silencio, y + silencio],
    [x + tamano - silencio - esquina, y + silencio],
    [x + silencio, y + tamano - silencio - esquina],
  ];
  // La etiqueta va encima de la caja; si no cabe arriba, debajo; si tampoco, dentro (abajo).
  const yEtiqueta = y - etiqueta.margen >= etiqueta.tamano ? y - etiqueta.margen : y + tamano + etiqueta.tamano + etiqueta.margen;
  const etiquetaDentro = yEtiqueta > etiqueta.altoViewbox;
  const punteros = { onPointerMove, onPointerUp, onPointerCancel: onPointerUp };

  return (
    <g>
      <g
        role="button"
        tabIndex={0}
        aria-label="QR de verificación"
        className="cursor-move touch-none outline-none"
        onPointerDown={onPointerDown}
        {...punteros}
      >
        <rect
          x={x}
          y={y}
          width={tamano}
          height={tamano}
          fill="#ffffff"
          stroke="#6b7280"
          strokeWidth={1}
          strokeDasharray="6 4"
          vectorEffect="non-scaling-stroke"
        />
        {esquinas.map(([ex, ey]) => (
          <g key={`${ex}-${ey}`} pointerEvents="none">
            <rect x={ex} y={ey} width={esquina} height={esquina} fill="#9ca3af" />
            <rect x={ex + modulo} y={ey + modulo} width={esquina - 2 * modulo} height={esquina - 2 * modulo} fill="#ffffff" />
            <rect x={ex + 2 * modulo} y={ey + 2 * modulo} width={esquina - 4 * modulo} height={esquina - 4 * modulo} fill="#9ca3af" />
          </g>
        ))}
        <text
          x={x + tamano / 2}
          y={y + tamano / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="Helvetica, Arial, sans-serif"
          fontWeight="bold"
          fontSize={tamano * 0.22}
          fill="#6b7280"
          pointerEvents="none"
        >
          QR
        </text>
      </g>
      <text
        x={x + tamano / 2}
        y={etiquetaDentro ? y + tamano - etiqueta.margen : yEtiqueta}
        textAnchor="middle"
        fontFamily="Helvetica, Arial, sans-serif"
        fontSize={etiqueta.tamano}
        fill="#374151"
        stroke="#ffffff"
        strokeWidth={3}
        paintOrder="stroke"
        vectorEffect="non-scaling-stroke"
        pointerEvents="none"
      >
        QR de verificación
      </text>
      {/* Tirador de tamaño: esquina inferior derecha */}
      <rect
        role="slider"
        aria-label="Tamaño del QR"
        aria-valuenow={tamano}
        x={x + tamano - radio * 1.5}
        y={y + tamano - radio * 1.5}
        width={radio * 3}
        height={radio * 3}
        rx={radio * 0.5}
        fill="var(--c-accent)"
        stroke="#ffffff"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
        className="cursor-nwse-resize touch-none"
        onPointerDown={onPointerDownTamano}
        {...punteros}
      />
    </g>
  );
}

function PropiedadesQr({ qr, maximo, onCambiarTamano, onQuitar }) {
  // Mismo patrón de borrador que el ancho máximo: mientras se escribe ("1" camino de "120") no se
  // fuerza el mínimo; al estado solo llegan números >= 40 y al salir del input se aplica el límite.
  const [borrador, setBorrador] = useState(String(qr.tamano));
  const [tamanoPrevio, setTamanoPrevio] = useState(qr.tamano);
  if (qr.tamano !== tamanoPrevio) {
    setTamanoPrevio(qr.tamano);
    setBorrador(String(qr.tamano));
  }

  function handleTamano(e) {
    const texto = e.target.value;
    setBorrador(texto);
    const numero = Number(texto);
    if (texto.trim() !== '' && Number.isFinite(numero) && numero >= QR_TAMANO_MINIMO) onCambiarTamano(numero);
  }

  function handleBlur() {
    const numero = Number(borrador);
    if (borrador.trim() !== '' && Number.isFinite(numero)) onCambiarTamano(numero);
    setBorrador(String(qr.tamano));
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <Rotulo>QR de verificación</Rotulo>
          <p className="mt-1.5 text-xs text-text-muted">
            x {qr.x} · y {qr.y}
          </p>
        </div>
        <div className="w-28">
          <Input
            label="Tamaño"
            type="number"
            min={QR_TAMANO_MINIMO}
            max={maximo}
            step={1}
            value={borrador}
            onChange={handleTamano}
            onBlur={handleBlur}
          />
        </div>
        <Button type="button" size="sm" variant="ghost" onClick={onQuitar} className="text-error-text">
          <Trash2 className="size-4" />
          Quitar QR
        </Button>
      </div>
      <p className="text-xs text-text-muted">
        El QR se imprime sobre un recuadro blanco de este tamaño. Deja ese espacio libre en tu diseño.
      </p>
      {qr.tamano < QR_TAMANO_RECOMENDADO && (
        <Alert variant="warning">QR pequeño: puede no leerse al imprimir. Recomendado: 80 o más.</Alert>
      )}
    </div>
  );
}

// Alto máximo de la vista previa: un SVG vertical no debe obligar a hacer scroll para ubicar campos.
const ALTO_MAXIMO_VISTA = 640;

// Misma fecha que pone el backend al emitir (es-CO, hora de Bogotá).
function fechaDeHoy() {
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Bogota',
  }).format(new Date());
}

function valoresEjemplo(tipo, nombreCongreso) {
  const valores = { ...EJEMPLOS, nombreCongreso: nombreCongreso ?? '', fecha: fechaDeHoy() };
  return Object.fromEntries(VARIABLES_POR_TIPO[tipo].map((v) => [v, valores[v]]));
}

// Lo guardado/cargado se compara serializado para saber si hay cambios pendientes.
function serializarPlantilla(svgTexto, viewBox, campos, qr) {
  return JSON.stringify({ svgTexto, viewBox, campos, qr });
}

function limitar(valor, max) {
  return Math.min(Math.max(valor, 0), max);
}

function redondear(valor) {
  return Math.round(valor * 10) / 10;
}

function Rotulo({ children }) {
  return <p className="text-xs font-medium uppercase tracking-wide text-text-muted">{children}</p>;
}

function textoAncho(ancho) {
  return ancho === null ? '' : String(ancho);
}

function PropiedadesCampo({ campo, anchoViewbox, bajoQr, onCambiar, onEliminar }) {
  const multilinea = campo.ancho_maximo !== null;
  const maximo = Math.floor(maxAnchoPermitido(campo.alineacion, campo.x, anchoViewbox) * 10) / 10;

  // El input numérico entrega strings y puede quedar vacío mientras se escribe: el borrador vive
  // aquí y al campo solo llega un número válido. Si ancho_maximo cambia desde fuera (ajuste al
  // arrastrar o con el tirador), el borrador se sincroniza.
  const [borrador, setBorrador] = useState(textoAncho(campo.ancho_maximo));
  const [anchoPrevio, setAnchoPrevio] = useState(campo.ancho_maximo);
  if (campo.ancho_maximo !== anchoPrevio) {
    setAnchoPrevio(campo.ancho_maximo);
    setBorrador(textoAncho(campo.ancho_maximo));
  }

  function handleAncho(e) {
    const texto = e.target.value;
    setBorrador(texto);
    const numero = Number(texto);
    if (texto.trim() !== '' && Number.isFinite(numero) && numero > 0) onCambiar({ ancho_maximo: numero });
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
      {bajoQr && <Alert variant="warning">Este campo queda debajo del QR y no se verá.</Alert>}
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <Rotulo>Campo</Rotulo>
          <p className="mt-1.5 font-mono text-sm text-text-primary">{`{${campo.variable}}`}</p>
          <p className="text-xs text-text-muted">
            x {redondear(campo.x)} · y {redondear(campo.y)}
          </p>
        </div>
        <div className="w-56">
          <Select label="Tipo de letra" value={campo.familia} onChange={(e) => onCambiar({ familia: e.target.value })}>
            {Object.entries(FAMILIAS).map(([clave, { label }]) => (
              <option key={clave} value={clave}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-text-muted">Estilo</span>
          {/* Booleanos directos (!campo.x), nunca e.target.value: el backend rechaza "true" como string. */}
          <div className="flex gap-1" role="group" aria-label="Estilo">
            <Button
              type="button"
              size="sm"
              variant={campo.negrita ? 'primary' : 'secondary'}
              aria-pressed={campo.negrita}
              aria-label="Negrita"
              title="Negrita"
              onClick={() => onCambiar({ negrita: !campo.negrita })}
              className="w-9 font-bold"
            >
              N
            </Button>
            <Button
              type="button"
              size="sm"
              variant={campo.cursiva ? 'primary' : 'secondary'}
              aria-pressed={campo.cursiva}
              aria-label="Cursiva"
              title="Cursiva"
              onClick={() => onCambiar({ cursiva: !campo.cursiva })}
              className="w-9 italic"
            >
              K
            </Button>
          </div>
        </div>
        <div className="w-28">
          <Input
            label="Tamaño"
            type="number"
            min={1}
            step={1}
            value={campo.tamano_fuente}
            onChange={(e) => onCambiar({ tamano_fuente: Number(e.target.value) })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium uppercase tracking-wide text-text-muted" htmlFor="color-campo">
            Color
          </label>
          <input
            id="color-campo"
            type="color"
            value={campo.color}
            onChange={(e) => onCambiar({ color: e.target.value })}
            className="h-8 w-14 cursor-pointer rounded-lg border border-border bg-surface p-0.5"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-text-muted">Alineación</span>
          <div className="flex gap-1" role="group" aria-label="Alineación">
            {ALINEACIONES.map(({ valor, label, icon: Icono }) => (
              <Button
                key={valor}
                type="button"
                size="sm"
                variant={campo.alineacion === valor ? 'primary' : 'secondary'}
                aria-pressed={campo.alineacion === valor}
                aria-label={label}
                title={label}
                onClick={() => onCambiar({ alineacion: valor })}
              >
                <Icono className="size-4" />
              </Button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="flex items-center gap-2 text-sm text-text-primary">
            <input
              type="checkbox"
              checked={multilinea}
              disabled={!multilinea && maximo < ANCHO_MINIMO}
              onChange={(e) =>
                onCambiar({
                  ancho_maximo: e.target.checked
                    ? Math.max(ANCHO_MINIMO, Math.floor(Math.min(maximo, 0.6 * anchoViewbox)))
                    : null,
                })
              }
              className="size-4 cursor-pointer accent-accent"
            />
            Partir en varias líneas
          </label>
          <div className="w-36">
            <Input
              label="Ancho máximo"
              type="number"
              min={ANCHO_MINIMO}
              max={maximo}
              step={1}
              disabled={!multilinea}
              value={multilinea ? borrador : ''}
              onChange={handleAncho}
              onBlur={() => setBorrador(textoAncho(campo.ancho_maximo))}
            />
          </div>
        </div>
        <Button type="button" size="sm" variant="ghost" onClick={onEliminar} className="text-error-text" aria-label="Eliminar campo">
          <Trash2 className="size-4" />
          Eliminar campo
        </Button>
      </div>
    </div>
  );
}

export function EditorCertificado() {
  const { congreso } = useCongreso();
  const idCongreso = congreso?.id_congreso;

  const [tipo, setTipo] = useState('asistencia');
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');
  const [existe, setExiste] = useState(false);

  const [svgTexto, setSvgTexto] = useState('');
  const [viewBox, setViewBox] = useState(null);
  const [campos, setCampos] = useState([]);
  const [qr, setQr] = useState(null);
  const [snapshot, setSnapshot] = useState(() => serializarPlantilla('', null, [], null));
  const [seleccionado, setSeleccionado] = useState(null);
  const [variableAAgregar, setVariableAAgregar] = useState('');
  const [modoAgregar, setModoAgregar] = useState(false);
  const [colocandoQr, setColocandoQr] = useState(false);
  const [avisoCaja, setAvisoCaja] = useState(null);

  const [errorArchivo, setErrorArchivo] = useState('');
  const [errorGuardar, setErrorGuardar] = useState('');
  const [exito, setExito] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [eliminarAbierto, setEliminarAbierto] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState('');

  // Los mismos valores alimentan el visor y el POST de generar-prueba: así la comparación es justa.
  const [variablesPrueba, setVariablesPrueba] = useState(() => valoresEjemplo('asistencia', congreso?.nombre));
  const [pdfUrl, setPdfUrl] = useState(null);
  const [generando, setGenerando] = useState(false);
  const [errorPdf, setErrorPdf] = useState('');

  const overlayRef = useRef(null);
  const arrastreRef = useRef(null);
  // Copia de la URL vigente para poder liberarla al desmontar (el cleanup no ve el state actual).
  const pdfUrlRef = useRef(null);
  const ultimaPeticionPdf = useRef(0);

  const hayCambios = serializarPlantilla(svgTexto, viewBox, campos, qr) !== snapshot;

  const renglonesPorCampo = useMemo(
    () => campos.map((campo) => renglonesDeCampo(campo, variablesPrueba[campo.variable] ?? '')),
    [campos, variablesPrueba],
  );
  const camposDesbordados = viewBox
    ? campos.filter((campo, i) => desbordaPagina(campo, renglonesPorCampo[i], viewBox.alto))
    : [];

  // Aviso breve y no bloqueante: desaparece solo. La clave reinicia el temporizador si se repite.
  useEffect(() => {
    if (!avisoCaja) return;
    const temporizador = setTimeout(() => setAvisoCaja(null), 4000);
    return () => clearTimeout(temporizador);
  }, [avisoCaja]);

  function mostrarAvisoCaja(ajuste) {
    setAvisoCaja({ texto: AVISOS_AJUSTE[ajuste], clave: Date.now() });
  }

  // Cada blob URL retiene el PDF en memoria hasta que se revoca: se libera la anterior siempre.
  function reemplazarPdfUrl(nueva) {
    if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
    pdfUrlRef.current = nueva;
    setPdfUrl(nueva);
  }

  useEffect(
    () => () => {
      // Una respuesta que llegue después de desmontar se descarta (y su URL se revoca al crearse).
      ultimaPeticionPdf.current += 1;
      if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
    },
    [],
  );

  function reiniciarEditor() {
    setSvgTexto('');
    setViewBox(null);
    setCampos([]);
    setQr(null);
    setSnapshot(serializarPlantilla('', null, [], null));
    setSeleccionado(null);
    setModoAgregar(false);
    setColocandoQr(false);
    setErrorArchivo('');
    setErrorGuardar('');
    setAvisoCaja(null);
  }

  useEffect(() => {
    setCargando(true);
    setErrorCarga('');
    setExito('');
    reiniciarEditor();
    setVariableAAgregar('');
    apiFetch(`/congresos/${idCongreso}/certificacion/plantillas/${tipo}`)
      .then((plantilla) => {
        setExiste(Boolean(plantilla));
        if (!plantilla) return;
        const dimensiones = { ancho: Number(plantilla.ancho_viewbox), alto: Number(plantilla.alto_viewbox) };
        // Normalizados ANTES del snapshot: una plantilla antigua no debe aparecer con cambios pendientes.
        const camposCargados = Array.isArray(plantilla.campos) ? plantilla.campos.map(normalizarCampo) : [];
        const qrCargado = normalizarQr(plantilla.qr);
        setSvgTexto(plantilla.svg_contenido);
        setViewBox(dimensiones);
        setCampos(camposCargados);
        setQr(qrCargado);
        setSnapshot(serializarPlantilla(plantilla.svg_contenido, dimensiones, camposCargados, qrCargado));
      })
      .catch((err) => setErrorCarga(err.message))
      .finally(() => setCargando(false));
  }, [idCongreso, tipo]);

  function handleCambiarTipo(nuevoTipo) {
    setTipo(nuevoTipo);
    setVariablesPrueba(valoresEjemplo(nuevoTipo, congreso?.nombre));
    // El PDF del otro tipo ya no corresponde a lo que se está editando.
    reemplazarPdfUrl(null);
    setErrorPdf('');
  }

  function handleArchivo(e) {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (!archivo) return;
    setErrorArchivo('');
    setExito('');
    const lector = new FileReader();
    lector.onload = () => {
      const texto = String(lector.result ?? '');
      if (!/<svg[\s>]/i.test(texto)) {
        setErrorArchivo('El archivo no parece un SVG (falta la etiqueta <svg>).');
        return;
      }
      const dimensiones = extraerViewBox(texto);
      if (!dimensiones) {
        setErrorArchivo('El SVG debe tener un atributo viewBox (ej. viewBox="0 0 800 600") para poder ubicar los campos.');
        return;
      }
      // Los campos ya ubicados se conservan si siguen dentro del nuevo viewBox, con su caja recortada
      // si el nuevo viewBox es más angosto.
      const dentro = campos.filter((c) => c.x <= dimensiones.ancho && c.y <= dimensiones.alto);
      if (dentro.length < campos.length) {
        setErrorArchivo(
          `Se quitaron ${campos.length - dentro.length} campo(s) que quedaban fuera del viewBox del nuevo SVG.`,
        );
      }
      const ajustados = dentro.map((c) => ajustarCaja(c, dimensiones.ancho));
      const ajuste = ajustados.find((a) => a.ajuste)?.ajuste;
      if (ajuste) mostrarAvisoCaja(ajuste);
      setSvgTexto(texto);
      setViewBox(dimensiones);
      setCampos(ajustados.map((a) => a.campo));
      // El QR se conserva, movido o achicado si el nuevo viewBox es menor (o se quita si ni el mínimo cabe).
      setQr((prev) =>
        prev && Math.min(dimensiones.ancho, dimensiones.alto) >= QR_TAMANO_MINIMO ? ajustarQr(prev, dimensiones) : null,
      );
      setSeleccionado(null);
    };
    lector.onerror = () => setErrorArchivo('No se pudo leer el archivo.');
    lector.readAsText(archivo);
  }

  // Puntero → unidades del viewBox. El <svg> superpuesto tiene la misma proporción que el viewBox,
  // así que basta una regla de tres sobre su rectángulo en pantalla.
  function aCoordenadasViewBox(e) {
    const rect = overlayRef.current.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * viewBox.ancho,
      y: ((e.clientY - rect.top) / rect.height) * viewBox.alto,
    };
  }

  function handleClicLienzo(e) {
    if (colocandoQr) {
      // Centrado en el clic y limitado al viewBox.
      const { x, y } = aCoordenadasViewBox(e);
      const mitad = QR_TAMANO_INICIAL / 2;
      setQr(ajustarQr({ x: x - mitad, y: y - mitad, tamano: QR_TAMANO_INICIAL }, viewBox));
      setColocandoQr(false);
      setExito('');
      return;
    }
    if (!modoAgregar || !variableAAgregar) {
      setSeleccionado(null);
      return;
    }
    const { x, y } = aCoordenadasViewBox(e);
    setCampos((prev) => [
      ...prev,
      normalizarCampo({
        variable: variableAAgregar,
        x: redondear(limitar(x, viewBox.ancho)),
        y: redondear(limitar(y, viewBox.alto)),
        tamano_fuente: 24,
        color: '#000000',
        alineacion: 'centro',
      }),
    ]);
    setSeleccionado(campos.length);
    setModoAgregar(false);
    setExito('');
  }

  // Todo cambio de un campo pasa por aquí: mover, cambiar alineación o editar el ancho recalcula el
  // máximo permitido, así nunca queda en el estado una caja que el backend rechazaría.
  function actualizarCampo(indice, cambios) {
    const { campo, ajuste } = ajustarCaja({ ...campos[indice], ...cambios }, viewBox.ancho);
    setCampos((prev) => prev.map((c, i) => (i === indice ? campo : c)));
    if (ajuste) mostrarAvisoCaja(ajuste);
    setExito('');
  }

  function eliminarCampo(indice) {
    setCampos((prev) => prev.filter((_, i) => i !== indice));
    setSeleccionado(null);
    setExito('');
  }

  // Arrastre con pointer capture: el elemento sigue recibiendo pointermove aunque el puntero salga
  // de él. modo 'mover' desplaza el campo (guardando la distancia puntero-anclaje para que no
  // "salte"); modo 'ancho' cambia ancho_maximo desde el tirador de la caja.
  function iniciarArrastre(e, indice, modo) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    setSeleccionado(indice);
    const puntero = aCoordenadasViewBox(e);
    const campo = campos[indice];
    arrastreRef.current = { modo, indice, pointerId: e.pointerId, dx: puntero.x - campo.x, dy: puntero.y - campo.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  // Mismo mecanismo para el QR: 'qr-mover' desplaza la caja y 'qr-tamano' la agranda o achica desde
  // la esquina inferior derecha (la superior izquierda queda fija).
  function iniciarArrastreQr(e, modo) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    setSeleccionado(null);
    const puntero = aCoordenadasViewBox(e);
    arrastreRef.current = { modo, pointerId: e.pointerId, dx: puntero.x - qr.x, dy: puntero.y - qr.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function actualizarQr(nuevo) {
    setQr(nuevo);
    setExito('');
  }

  function handlePointerMove(e) {
    const arrastre = arrastreRef.current;
    if (!arrastre || arrastre.pointerId !== e.pointerId) return;
    const puntero = aCoordenadasViewBox(e);
    if (arrastre.modo === 'qr-mover') {
      actualizarQr(ajustarQr({ ...qr, x: puntero.x - arrastre.dx, y: puntero.y - arrastre.dy }, viewBox));
      return;
    }
    if (arrastre.modo === 'qr-tamano') {
      // Cuadrado: manda el eje en el que más se alejó el puntero de la esquina superior izquierda.
      actualizarQr(redimensionarQr(qr, Math.max(puntero.x - qr.x, puntero.y - qr.y), viewBox));
      return;
    }
    if (arrastre.modo === 'mover') {
      actualizarCampo(arrastre.indice, {
        x: redondear(limitar(puntero.x - arrastre.dx, viewBox.ancho)),
        y: redondear(limitar(puntero.y - arrastre.dy, viewBox.alto)),
      });
      return;
    }
    // En centro el cambio es simétrico: la distancia al anclaje es la mitad del ancho.
    const campo = campos[arrastre.indice];
    const ancho =
      campo.alineacion === 'izquierda'
        ? puntero.x - campo.x
        : campo.alineacion === 'derecha'
          ? campo.x - puntero.x
          : 2 * Math.abs(puntero.x - campo.x);
    actualizarCampo(arrastre.indice, { ancho_maximo: Math.max(ANCHO_MINIMO, redondear(ancho)) });
  }

  function terminarArrastre(e) {
    if (arrastreRef.current?.pointerId === e.pointerId) arrastreRef.current = null;
  }

  // Lanza el error del backend (con el campo culpable ya seleccionado) para que quien llama decida
  // dónde mostrarlo.
  async function guardarPlantilla() {
    const camposEnviados = campos;
    const qrEnviado = qr;
    const dimensiones = viewBox;
    setGuardando(true);
    setExito('');
    try {
      const plantilla = await apiFetch(`/congresos/${idCongreso}/certificacion/plantillas/${tipo}`, {
        method: 'PUT',
        body: JSON.stringify({
          svg_contenido: svgTexto,
          ancho_viewbox: dimensiones.ancho,
          alto_viewbox: dimensiones.alto,
          campos: camposEnviados,
          // El PUT reemplaza la plantilla completa: sin qr el backend borraría el guardado. Siempre
          // el actual (o null para quitarlo).
          qr: qrEnviado,
        }),
      });
      // El backend devuelve el SVG ya saneado: se muestra ese, que es el que se usará en el PDF.
      setSvgTexto(plantilla.svg_contenido);
      setSnapshot(serializarPlantilla(plantilla.svg_contenido, dimensiones, camposEnviados, qrEnviado));
      setExiste(true);
      setExito('Plantilla guardada.');
    } catch (err) {
      // VALIDATION_ERROR / POSICION_FUERA_DE_RANGO / VARIABLE_INVALIDA traen "campos[i] (variable): ..."
      // en el mensaje: se selecciona ese campo para que el Admin lo ubique de inmediato.
      const indice = /campos\[(\d+)\]/.exec(err.message ?? '');
      if (indice && camposEnviados[Number(indice[1])]) setSeleccionado(Number(indice[1]));
      throw err;
    } finally {
      setGuardando(false);
    }
  }

  async function handleGuardar() {
    setErrorGuardar('');
    try {
      await guardarPlantilla();
    } catch (err) {
      setErrorGuardar(err.message);
    }
  }

  async function handleGenerarPdf() {
    const peticion = ++ultimaPeticionPdf.current;
    const esVigente = () => peticion === ultimaPeticionPdf.current;
    setGenerando(true);
    setErrorPdf('');
    setErrorGuardar('');
    try {
      // generar-prueba usa la plantilla GUARDADA: los cambios pendientes se guardan primero.
      if (svgTexto && viewBox && hayCambios) {
        try {
          await guardarPlantilla();
        } catch (err) {
          if (esVigente()) setErrorPdf(`No se generó el PDF porque no se pudo guardar la plantilla: ${err.message}`);
          return;
        }
      }

      // fetch directo (no apiFetch): la respuesta exitosa es binaria y apiFetch la parsearía como JSON.
      const res = await fetch(`${API_URL}/congresos/${idCongreso}/certificacion/generar-prueba`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo, variables: variablesPrueba }),
      });

      if (!res.ok) {
        // En error el cuerpo sí es JSON con el formato estándar { error: { code, message } }.
        const body = await res.json().catch(() => null);
        if (!esVigente()) return;
        const code = body?.error?.code;
        setErrorPdf(
          code === 'PLANTILLA_NOT_FOUND'
            ? 'Guarda primero la plantilla de este tipo.'
            : code === 'FRONTEND_URL_NO_CONFIGURADA'
              ? MENSAJE_FRONTEND_URL_NO_CONFIGURADA
              : (body?.error?.message ?? 'No se pudo generar el PDF de prueba.'),
        );
        return;
      }

      const url = URL.createObjectURL(await res.blob());
      if (!esVigente()) {
        URL.revokeObjectURL(url);
        return;
      }
      reemplazarPdfUrl(url);
    } catch (err) {
      if (esVigente()) setErrorPdf(err.message);
    } finally {
      if (esVigente()) setGenerando(false);
    }
  }

  async function handleEliminar() {
    setEliminando(true);
    setErrorEliminar('');
    try {
      await apiFetch(`/congresos/${idCongreso}/certificacion/plantillas/${tipo}`, { method: 'DELETE' });
      setEliminarAbierto(false);
      setExiste(false);
      reiniciarEditor();
      reemplazarPdfUrl(null);
      setExito('Plantilla eliminada.');
    } catch (err) {
      setErrorEliminar(err.message);
    } finally {
      setEliminando(false);
    }
  }

  const tipoLabel = TIPOS.find((t) => t.valor === tipo)?.label;
  // Visor y PDF comparten proporción (la del viewBox) y ancho máximo, para compararlos lado a lado.
  const estiloLienzo = viewBox
    ? { aspectRatio: `${viewBox.ancho} / ${viewBox.alto}`, maxWidth: (ALTO_MAXIMO_VISTA * viewBox.ancho) / viewBox.alto }
    : undefined;
  const radioAnclaje = viewBox ? Math.max(viewBox.ancho, viewBox.alto) / 250 : 0;

  return (
    <div className="flex flex-col gap-6 pt-6">
      <div>
        <h1 className="font-sans text-2xl font-bold text-text-primary">Editor de certificados</h1>
        <p className="mt-1 text-sm text-text-muted">
          Sube el diseño en SVG y ubica sobre él los campos que se llenarán con los datos de cada persona.
        </p>
      </div>

      <div className="w-72">
        <Select
          label="Tipo de certificado"
          value={tipo}
          disabled={guardando || generando}
          onChange={(e) => handleCambiarTipo(e.target.value)}
        >
          {TIPOS.map((t) => (
            <option key={t.valor} value={t.valor}>
              {t.label}
            </option>
          ))}
        </Select>
      </div>

      {cargando ? (
        <PageLoader />
      ) : errorCarga ? (
        <Alert variant="error">{errorCarga}</Alert>
      ) : (
        <Card className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="archivo-svg" className="text-xs font-medium uppercase tracking-wide text-text-muted">
              {svgTexto ? 'Reemplazar diseño (SVG)' : 'Diseño del certificado (SVG)'}
            </label>
            <input
              id="archivo-svg"
              type="file"
              accept=".svg,image/svg+xml"
              onChange={handleArchivo}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-muted file:mr-3 file:rounded-md file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-background hover:file:bg-accent-hover"
            />
            {errorArchivo && <Alert variant="error">{errorArchivo}</Alert>}
          </div>

          {svgTexto && (
            <>
              <div className="flex flex-wrap items-end gap-3">
                <div className="w-56">
                  <Select
                    label="Variable a agregar"
                    value={variableAAgregar}
                    onChange={(e) => {
                      setVariableAAgregar(e.target.value);
                      setModoAgregar(false);
                    }}
                  >
                    <option value="">Selecciona una variable</option>
                    {VARIABLES_POR_TIPO[tipo].map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </Select>
                </div>
                <Button
                  type="button"
                  variant={modoAgregar ? 'primary' : 'secondary'}
                  disabled={!variableAAgregar}
                  onClick={() => {
                    setModoAgregar((v) => !v);
                    setColocandoQr(false);
                  }}
                >
                  {modoAgregar ? 'Cancelar: no agregar campo' : 'Agregar campo: clic en la imagen para ubicarlo'}
                </Button>
                {qr === null && (
                  <Button
                    type="button"
                    variant={colocandoQr ? 'primary' : 'secondary'}
                    disabled={!viewBox || Math.min(viewBox.ancho, viewBox.alto) < QR_TAMANO_MINIMO}
                    onClick={() => {
                      setColocandoQr((v) => !v);
                      setModoAgregar(false);
                    }}
                  >
                    {colocandoQr ? 'Cancelar: no agregar QR' : 'Agregar QR de verificación'}
                  </Button>
                )}
              </div>
              {colocandoQr && <Alert variant="info">Haz clic sobre la imagen para ubicar el QR</Alert>}
              {modoAgregar && (
                <Alert variant="info">
                  Haz clic en el punto de la imagen donde va {`{${variableAAgregar}}`}. Ese punto es la línea
                  base del texto; con alineación &ldquo;centro&rdquo; el texto queda centrado sobre él.
                </Alert>
              )}
            </>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Rotulo>Visor del editor</Rotulo>
              {!svgTexto || !viewBox ? (
                <p className="text-sm text-text-muted">
                  Aún no hay plantilla para el {tipoLabel?.toLowerCase()}. Sube un SVG para empezar.
                </p>
              ) : (
                <>
                  <div
                    className="relative w-full select-none overflow-hidden rounded-lg border border-border bg-white"
                    style={estiloLienzo}
                  >
                    {/* SVG de la plantilla SIEMPRE como imagen estática (data URI), nunca como markup en el DOM. */}
                    <img
                      src={svgADataUri(svgTexto)}
                      alt={`Diseño del ${tipoLabel?.toLowerCase()}`}
                      draggable={false}
                      className="absolute inset-0 size-full"
                    />
                    {/* Capa propia: solo <rect>/<text>/<tspan>/<circle> generados aquí, nunca contenido del SVG
                        subido. Comparte viewBox con la imagen, así que x/y van en unidades del viewBox sin escalar. */}
                    <svg
                      ref={overlayRef}
                      viewBox={`0 0 ${viewBox.ancho} ${viewBox.alto}`}
                      className={clsx('absolute inset-0 size-full', (modoAgregar || colocandoQr) && 'cursor-crosshair')}
                    >
                      <rect width={viewBox.ancho} height={viewBox.alto} fill="transparent" onClick={handleClicLienzo} />
                      {campos.map((campo, indice) => {
                        const renglones = renglonesPorCampo[indice];
                        const tamano = campo.tamano_fuente;
                        const paso = interlineado(campo);
                        const multilinea = campo.ancho_maximo !== null;
                        const activo = seleccionado === indice;
                        const desborda = desbordaPagina(campo, renglones, viewBox.alto);
                        const margen = tamano * 0.15;

                        // Caja: de un poco por encima de la primera línea base (y - tamaño) hasta el
                        // descenso de la última. Sin ancho_maximo, el área de agarre mide el texto.
                        const arriba = campo.y - tamano;
                        const abajo = campo.y + (renglones.length - 1) * paso + FACTOR_DESCENSO[campo.familia] * tamano;
                        let cajaX;
                        let cajaAncho;
                        if (multilinea) {
                          cajaX = xCaja(campo);
                          cajaAncho = campo.ancho_maximo;
                        } else {
                          cajaAncho = Math.max(crearMedidor(campo)(renglones[0]), tamano);
                          cajaX =
                            campo.alineacion === 'izquierda'
                              ? campo.x
                              : campo.alineacion === 'derecha'
                                ? campo.x - cajaAncho
                                : campo.x - cajaAncho / 2;
                        }
                        // El tirador va en el borde libre: el derecho, salvo en "derecha" (ahí x es el borde derecho).
                        const xTirador = campo.alineacion === 'derecha' ? cajaX : cajaX + cajaAncho;

                        return (
                          <g key={indice}>
                            {multilinea && (
                              <rect
                                x={cajaX}
                                y={arriba}
                                width={cajaAncho}
                                height={abajo - arriba}
                                fill="none"
                                stroke={desborda ? '#dc2626' : '#6b7280'}
                                strokeOpacity={desborda ? 0.9 : 0.5}
                                strokeWidth={1}
                                strokeDasharray="6 4"
                                vectorEffect="non-scaling-stroke"
                                pointerEvents="none"
                              />
                            )}
                            <g
                              role="button"
                              tabIndex={0}
                              aria-label={`Campo ${campo.variable}`}
                              className="cursor-move touch-none outline-none"
                              onPointerDown={(e) => iniciarArrastre(e, indice, 'mover')}
                              onPointerMove={handlePointerMove}
                              onPointerUp={terminarArrastre}
                              onPointerCancel={terminarArrastre}
                              onKeyDown={(e) => e.key === 'Enter' && setSeleccionado(indice)}
                            >
                              {/* Área de agarre: cubre todos los renglones (ascendentes y descendentes). */}
                              <rect
                                x={cajaX - margen}
                                y={arriba - margen}
                                width={cajaAncho + margen * 2}
                                height={abajo - arriba + margen * 2}
                                fill="transparent"
                                stroke={activo ? 'var(--c-accent)' : multilinea ? 'none' : '#9ca3af'}
                                strokeWidth={activo ? 2 : 1}
                                strokeDasharray={activo ? undefined : '4 3'}
                                vectorEffect="non-scaling-stroke"
                              />
                              {/* Un <tspan> por renglón: cada x absoluto abre un bloque nuevo, así text-anchor
                                  ancla cada renglón en x, igual que el PDF dentro de su caja. */}
                              <text
                                textAnchor={TEXT_ANCHOR[campo.alineacion] ?? 'middle'}
                                fontFamily={FAMILIAS[campo.familia].css}
                                fontStyle={campo.cursiva ? 'italic' : 'normal'}
                                fontWeight={campo.negrita ? 'bold' : 'normal'}
                                fontSize={tamano}
                                fill={campo.color}
                                style={{ whiteSpace: 'pre' }}
                              >
                                {renglones.map((renglon, i) => (
                                  <tspan key={i} x={campo.x} y={campo.y + i * paso}>
                                    {renglon}
                                  </tspan>
                                ))}
                              </text>
                              {/* Punto de anclaje exacto (x, y = primera línea base) del campo seleccionado */}
                              {activo && (
                                <circle
                                  cx={campo.x}
                                  cy={campo.y}
                                  r={radioAnclaje}
                                  fill="var(--c-accent)"
                                  stroke="#ffffff"
                                  strokeWidth={1.5}
                                  vectorEffect="non-scaling-stroke"
                                />
                              )}
                            </g>
                            {activo && multilinea && (
                              <rect
                                role="slider"
                                aria-label={`Ancho máximo de ${campo.variable}`}
                                aria-valuenow={campo.ancho_maximo}
                                x={xTirador - radioAnclaje * 0.75}
                                y={(arriba + abajo) / 2 - radioAnclaje * 2}
                                width={radioAnclaje * 1.5}
                                height={radioAnclaje * 4}
                                rx={radioAnclaje * 0.5}
                                fill="var(--c-accent)"
                                stroke="#ffffff"
                                strokeWidth={1}
                                vectorEffect="non-scaling-stroke"
                                className="cursor-ew-resize touch-none"
                                onPointerDown={(e) => iniciarArrastre(e, indice, 'ancho')}
                                onPointerMove={handlePointerMove}
                                onPointerUp={terminarArrastre}
                                onPointerCancel={terminarArrastre}
                              />
                            )}
                          </g>
                        );
                      })}
                      {/* Después de los campos: en el PDF el QR se dibuja encima del diseño y de los textos. */}
                      {qr && (
                        <MarcadorQr
                          qr={qr}
                          radio={radioAnclaje}
                          etiqueta={{ tamano: radioAnclaje * 3.5, margen: radioAnclaje, altoViewbox: viewBox.alto }}
                          onPointerDown={(e) => iniciarArrastreQr(e, 'qr-mover')}
                          onPointerDownTamano={(e) => iniciarArrastreQr(e, 'qr-tamano')}
                          onPointerMove={handlePointerMove}
                          onPointerUp={terminarArrastre}
                        />
                      )}
                    </svg>
                  </div>
                  {avisoCaja && (
                    <Alert key={avisoCaja.clave} variant="warning">
                      {avisoCaja.texto}
                    </Alert>
                  )}
                  {camposDesbordados.map((campo) => (
                    <Alert key={`desborde-${campos.indexOf(campo)}`} variant="warning">
                      {`{${campo.variable}}`}: el texto no cabe en la página; en el PDF se recortará con &ldquo;…&rdquo;.
                    </Alert>
                  ))}
                </>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Rotulo>PDF real</Rotulo>
              {pdfUrl ? (
                <iframe
                  src={pdfUrl}
                  title="PDF de prueba"
                  className="min-h-80 w-full rounded-lg border border-border bg-white"
                  style={estiloLienzo}
                />
              ) : (
                <p className="text-sm text-text-muted">
                  Pulsa &ldquo;Generar PDF de prueba&rdquo; para ver aquí el certificado tal como lo produce el
                  servidor.
                </p>
              )}
            </div>
          </div>

          {svgTexto &&
            (campos.length === 0 ? (
              <p className="text-sm text-text-muted">Aún no hay campos ubicados en la plantilla.</p>
            ) : seleccionado !== null && campos[seleccionado] ? (
              <PropiedadesCampo
                key={seleccionado}
                campo={campos[seleccionado]}
                anchoViewbox={viewBox.ancho}
                bajoQr={campoBajoQr(campos[seleccionado], qr)}
                onCambiar={(cambios) => actualizarCampo(seleccionado, cambios)}
                onEliminar={() => eliminarCampo(seleccionado)}
              />
            ) : (
              <p className="text-sm text-text-muted">Haz clic en un campo para editar sus propiedades o arrástralo para moverlo.</p>
            ))}

          {svgTexto && viewBox && qr && (
            <PropiedadesQr
              qr={qr}
              maximo={Math.floor(tamanoMaximoQr(qr, viewBox) * 100) / 100}
              onCambiarTamano={(tamano) => actualizarQr(redimensionarQr(qr, tamano, viewBox))}
              onQuitar={() => actualizarQr(null)}
            />
          )}

          <div className="flex flex-col gap-4 rounded-lg border border-border p-4">
            <div>
              <h2 className="font-sans text-base font-semibold text-text-primary">Datos de prueba</h2>
              <p className="text-xs text-text-muted">
                Se usan en el visor y en el PDF de prueba. Úsalos para probar casos extremos, como un nombre
                larguísimo o un título extenso.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {VARIABLES_POR_TIPO[tipo].map((variable) => (
                <Input
                  key={variable}
                  label={ETIQUETA_VARIABLE[variable] ?? variable}
                  value={variablesPrueba[variable] ?? ''}
                  // generar-prueba siempre usa el código falso: no se edita, así visor y PDF muestran lo mismo.
                  readOnly={variable === 'codigo_verificacion'}
                  className={variable === 'codigo_verificacion' ? 'font-mono' : undefined}
                  onChange={(e) => setVariablesPrueba((prev) => ({ ...prev, [variable]: e.target.value }))}
                />
              ))}
            </div>
            <div className="flex flex-col gap-1.5">
              <Button
                type="button"
                variant="secondary"
                loading={generando}
                disabled={generando || guardando}
                onClick={handleGenerarPdf}
                className="self-start"
              >
                <FileText className="size-4" />
                Generar PDF de prueba
              </Button>
              <p className="text-xs text-text-muted">
                El PDF de prueba usa la plantilla guardada y no emite ningún certificado.
              </p>
              {qr && (
                <p className="text-xs text-text-muted">
                  Su QR es real pero apunta al código de prueba {CODIGO_VERIFICACION_PRUEBA}: al escanearlo dirá
                  &ldquo;no encontrado&rdquo;, y es lo esperado.
                </p>
              )}
            </div>
            {errorPdf && <Alert variant="error">{errorPdf}</Alert>}
          </div>

          {errorGuardar && <Alert variant="error">{errorGuardar}</Alert>}
          {exito && <Alert variant="success">{exito}</Alert>}

          <div className="flex flex-wrap justify-between gap-2 border-t border-border pt-4">
            <Button
              type="button"
              variant="destructive"
              disabled={!existe}
              onClick={() => {
                setErrorEliminar('');
                setEliminarAbierto(true);
              }}
            >
              Eliminar plantilla
            </Button>
            <Button
              type="button"
              loading={guardando}
              disabled={!svgTexto || !viewBox || guardando || generando}
              onClick={handleGuardar}
            >
              Guardar plantilla
            </Button>
          </div>
        </Card>
      )}

      <Modal open={eliminarAbierto} onClose={() => !eliminando && setEliminarAbierto(false)} title="Eliminar plantilla">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-text-primary">
            ¿Eliminar la plantilla del {tipoLabel?.toLowerCase()}? Se borran el diseño y la ubicación de los campos.
            Esta acción no se puede deshacer.
          </p>
          {errorEliminar && <Alert variant="error">{errorEliminar}</Alert>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" disabled={eliminando} onClick={() => setEliminarAbierto(false)}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" loading={eliminando} disabled={eliminando} onClick={handleEliminar}>
              Eliminar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
