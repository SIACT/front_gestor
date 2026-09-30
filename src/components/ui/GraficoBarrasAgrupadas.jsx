// Barras verticales agrupadas en CSS puro (sin librería de charts, sin ejes ni grilla): un
// grupo por categoría y, dentro, una barra por serie con su valor encima. La altura de
// TODAS las barras es relativa al máximo global (todas las series y categorías), para que
// la escala sea comparable entre grupos. Con muchas categorías el gráfico hace scroll
// horizontal en vez de comprimir los grupos; los nombres largos se recortan a 2 líneas y
// el nombre completo queda en el tooltip (title).
export function GraficoBarrasAgrupadas({ categorias, series, altura = 200 }) {
  const maximo = Math.max(...series.flatMap((s) => s.valores), 1);

  return (
    <div>
      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-fit justify-center gap-6">
          {categorias.map((categoria, i) => (
            <div key={`${categoria}-${i}`} className="flex w-28 shrink-0 flex-col items-center">
              <div className="flex items-end gap-1.5 border-b border-border" style={{ height: altura }}>
                {series.map((serie) => {
                  const valor = serie.valores[i] ?? 0;
                  return (
                    <div key={serie.nombre} className="flex w-7 flex-col items-center justify-end">
                      <span className="mb-1 text-xs font-semibold text-text-primary">{valor}</span>
                      {/* 2px mínimos: una barra en 0 sigue marcando su lugar sobre la base. */}
                      <div
                        className="w-full rounded-t"
                        style={{
                          height: Math.max((valor / maximo) * (altura - 20), 2),
                          backgroundColor: serie.color,
                        }}
                        title={`${serie.nombre}: ${valor}`}
                      />
                    </div>
                  );
                })}
              </div>
              <p className="mt-2 line-clamp-2 text-center text-xs text-text-muted" title={categoria}>
                {categoria}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap justify-center gap-4">
        {series.map((serie) => (
          <div key={serie.nombre} className="flex items-center gap-2 text-sm text-text-primary">
            <span className="size-3 rounded-sm" style={{ backgroundColor: serie.color }} />
            {serie.nombre}
          </div>
        ))}
      </div>
    </div>
  );
}
