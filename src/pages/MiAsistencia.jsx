import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { apiFetch } from '../api/client';
import { useCongreso } from '../context/CongresoContext';
import { formatFechaSolo } from '../utils/formato';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Alert } from '../components/ui/Alert';
import { PageLoader } from '../components/ui/PageLoader';

// Autochequeo oculto temporalmente para usuarios. Cambiar a true para volver a mostrarlo.
const MOSTRAR_AUTOCHEQUEO = false;

const MENSAJE_SIN_INSCRIPCION =
  'Necesitas tener una inscripción activa en este congreso para marcar asistencia';

function Autochequeo({ idCongreso, onRegistrada }) {
  const [codigo, setCodigo] = useState('');
  const [resultado, setResultado] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!codigo.trim()) return;
    setSubmitting(true);
    setResultado(null);
    try {
      const data = await apiFetch(`/congresos/${idCongreso}/asistencia/autochequeo`, {
        method: 'POST',
        body: JSON.stringify({ codigo }),
      });
      if (data.ya_registrado) {
        setResultado({ variant: 'warning', mensaje: 'Ya tenías tu asistencia marcada para hoy' });
      } else {
        setResultado({ variant: 'success', mensaje: '¡Asistencia registrada!' });
        onRegistrada();
      }
      setCodigo('');
    } catch (err) {
      // En error NO se limpia el input: el usuario puede corregir el código sin reescribirlo.
      const mensaje =
        err.code === 'CODIGO_INVALIDO' ? (
          'El código ingresado no es válido'
        ) : err.code === 'SIN_INSCRIPCION_EN_CONGRESO' ? (
          MENSAJE_SIN_INSCRIPCION
        ) : err.code === 'INSCRIPCION_NO_HABILITADA_PARA_ASISTIR' ? (
          <>
            No puedes marcar tu asistencia todavía: tu inscripción debe estar confirmada o con carta de
            compromiso. Revisa el estado de tu inscripción en{' '}
            <Link to={`/congresos/${idCongreso}/inscripciones`} className="font-medium underline">
              Mis inscripciones
            </Link>
            .
          </>
        ) : (
          err.message
        );
      setResultado({ variant: 'error', mensaje });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <h2 className="font-sans text-lg font-semibold text-text-primary">Autochequeo</h2>
      <p className="mt-1 text-sm text-text-muted">
        Ingresa el código que se muestra en la mesa de registro del día.
      </p>
      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
        {/* Mayúsculas mientras se escribe: mismo formato visual que el código en el panel de
            Admin. El backend normaliza igual, esto es solo claridad visual. */}
        <Input
          label="Código de asistencia"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.toUpperCase())}
          placeholder="Ej. A3F9K2"
          maxLength={6}
          className="font-mono tracking-widest"
        />
        <Button type="submit" loading={submitting} disabled={!codigo.trim() || submitting} className="self-start">
          Marcar mi asistencia de hoy
        </Button>
        {resultado && <Alert variant={resultado.variant}>{resultado.mensaje}</Alert>}
      </form>
    </Card>
  );
}

function MiProgreso({ asistencia }) {
  const { dias_marcados, dias_requeridos, cumple_asistencia, fechas_marcadas = [] } = asistencia;
  const sinUmbral = dias_requeridos === null;

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-sans text-lg font-semibold text-text-primary">Mi progreso</h2>
        <Badge variant={sinUmbral ? 'default' : cumple_asistencia ? 'revisado' : 'pendiente'}>
          {sinUmbral ? 'Aún sin definir' : cumple_asistencia ? 'Cumple' : 'No cumple'}
        </Badge>
      </div>

      <p className="mt-4 text-3xl font-bold text-accent">
        {sinUmbral ? `${dias_marcados} días marcados` : `${dias_marcados} de ${dias_requeridos} días`}
      </p>

      {cumple_asistencia === true && (
        <Alert variant="success" className="mt-4">
          Has cumplido con el requisito de asistencia de este congreso.
        </Alert>
      )}

      {fechas_marcadas.length > 0 ? (
        <ul className="mt-4 flex flex-col gap-2">
          {fechas_marcadas.map((fecha) => (
            <li key={fecha} className="flex items-center gap-2 text-sm text-text-primary">
              <CheckCircle className="size-4 shrink-0 text-success-text" />
              {formatFechaSolo(fecha)}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-text-muted">Aún no has marcado asistencia en ningún día, no debes de preocuparte, porque sera cargado por el sistema ALTENUA.</p>
      )}
    </Card>
  );
}

export function MiAsistencia() {
  const { congreso } = useCongreso();
  const idCongreso = congreso?.id_congreso;

  const [asistencia, setAsistencia] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  function cargar() {
    return apiFetch(`/congresos/${idCongreso}/asistencia/mi-asistencia`)
      .then((data) => {
        setAsistencia(data);
        setError(null);
      })
      .catch((err) => setError(err));
  }

  useEffect(() => {
    setLoading(true);
    cargar().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idCongreso]);

  if (loading) return <PageLoader />;

  return (
    <div className="flex flex-col gap-6 pt-6">
      <div>
        <h1 className="font-sans text-2xl font-bold text-text-primary">Mi Asistencia</h1>
        <p className="mt-1 text-sm text-text-muted">Marca tu asistencia diaria y revisa tu progreso, este panel es cargado por el sistema ALTENUA</p>
      </div>

      {error?.code === 'SIN_INSCRIPCION_EN_CONGRESO' ? (
        <Alert variant="error">{MENSAJE_SIN_INSCRIPCION}</Alert>
      ) : (
        <div className={`grid grid-cols-1 gap-6 ${MOSTRAR_AUTOCHEQUEO ? 'lg:grid-cols-2' : ''}`}>
          {MOSTRAR_AUTOCHEQUEO && <Autochequeo idCongreso={idCongreso} onRegistrada={cargar} />}
          {error ? <Alert variant="error">{error.message}</Alert> : asistencia && <MiProgreso asistencia={asistencia} />}
        </div>
      )}
    </div>
  );
}
