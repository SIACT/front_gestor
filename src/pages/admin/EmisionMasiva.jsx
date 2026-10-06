import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../api/client';
import { useCongreso } from '../../context/CongresoContext';
import { mensajeErrorEmision } from '../../utils/mensajesCertificacion';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { Spinner } from '../../components/ui/Spinner';

// Cortes del proxy (gateway/timeout de Cloudflare o del hosting): el backend pudo seguir procesando.
const STATUS_SIN_RESPUESTA = [502, 503, 504, 524];

const MENSAJE_SIN_RESPUESTA =
  'No se recibió la respuesta del servidor. La operación puede haber continuado: revisa la lista de certificados. Si la repites, solo se escribirá a las personas que aún estén pendientes.';

// apiFetch: un fetch que lanza (red caída, conexión cortada) llega sin status; un corte del proxy
// llega con status 502/503/504/524. En ambos casos no se sabe si el lote terminó.
function esRespuestaPerdida(err) {
  return err.status === undefined || STATUS_SIN_RESPUESTA.includes(err.status);
}

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

function ResumenCorreos({ resumen, idCongreso }) {
  if (!resumen.notificar) {
    return <p className="text-sm text-text-muted">No se enviaron correos (casilla apagada).</p>;
  }
  const fallidos = resumen.correos_fallidos ?? [];
  return (
    <div className="flex flex-col gap-3 border-t border-border pt-4">
      <ul className="flex flex-col gap-1 text-sm text-text-primary">
        <li>Correos enviados: {resumen.correos_enviados ?? 0} personas</li>
        <li>Omitidos por ya notificados: {resumen.correos_omitidos_ya_notificados ?? 0} personas</li>
        <li>Correos fallidos: {fallidos.length}</li>
      </ul>
      {fallidos.length > 0 && (
        <Alert variant="warning">
          <ul className="list-disc pl-5">
            {fallidos.map((f) => (
              <li key={f.id_inscripcion}>
                <Link
                  to={`/congresos/${idCongreso}/admin/inscripciones/${f.id_inscripcion}`}
                  className="font-medium underline"
                >
                  Inscripción #{f.id_inscripcion}
                </Link>{' '}
                — {f.motivo}
              </li>
            ))}
          </ul>
          <p className="mt-2">Volver a ejecutar el lote con la casilla encendida reintenta solo a estas personas.</p>
        </Alert>
      )}
    </div>
  );
}

// loteEnCurso / onIniciar / onTerminar vienen del padre: mientras corre un lote, TODOS los botones
// de lote quedan desactivados.
function LoteCard({ titulo, descripcion, boton, ruta, idCongreso, loteEnCurso, onIniciar, onTerminar, renderResumen }) {
  // Siempre booleano (e.target.checked): el backend responde 400 a "true" como string.
  const [notificar, setNotificar] = useState(false);
  const [confirmarAbierto, setConfirmarAbierto] = useState(false);
  const [resumen, setResumen] = useState(null);
  const [error, setError] = useState(null);

  const ejecutando = loteEnCurso === ruta;
  const bloqueado = loteEnCurso !== null;

  // Sin timeout propio: un lote grande puede tardar y cortarlo no lo detiene en el servidor.
  async function ejecutar() {
    setConfirmarAbierto(false);
    // onIniciar es síncrono y devuelve false si ya hay un lote corriendo: evita el doble clic
    // antes de que el estado deshabilite los botones.
    if (!onIniciar(ruta)) return;
    setResumen(null);
    setError(null);
    try {
      setResumen(
        await apiFetch(`/congresos/${idCongreso}/certificacion/emitir-lote/${ruta}`, {
          method: 'POST',
          body: JSON.stringify({ notificar: notificar === true }),
        }),
      );
    } catch (err) {
      setError(err);
    } finally {
      onTerminar();
    }
  }

  function handleClic() {
    if (bloqueado) return;
    if (notificar) setConfirmarAbierto(true);
    else ejecutar();
  }

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <h2 className="font-sans text-lg font-semibold text-text-primary">{titulo}</h2>
        <p className="mt-1 text-sm text-text-muted">{descripcion}</p>
      </div>
      <label className="flex items-start gap-2 text-sm text-text-primary">
        <input
          type="checkbox"
          checked={notificar}
          onChange={(e) => setNotificar(e.target.checked)}
          disabled={bloqueado}
          className="mt-0.5 size-4 cursor-pointer accent-accent"
        />
        <span>
          Enviar correo a los destinatarios
          <span className="mt-0.5 block text-xs text-text-muted">
            Solo se escribe a quienes aún no han sido notificados. Quien ya recibió el aviso no recibe otro.
            Recomendado: emite primero sin correo, revisa la lista de certificados y luego vuelve a ejecutar el lote
            con la casilla encendida: solo escribirá a las personas pendientes.
          </span>
        </span>
      </label>
      <Button type="button" size="lg" loading={ejecutando} disabled={bloqueado} onClick={handleClic} className="self-start">
        {boton}
      </Button>
      {ejecutando && (
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <Spinner className="size-4 text-accent" />
          Procesando… los lotes grandes pueden tardar. No cierres esta página.
        </div>
      )}
      {error && (
        <Alert variant={esRespuestaPerdida(error) ? 'warning' : 'error'}>
          {esRespuestaPerdida(error) ? MENSAJE_SIN_RESPUESTA : mensajeErrorEmision(error, idCongreso)}
        </Alert>
      )}
      {resumen && (
        <div className="flex flex-col gap-4 border-t border-border pt-4">
          {renderResumen(resumen)}
          <ResumenCorreos resumen={resumen} idCongreso={idCongreso} />
          <ListaErrores errores={resumen.errores} idCongreso={idCongreso} />
        </div>
      )}

      <Modal open={confirmarAbierto} onClose={() => setConfirmarAbierto(false)} title="Enviar correos">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-text-primary">
            Se enviarán correos a las personas que aún no han sido notificadas. Esta acción no se puede deshacer.
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="primary" autoFocus onClick={() => setConfirmarAbierto(false)}>
              Cancelar
            </Button>
            <Button type="button" variant="secondary" disabled={bloqueado} onClick={ejecutar}>
              Emitir y enviar correos
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}

export function EmisionMasiva() {
  const { congreso } = useCongreso();
  const idCongreso = congreso?.id_congreso;
  const [loteEnCurso, setLoteEnCurso] = useState(null);
  // El ref se actualiza al instante (el estado, en el siguiente render): dos clics seguidos no
  // alcanzan a lanzar dos lotes.
  const loteEnCursoRef = useRef(null);

  function iniciarLote(ruta) {
    if (loteEnCursoRef.current) return false;
    loteEnCursoRef.current = ruta;
    setLoteEnCurso(ruta);
    return true;
  }

  function terminarLote() {
    loteEnCursoRef.current = null;
    setLoteEnCurso(null);
  }

  const comunes = { idCongreso, loteEnCurso, onIniciar: iniciarLote, onTerminar: terminarLote };

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
          {...comunes}
          titulo="Certificados de Asistencia"
          descripcion="Para cada inscripción confirmada que cumple los días de asistencia requeridos."
          boton="Emitir certificados de Asistencia (lote)"
          ruta="asistencia"
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
          {...comunes}
          titulo="Certificados de Participación"
          descripcion="Para cada integrante (principal y coautores) de los trabajos marcados como 'Presentó'."
          boton="Emitir certificados de Participación (lote)"
          ruta="participacion"
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
