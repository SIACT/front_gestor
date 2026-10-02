import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import clsx from 'clsx';
import { apiFetch } from '../../api/client';
import { useCongreso } from '../../context/CongresoContext';
import { capitalizar, formatFechaHora } from '../../utils/formato';
import { PonenciaDetalle } from '../../components/PonenciaDetalle';
import { SugerenciasMensaje } from '../../components/SugerenciasMensaje';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { PageLoader } from '../../components/ui/PageLoader';

function RevisionTalk({ talk, onRefresh }) {
  const { congreso } = useCongreso();
  const [estadoTalk, setEstadoTalk] = useState(talk.estado_talk);
  const [observaciones, setObservaciones] = useState(talk.observaciones ?? '');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  async function handleGuardar() {
    setGuardando(true);
    setError('');
    try {
      await apiFetch(`/talks/${talk.id_talk}/revision`, {
        method: 'PATCH',
        body: JSON.stringify({ estado_talk: estadoTalk, observaciones: observaciones || undefined }),
      });
      onRefresh?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      <h2 className="font-sans text-lg font-semibold text-text-primary">Revisión</h2>

      {error && (
        <Alert variant="error" className="mt-3">
          {error}
        </Alert>
      )}

      <div className="mt-4 flex flex-col gap-3">
        <Select label="Estado" value={estadoTalk} onChange={(e) => setEstadoTalk(e.target.value)}>
          <option value="pendiente">Pendiente</option>
          <option value="aceptada">Aceptada</option>
          <option value="rechazada">Rechazada</option>
        </Select>

        <SugerenciasMensaje idCongreso={congreso?.id_congreso} contexto="talk" onSelect={setObservaciones} />
        <Textarea
          label="Observaciones (opcional)"
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
        />

        <Button type="button" variant="primary" loading={guardando} onClick={handleGuardar}>
          Guardar revisión
        </Button>
        <p className="text-xs text-text-muted">Esto notificará por correo al ponente principal.</p>
      </div>
    </div>
  );
}

const OPCIONES_PRESENTO = [
  { valor: null, label: 'Sin definir' },
  { valor: true, label: 'Presentó' },
  { valor: false, label: 'No presentó' },
];

// Marcado único por trabajo (certificado de participación en la ponencia): distinto de la
// asistencia por día al congreso, que vive en admin/Asistencia.
function PresentoTalk({ talk, onRefresh }) {
  const { congreso } = useCongreso();
  const [guardando, setGuardando] = useState(null);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  const actual = talk.presento ?? null;
  const marcador = talk.marcador_presento;

  async function handleMarcar(valor) {
    if (valor === actual || valor === null) return;
    setGuardando(valor);
    setError('');
    setExito('');
    try {
      await apiFetch(`/congresos/${congreso?.id_congreso}/talks/${talk.id_talk}/presento`, {
        method: 'PATCH',
        body: JSON.stringify({ presento: valor }),
      });
      setExito(valor ? "Trabajo marcado como 'Presentó'." : "Trabajo marcado como 'No presentó'.");
      // La respuesta del PATCH no trae el nombre de quien marcó: se recarga el detalle completo.
      onRefresh?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(null);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      <h2 className="font-sans text-lg font-semibold text-text-primary">¿Presentó?</h2>

      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="¿Presentó?">
        {OPCIONES_PRESENTO.map((opcion) => {
          const seleccionada = actual === opcion.valor;
          return (
            <Button
              key={opcion.label}
              type="button"
              size="sm"
              variant={seleccionada ? (opcion.valor === false ? 'destructive' : 'primary') : 'secondary'}
              aria-pressed={seleccionada}
              loading={guardando === opcion.valor}
              // El backend solo acepta true/false: una vez marcado, no se puede volver a "Sin definir".
              disabled={guardando !== null || (opcion.valor === null && !seleccionada)}
              title={opcion.valor === null && !seleccionada ? 'Una vez marcado no se puede volver a "Sin definir"' : undefined}
              onClick={() => handleMarcar(opcion.valor)}
              className={clsx(seleccionada && 'pointer-events-none')}
            >
              {opcion.label}
            </Button>
          );
        })}
      </div>

      <p className="mt-3 text-sm text-text-muted">
        Al marcar 'Presentó', todos los integrantes de este trabajo (autor principal y coautores) quedan
        habilitados para el certificado de participación de esta ponencia.
      </p>

      {actual !== null && (
        <p className="mt-2 text-xs text-text-muted">
          Marcado como {actual ? 'Presentó' : 'No presentó'} por {capitalizar(marcador?.nombre)}{' '}
          {capitalizar(marcador?.apellido)} el {formatFechaHora(talk.presento_marcado_en)}
        </p>
      )}

      {error && (
        <Alert variant="error" className="mt-3">
          {error}
        </Alert>
      )}
      {exito && (
        <Alert variant="success" className="mt-3">
          {exito}
        </Alert>
      )}
    </div>
  );
}

export function PonenciaAdminDetalle() {
  const { id } = useParams();
  const [talk, setTalk] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  function cargarTalk() {
    return apiFetch(`/talks/${id}`)
      .then((data) => setTalk(data))
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    setLoading(true);
    cargarTalk().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return <PageLoader />;

  if (error) {
    return (
      <div className="flex flex-col gap-6">
        <Alert variant="error">{error}</Alert>
      </div>
    );
  }

  if (!talk) return null;

  return (
    <PonenciaDetalle
      talk={talk}
      isAdmin
      canEdit
      canManageCoponentes
      onRefresh={cargarTalk}
      adminReviewSlot={
        <>
          <RevisionTalk talk={talk} onRefresh={cargarTalk} />
          <PresentoTalk talk={talk} onRefresh={cargarTalk} />
        </>
      }
    />
  );
}
