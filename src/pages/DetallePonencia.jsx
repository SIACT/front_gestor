import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiFetch } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { PonenciaDetalle } from '../components/PonenciaDetalle';
import { Alert } from '../components/ui/Alert';
import { PageLoader } from '../components/ui/PageLoader';

export function DetallePonencia() {
  const { id } = useParams();
  const { user } = useAuth();

  const [talk, setTalk] = useState(null);
  const [esCoponente, setEsCoponente] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  function cargarTalk() {
    return apiFetch(`/talks/${id}`)
      .then((data) => setTalk(data))
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    setLoading(true);
    Promise.all([
      cargarTalk(),
      apiFetch(`/talks/${id}/ponentes`)
        .then((data) => {
          const correoUsuario = user?.correo?.toLowerCase();
          setEsCoponente(
            (data ?? []).some((p) => !p.es_principal && p.correo?.toLowerCase() === correoUsuario),
          );
        })
        .catch(() => setEsCoponente(false)),
    ]).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return <PageLoader />;

  if (error) {
    return (
      <div className="mx-auto w-full max-w-2xl px-6 py-12">
        <Alert variant="error">{error}</Alert>
      </div>
    );
  }

  if (!talk) return null;

  const esPrincipal = talk.inscripcion?.id_usuario === user?.id_usuario;
  const esAdmin = user?.id_rol === 1;

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-12">
      <PonenciaDetalle
        talk={talk}
        isAdmin={esAdmin}
        canEdit={esPrincipal || esAdmin || esCoponente}
        canManageCoponentes={esPrincipal || esAdmin}
        onRefresh={cargarTalk}
      />
    </div>
  );
}
