import clsx from 'clsx';

// Mismo ciclo de color que la sección "Procedencia" (EstadisticasCongreso.jsx) — si hay
// más categorías que colores, se repite el ciclo (posiciones no adyacentes del donut no
// quedan una junto a otra con el mismo color mientras haya más de 4 categorías).
const COLOR_CICLO = [
  { stroke: 'stroke-accent', bg: 'bg-accent' },
  { stroke: 'stroke-blue-text', bg: 'bg-blue-text' },
  { stroke: 'stroke-purple-text', bg: 'bg-purple-text' },
  { stroke: 'stroke-warning-text', bg: 'bg-warning-text' },
];

// Donut SVG puro (sin librería de charts): cada segmento es un <circle> con
// stroke-dasharray recortado a su porción de la circunferencia total, y
// stroke-dashoffset negativo acumulando el largo de los segmentos anteriores para que
// cada uno "empiece" donde terminó el previo. El grupo se rota -90° para que el primer
// segmento arranque arriba (12 en punto) en vez del punto de partida por defecto de un
// <circle> (3 en punto).
export function GraficoCircular({ data, size = 200 }) {
  const strokeWidth = Math.round(size * 0.14);
  const radio = size / 2 - strokeWidth / 2;
  const circunferencia = 2 * Math.PI * radio;
  const centro = size / 2;

  const total = data.reduce((suma, item) => suma + item.total, 0);

  let acumulado = 0;
  const segmentos = data.map((item, i) => {
    const porcentaje = total > 0 ? item.total / total : 0;
    const largo = porcentaje * circunferencia;
    const segmento = {
      ...item,
      porcentaje,
      color: COLOR_CICLO[i % COLOR_CICLO.length],
      dasharray: `${largo} ${circunferencia - largo}`,
      dashoffset: -acumulado,
    };
    acumulado += largo;
    return segmento;
  });

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        <circle cx={centro} cy={centro} r={radio} fill="none" strokeWidth={strokeWidth} className="stroke-border" />
        <g transform={`rotate(-90 ${centro} ${centro})`}>
          {segmentos.map((s) => (
            <circle
              key={s.nombre}
              cx={centro}
              cy={centro}
              r={radio}
              fill="none"
              strokeWidth={strokeWidth}
              strokeDasharray={s.dasharray}
              strokeDashoffset={s.dashoffset}
              strokeLinecap="butt"
              className={s.color.stroke}
            />
          ))}
        </g>
        <text
          x={centro}
          y={centro - 6}
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-text-primary text-2xl font-bold"
        >
          {total}
        </text>
        <text
          x={centro}
          y={centro + 16}
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-text-muted text-[10px] uppercase tracking-wide"
        >
          Total
        </text>
      </svg>

      <ul className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:min-w-48">
        {segmentos.map((s) => (
          <li key={s.nombre} className="flex items-center gap-2 text-sm">
            <span className={clsx('size-2.5 shrink-0 rounded-sm', s.color.bg)} />
            <span className="min-w-0 flex-1 truncate text-text-primary">{s.nombre}</span>
            <span className="shrink-0 text-text-muted">
              {s.total} ({Math.round(s.porcentaje * 100)}%)
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
