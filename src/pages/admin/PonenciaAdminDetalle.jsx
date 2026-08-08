import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiFetch } from '../../api/client';
import { PonenciaDetalle } from '../../components/PonenciaDetalle';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { PageLoader } from '../../components/ui/PageLoader';

function RevisionTalk({ talk, onRefresh }) {
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
      adminReviewSlot={<RevisionTalk talk={talk} onRefresh={cargarTalk} />}
    />
  );
}
