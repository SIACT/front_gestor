import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import clsx from 'clsx';
import { BookOpen, Building2, Calendar, GraduationCap, Info, Link2 } from 'lucide-react';
import { apiFetch } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { ROL_PARTICIPACION } from '../utils/roles';
import { useCongreso } from '../context/CongresoContext';
import { ESTADO_INSCRIPCION_VARIANT, capitalizar, formatFecha } from '../utils/formato';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { BurbujasRecordatorio } from '../components/BurbujasRecordatorio';

// Mismo criterio que ya usamos en el bloque de estado de DetalleInscripcion.jsx.
const ESTADO_INSCRIPCION_BORDER = {
  pendiente: 'border-warning-text',
  confirmada: 'border-success-text',
  rechazada: 'border-error-text',
  cancelada: 'border-border',
};

export function MisInscripciones() {
  const navigate = useNavigate();
  const { id_congreso } = useParams();
  const { user } = useAuth();
  const { congreso, misInscripcion } = useCongreso();
  const [comprobante, setComprobante] = useState(null);
  const [archivos, setArchivos] = useState([]);

  // Regla de negocio: 1 inscripción por usuario POR CONGRESO. `misInscripcion`
  // (del CongresoContext) ya es esa única inscripción, o null. CongresoLayout ya
  // esperó a que el contexto cargara antes de montar esta página.
  const inscripciones = misInscripcion ? [misInscripcion] : [];

  // GET /inscripciones no trae comprobante ni archivos, así que pedimos el
  // detalle liviano solo cuando las burbujas lo necesitan (estado pendiente).
  const inscripcionPendiente = inscripciones.find((i) => i.estado_inscripcion === 'pendiente');

  useEffect(() => {
    if (!inscripcionPendiente) return;
    apiFetch(`/inscripciones/${inscripcionPendiente.id_inscripcion}`)
      .then((data) => setComprobante(data?.comprobante ?? null))
      .catch(() => {});
    apiFetch(`/inscripciones/${inscripcionPendiente.id_inscripcion}/archivos`)
      .then((data) => setArchivos(data ?? []))
      .catch(() => {});
  }, [inscripcionPendiente]);

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-20">
      <div className="flex items-start justify-between gap-4">
        <h1 className="font-sans text-2xl font-bold text-text-primary">Mis inscripciones</h1>
        <div className="flex flex-col items-end gap-1">
          <Button
            variant="primary"
            disabled={inscripciones.length > 0}
            onClick={() => navigate(`/congresos/${id_congreso}/inscripciones/nueva`)}
          >
            Nueva inscripción
          </Button>
          {inscripciones.length > 0 && (
            <p className="flex items-center gap-1 text-xs text-text-muted">
              <Info className="size-3.5" />
              Ya tienes una inscripción activa en este congreso. Solo se permite una por congreso.
            </p>
          )}
        </div>
      </div>

      {inscripciones.length === 0 && (
        <div className="mt-16 flex flex-col items-center gap-4 text-center">
          <p className="text-sm text-text-muted">Todavía no tienes inscripciones.</p>
          <Button variant="primary" onClick={() => navigate(`/congresos/${id_congreso}/inscripciones/nueva`)}>
            Nueva inscripción
          </Button>
        </div>
      )}

      {inscripciones.length > 0 && (
        <ul className="mt-6 flex flex-col gap-4">
          {inscripciones.map((inscripcion) => {
            const rolParticipacion =
              inscripcion.id_rol_participacion === ROL_PARTICIPACION.EXPOSITOR ? 'Expositor' : 'Asistente';

            return (
              <li key={inscripcion.id_inscripcion}>
                <Link to={`/congresos/${id_congreso}/inscripciones/${inscripcion.id_inscripcion}`}>
                  <Card
                    className={clsx(
                      'border-l-4 transition-colors hover:border-accent',
                      ESTADO_INSCRIPCION_BORDER[inscripcion.estado_inscripcion] ?? 'border-border',
                    )}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-text-muted">
                        <BookOpen className="size-3.5" />
                        Inscripción al congreso
                      </div>
                      <Badge variant={ESTADO_INSCRIPCION_VARIANT[inscripcion.estado_inscripcion]}>
                        {inscripcion.estado_inscripcion}
                      </Badge>
                    </div>

                    <p className="mt-2 font-sans text-2xl font-bold text-text-primary">{congreso?.nombre}</p>

                    <div className="mt-4 grid grid-cols-2 gap-4 border-t border-border pt-4">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                          Participación
                        </p>
                        <div className="mt-1 flex items-center gap-1.5 text-sm font-medium text-accent">
                          <Link2 className="size-4" />
                          {rolParticipacion}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                          Tipo de asistente
                        </p>
                        <div className="mt-1 flex items-center gap-1.5 text-sm font-medium text-text-primary">
                          <GraduationCap className="size-4 text-text-muted" />
                          {inscripcion.tipo_asistente?.tipo ?? '—'}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 border-t border-border pt-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                        Participante
                      </p>
                      <p className="mt-1 text-base font-bold text-text-primary">
                        {capitalizar(user?.nombre)} {capitalizar(user?.apellido)}
                      </p>
                      {user?.institucion && (
                        <div className="mt-1 flex items-center gap-1.5 text-sm text-text-muted">
                          <Building2 className="size-4" />
                          {capitalizar(user.institucion)}
                        </div>
                      )}
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                      <div className="flex items-center gap-1.5 text-sm text-text-muted">
                        <Calendar className="size-4" />
                        Fecha de inscripción
                      </div>
                      <span className="text-sm text-text-primary">
                        {formatFecha(inscripcion.fecha_inscripcion)}
                      </span>
                    </div>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {inscripcionPendiente && (
        <BurbujasRecordatorio
          comprobante={comprobante}
          archivos={archivos}
          estadoInscripcion={inscripcionPendiente.estado_inscripcion}
          idInscripcion={inscripcionPendiente.id_inscripcion}
        />
      )}
    </div>
  );
}
