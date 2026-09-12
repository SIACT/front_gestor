import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../api/client';
import { useCongreso } from '../../context/CongresoContext';
import { capitalizar, formatHora } from '../../utils/formato';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { PageLoader } from '../../components/ui/PageLoader';

// dias[].fecha viaja como 'YYYY-MM-DD' plano (ya lo arma así el backend, sin sufijo de hora),
// así que no hay ninguna conversión de huso horario que evitar aquí — a diferencia de
// Schedule.fecha en otros endpoints, que sí es un ISO completo sobre medianoche UTC.
function formatFechaCorta(fechaYMD) {
  const [year, month, day] = fechaYMD.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

export function CalendarioAdmin() {
  const { congreso } = useCongreso();
  const idCongreso = congreso?.id_congreso;
  const navigate = useNavigate();

  const [dias, setDias] = useState([]);
  const [diaActivoIndex, setDiaActivoIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    apiFetch(`/congresos/${idCongreso}/schedule/calendario`)
      .then((data) => {
        setDias(data?.dias ?? []);
        setDiaActivoIndex(0);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [idCongreso]);

  function handleClickSlot(slot, fecha) {
    navigate(`/congresos/${idCongreso}/admin/horarios?slot=${slot.id_schedule}&fecha=${fecha}`);
  }

  if (loading) return <PageLoader />;

  const diaActivo = dias[diaActivoIndex] ?? null;

  return (
    <div className="flex flex-col gap-6 pt-6">
      <div>
        <h1 className="font-sans text-2xl font-bold text-text-primary">Calendario</h1>
        <p className="mt-1 text-sm text-text-muted">
          Vista de calendario del congreso, agrupada por salón.
        </p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {!error && dias.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface px-6 py-12 text-center">
          <p className="text-sm text-text-muted">Todavía no hay horarios programados en este congreso.</p>
        </div>
      ) : (
        !error && (
          <>
            <div className="flex flex-wrap gap-2">
              {dias.map((dia, index) => (
                <Button
                  key={dia.fecha}
                  type="button"
                  variant={index === diaActivoIndex ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setDiaActivoIndex(index)}
                >
                  {formatFechaCorta(dia.fecha)}
                </Button>
              ))}
            </div>

            {diaActivo && (
              <div className="overflow-x-auto">
                <div
                  className="grid gap-4"
                  style={{ gridTemplateColumns: `repeat(${diaActivo.salones.length}, minmax(220px, 1fr))` }}
                >
                  {diaActivo.salones.map((salon) => (
                    <div key={salon.id_salon} className="flex flex-col gap-3">
                      <div className="sticky top-0 z-10 rounded-lg border border-border bg-surface px-3 py-2">
                        <p className="text-sm font-semibold text-text-primary">{salon.nombre}</p>
                        <p className="text-xs text-text-muted">{salon.capacidad} personas</p>
                      </div>

                      <div className="flex flex-col gap-2">
                        {salon.slots.map((slot) =>
                          slot.talk ? (
                            <Card
                              key={slot.id_schedule}
                              className="cursor-pointer p-3 transition-colors hover:border-accent"
                              onClick={() => handleClickSlot(slot, diaActivo.fecha)}
                            >
                              <p className="text-xs font-medium text-text-muted">
                                {formatHora(slot.hora_inicio)}–{formatHora(slot.hora_fin)}
                              </p>
                              <Badge variant="default" className="mt-1">
                                {slot.talk.tipo_participacion?.nombre ?? 'Sin tipo'}
                              </Badge>
                              <p className="mt-2 line-clamp-2 text-sm font-medium text-text-primary">
                                {slot.talk.titulo}
                              </p>
                              <p className="mt-1 text-xs text-text-muted">
                                {capitalizar(slot.talk.inscripcion.usuario.nombre)}{' '}
                                {capitalizar(slot.talk.inscripcion.usuario.apellido)}
                              </p>
                            </Card>
                          ) : (
                            <button
                              key={slot.id_schedule}
                              type="button"
                              onClick={() => handleClickSlot(slot, diaActivo.fecha)}
                              className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border bg-surface/50 p-3 text-center transition-colors hover:border-accent"
                            >
                              <p className="text-xs font-medium text-text-muted">
                                {formatHora(slot.hora_inicio)}–{formatHora(slot.hora_fin)}
                              </p>
                              <p className="text-sm text-text-muted">Slot disponible</p>
                            </button>
                          ),
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )
      )}
    </div>
  );
}
