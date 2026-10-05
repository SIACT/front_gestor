import { useState } from 'react';
import { apiFetch } from '../../api/client';
import { useCongreso } from '../../context/CongresoContext';
import { mensajeErrorEmision } from '../../utils/mensajesCertificacion';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';

function Cifra({ valor, etiqueta, destacada }) {
  return (
    <div>
      <p className={destacada ? 'text-2xl font-semibold text-accent' : 'text-2xl font-semibold text-text-primary'}>
        {valor ?? 0}
      </p>
      <p className="text-xs text-text-muted">{etiqueta}</p>
    </div>
  );
}

// Errores individuales del lote: el backend detalla cuál inscripción (y trabajo) falló y por qué.
function ListaErrores({ errores, idCongreso }) {
  if (!errores?.length) return null;
  return (
    <Alert variant="error">
      <p className="font-medium">
        {errores.length} {errores.length === 1 ? 'certificado no se pudo emitir' : 'certificados no se pudieron emitir'}:
      </p>
      <ul className="mt-1 list-disc pl-5">
        {errores.map((e, i) => (
          <li key={`${e.id_talk ?? ''}-${e.id_inscripcion}-${i}`}>
            Inscripción {e.id_inscripcion}
            {e.id_talk != null && ` · trabajo ${e.id_talk}`}: {mensajeErrorEmision(e, idCongreso)}
          </li>
        ))}
      </ul>
    </Alert>
  );
}

function LoteCard({ titulo, descripcion, boton, ruta, idCongreso, renderResumen }) {
  const [ejecutando, setEjecutando] = useState(false);
  const [resumen, setResumen] = useState(null);
  const [error, setError] = useState(null);

  async function ejecutar() {
    setEjecutando(true);
    setResumen(null);
    setError(null);
    try {
      setResumen(await apiFetch(`/congresos/${idCongreso}/certificacion/emitir-lote/${ruta}`, { method: 'POST' }));
    } catch (err) {
      setError(err);
    } finally {
      setEjecutando(false);
    }
  }

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <h2 className="font-sans text-lg font-semibold text-text-primary">{titulo}</h2>
        <p className="mt-1 text-sm text-text-muted">{descripcion}</p>
      </div>
      <Button type="button" size="lg" loading={ejecutando} disabled={ejecutando} onClick={ejecutar} className="self-start">
        {boton}
      </Button>
      {ejecutando && (
        <p className="text-sm text-text-muted">Generando certificados… puede tardar si hay muchas personas.</p>
      )}
      {error && <Alert variant="error">{mensajeErrorEmision(error, idCongreso)}</Alert>}
      {resumen && (
        <div className="flex flex-col gap-4 border-t border-border pt-4">
          {renderResumen(resumen)}
          <ListaErrores errores={resumen.errores} idCongreso={idCongreso} />
        </div>
      )}
    </Card>
  );
}

export function EmisionMasiva() {
  const { congreso } = useCongreso();
  const idCongreso = congreso?.id_congreso;

  return (
    <div className="flex flex-col gap-6 pt-6">
      <div>
        <h1 className="font-sans text-2xl font-bold text-text-primary">Emisión masiva</h1>
        <p className="mt-1 text-sm text-text-muted">
          Emite de una vez todos los certificados pendientes. Se puede repetir sin riesgo: los ya emitidos no se
          duplican.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <LoteCard
          titulo="Certificados de Asistencia"
          descripcion="Para cada inscripción confirmada que cumple los días de asistencia requeridos."
          boton="Emitir certificados de Asistencia (lote)"
          ruta="asistencia"
          idCongreso={idCongreso}
          renderResumen={(r) => (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Cifra valor={r.total_elegibles} etiqueta="Elegibles" />
              <Cifra valor={r.emitidos_nuevos} etiqueta="Emitidos nuevos" destacada />
              <Cifra valor={r.ya_existian} etiqueta="Ya existían" />
              <Cifra valor={r.errores?.length} etiqueta="Errores" />
            </div>
          )}
        />
        <LoteCard
          titulo="Certificados de Participación"
          descripcion="Para cada integrante (principal y coautores) de los trabajos marcados como 'Presentó'."
          boton="Emitir certificados de Participación (lote)"
          ruta="participacion"
          idCongreso={idCongreso}
          renderResumen={(r) => (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Cifra valor={r.total_talks_presentadas} etiqueta="Trabajos presentados" />
              <Cifra valor={r.total_certificados_emitidos} etiqueta="Emitidos nuevos" destacada />
              <Cifra valor={r.ya_existian} etiqueta="Ya existían" />
              <Cifra valor={r.omitidos_no_confirmados} etiqueta="Omitidos (no confirmados)" />
            </div>
          )}
        />
      </div>
    </div>
  );
}
