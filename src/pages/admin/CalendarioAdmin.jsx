import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Layers } from 'lucide-react';
import { apiFetch } from '../../api/client';
import { useCongreso } from '../../context/CongresoContext';
import { capitalizar, formatHora } from '../../utils/formato';
import { getAreaBadgeVariant } from '../../utils/areaColor';
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
  const { congreso, refrescarCongreso } = useCongreso();
  const idCongreso = congreso?.id_congreso;
  const navigate = useNavigate();

  const [dias, setDias] = useState([]);
  const [diaActivoIndex, setDiaActivoIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [actualizandoAgendaVisible, setActualizandoAgendaVisible] = useState(false);
  const [agendaVisibleError, setAgendaVisibleError] = useState('');

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

  function renderSlot(slot, fecha) {
    if (slot.talk) {
      return (
        <Card
          key={slot.id_schedule}
          className="cursor-pointer p-3 transition-colors hover:border-accent"
          onClick={() => handleClickSlot(slot, fecha)}
        >
          <p className="text-xs font-medium text-text-muted">
            {formatHora(slot.hora_inicio)}–{formatHora(slot.hora_fin)}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Badge variant="default">{slot.talk.tipo_participacion?.nombre ?? 'Sin tipo'}</Badge>
            {slot.talk.area && (
              <Badge variant={getAreaBadgeVariant(slot.talk.area.nombre)} className="opacity-80">
                {slot.talk.area.nombre}
              </Badge>
            )}
          </div>
          <p className="mt-2 line-clamp-2 text-sm font-medium text-text-primary">{slot.talk.titulo}</p>
          <p className="mt-1 text-xs text-text-muted">
            {capitalizar(slot.talk.inscripcion.usuario.nombre)}{' '}
            {capitalizar(slot.talk.inscripcion.usuario.apellido)}
          </p>
        </Card>
      );
    }

    if (slot.posters && slot.posters.length > 0) {
      // Sesión de pósteres: una sola fila de Schedule que agrupa varios pósteres (ya vienen
      // agrupados desde el backend vía SchedulePosters, no hay nada que agrupar acá). Cada
      // póster navega individualmente al mismo destino de edición que una ponencia normal
      // (el admin edita/elimina la sesión completa desde Horarios, no póster por póster).
      return (
        <Card key={slot.id_schedule} className="p-3">
          <p className="text-xs font-medium text-text-muted">
            {formatHora(slot.hora_inicio)}–{formatHora(slot.hora_fin)}
          </p>
          <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-accent">
            <Layers className="size-3.5" />
            Sesión de Pósteres ({slot.posters.length})
          </span>
          <div className="mt-2 flex flex-col gap-2">
            {slot.posters.map((poster) => (
              <button
                key={poster.id_talk}
                type="button"
                onClick={() => handleClickSlot(slot, fecha)}
                className="rounded-lg border border-border p-2 text-left transition-colors hover:border-accent"
              >
                <p className="line-clamp-2 text-sm font-medium text-text-primary">{poster.titulo}</p>
                <p className="mt-0.5 text-xs text-text-muted">{capitalizar(poster.autor)}</p>
              </button>
            ))}
          </div>
        </Card>
      );
    }

    if (slot.titulo_actividad) {
      // Actividad libre: tono cálido (warning) con ícono de café, distinto
      // tanto de la Card neutra de una ponencia como del slot vacío punteado.
      return (
        <button
          key={slot.id_schedule}
          type="button"
          onClick={() => handleClickSlot(slot, fecha)}
          className="flex flex-col items-start gap-1 rounded-xl border border-warning-text/30 bg-warning-bg p-3 text-left transition-colors hover:border-warning-text"
        >
          <p className="text-xs font-medium text-warning-text/80">
            {formatHora(slot.hora_inicio)}–{formatHora(slot.hora_fin)}
          </p>
          <span className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-warning-text">
            <Star className="size-3.5" />
            Actividad
          </span>
          <p className="line-clamp-2 text-sm font-medium text-text-primary">{slot.titulo_actividad}</p>
          {slot.descripcion_actividad && (
            <p className="line-clamp-2 text-xs text-text-muted">{slot.descripcion_actividad}</p>
          )}
        </button>
      );
    }

    return (
      <button
        key={slot.id_schedule}
        type="button"
        onClick={() => handleClickSlot(slot, fecha)}
        className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border bg-surface/50 p-3 text-center transition-colors hover:border-accent"
      >
        <p className="text-xs font-medium text-text-muted">
          {formatHora(slot.hora_inicio)}–{formatHora(slot.hora_fin)}
        </p>
        <p className="text-sm text-text-muted">Slot disponible</p>
      </button>
    );
  }

  async function handleToggleAgendaVisible() {
    setAgendaVisibleError('');
    setActualizandoAgendaVisible(true);
    try {
      await apiFetch(`/congresos/${idCongreso}`, {
        method: 'PATCH',
        body: JSON.stringify({ agenda_visible: !congreso.agenda_visible }),
      });
      await refrescarCongreso();
    } catch (err) {
      setAgendaVisibleError(err.message);
    } finally {
      setActualizandoAgendaVisible(false);
    }
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

      <div className="flex items-center justify-between rounded-lg border border-border bg-surface p-4">
        <div>
          <p className="font-medium text-text-primary">Agenda pública</p>
          <p className="text-sm text-text-muted">
            {congreso.agenda_visible
              ? 'Los participantes pueden ver la agenda.'
              : 'Mientras esté oculta, solo tú puedes ver la agenda desde este calendario de administración. Los participantes verán un aviso de que aún no está disponible.'}
          </p>
        </div>
        <Button
          type="button"
          variant={congreso.agenda_visible ? 'primary' : 'secondary'}
          loading={actualizandoAgendaVisible}
          onClick={handleToggleAgendaVisible}
        >
          {congreso.agenda_visible ? 'Publicada' : 'No publicada'}
        </Button>
      </div>

      {agendaVisibleError && <Alert variant="error">{agendaVisibleError}</Alert>}

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

            <div className="flex flex-wrap items-center gap-4 text-xs text-text-muted">
              <span className="flex items-center gap-1.5">
                <span className="size-3 rounded border border-border bg-surface" /> Ponencia
              </span>
              <span className="flex items-center gap-1.5">
                <Star className="size-3 text-warning-text" /> Actividad libre
              </span>
              <span className="flex items-center gap-1.5">
                <Layers className="size-3 text-accent" /> Sesión de pósteres
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-3 rounded border border-dashed border-border" /> Vacío
              </span>
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
                        {salon.slots.map((slot) => renderSlot(slot, diaActivo.fecha))}
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
