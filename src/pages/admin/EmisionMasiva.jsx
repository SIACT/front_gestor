import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../api/client';
import { useCongreso } from '../../context/CongresoContext';
import { capitalizar, estadoInscripcionClaro } from '../../utils/formato';
import { mensajeErrorEmision } from '../../utils/mensajesCertificacion';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { Spinner } from '../../components/ui/Spinner';

// Cortes del proxy (gateway/timeout de Cloudflare o del hosting): el backend pudo seguir procesando.
const STATUS_SIN_RESPUESTA = [502, 503, 504, 524];

// La última frase depende de lo que pedía la corrida: con correo, lo que importa es no escribir
// dos veces; sin correo, no duplicar certificados.
function mensajeSinRespuesta(conCorreo) {
  return `No se recibió la respuesta del servidor. La operación puede haber continuado: revisa la lista de certificados. ${
    conCorreo
      ? 'Si la repites, solo se escribirá a las personas que aún estén pendientes.'
      : 'Si la repites, solo se emitirá lo que falte.'
  }`;
}

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

// Participación: integrantes que el lote omitió por tener la inscripción sin confirmar.
function OmitidosSinPago({ omitidos, idCongreso, bloqueado, onCertificar }) {
  return (
    <Alert variant="warning">
      <p className="font-medium">
        {omitidos.length} {omitidos.length === 1 ? 'persona no se certificó' : 'personas no se certificaron'} porque su
        inscripción no está confirmada
      </p>
      <ul className="mt-2 flex max-h-64 flex-col gap-1.5 overflow-y-auto pr-1">
        {omitidos.map((o, i) => (
          <li key={`${o.id_inscripcion}-${i}`}>
            <Link to={`/congresos/${idCongreso}/admin/inscripciones/${o.id_inscripcion}`} className="font-medium underline">
              {capitalizar(o.nombre)} {capitalizar(o.apellido)}
            </Link>{' '}
            ({estadoInscripcionClaro(o.estado_inscripcion)}) — {o.titulo_talk}
          </li>
        ))}
      </ul>
      <Button type="button" size="sm" variant="secondary" disabled={bloqueado} onClick={onCertificar} className="mt-3">
        Certificar también a estas personas
      </Button>
    </Alert>
  );
}

// loteEnCurso / onIniciar / onTerminar vienen del padre: mientras corre un lote, TODOS los botones
// de lote quedan desactivados.
function LoteCard({ titulo, descripcion, boton, ruta, idCongreso, loteEnCurso, onIniciar, onTerminar, renderResumen }) {
  // Siempre booleano (e.target.checked): el backend responde 400 a "true" como string.
  const [notificar, setNotificar] = useState(false);
  const [confirmarAbierto, setConfirmarAbierto] = useState(false);
  const [confirmarSinPagoAbierto, setConfirmarSinPagoAbierto] = useState(false);
  const [resumen, setResumen] = useState(null);
  const [error, setError] = useState(null);
  // notificar con el que se ejecutó la corrida: el segundo paso ("Certificar también…") lo reutiliza
  // tal cual, aunque la casilla haya cambiado después.
  const [notificarCorrida, setNotificarCorrida] = useState(false);

  const ejecutando = loteEnCurso === ruta;
  const bloqueado = loteEnCurso !== null;

  // Sin timeout propio: un lote grande puede tardar y cortarlo no lo detiene en el servidor.
  async function correrLote(body) {
    setConfirmarAbierto(false);
    setConfirmarSinPagoAbierto(false);
    // onIniciar es síncrono y devuelve false si ya hay un lote corriendo: evita el doble clic
    // antes de que el estado deshabilite los botones.
    if (!onIniciar(ruta)) return;
    setResumen(null);
    setError(null);
    try {
      setResumen(
        await apiFetch(`/congresos/${idCongreso}/certificacion/emitir-lote/${ruta}`, {
          method: 'POST',
          body: JSON.stringify(body),
        }),
      );
    } catch (err) {
      setError(err);
    } finally {
      onTerminar();
    }
  }

  // Corrida nueva: solo notificar (sin incluir_sin_pago).
  function ejecutar() {
    const conCorreo = notificar === true;
    setNotificarCorrida(conCorreo);
    correrLote({ notificar: conCorreo });
  }

  // Segundo paso, solo tras confirmar en el Modal: mismo notificar de la corrida anterior.
  function ejecutarIncluyendoSinPago() {
    correrLote({ notificar: notificarCorrida === true, incluir_sin_pago: true });
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
          {esRespuestaPerdida(error) ? mensajeSinRespuesta(notificarCorrida) : mensajeErrorEmision(error, idCongreso)}
        </Alert>
      )}
      {resumen && (
        <div className="flex flex-col gap-4 border-t border-border pt-4">
          {renderResumen(resumen)}
          {resumen.incluir_sin_pago === true && (
            <p className="text-sm text-text-primary">
              {resumen.emitidos_sin_pago ?? 0} certificados emitidos sin pago confirmado
            </p>
          )}
          {resumen.omitidos_sin_pago?.length > 0 && (
            <OmitidosSinPago
              omitidos={resumen.omitidos_sin_pago}
              idCongreso={idCongreso}
              bloqueado={bloqueado}
              onCertificar={() => setConfirmarSinPagoAbierto(true)}
            />
          )}
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

      <Modal
        open={confirmarSinPagoAbierto}
        onClose={() => setConfirmarSinPagoAbierto(false)}
        title="Certificar sin pago confirmado"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-text-primary">
            Se emitirán certificados a {resumen?.omitidos_sin_pago?.length ?? 0} personas con inscripción sin confirmar.
            Quedarán marcados como emitidos sin pago confirmado.
          </p>
          {notificarCorrida && <p className="text-sm text-text-primary">Además se les enviará el correo de aviso.</p>}
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="primary" autoFocus onClick={() => setConfirmarSinPagoAbierto(false)}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" disabled={bloqueado} onClick={ejecutarIncluyendoSinPago}>
              Emitir de todas formas
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
              {/* Con la lista de omitidos por pago, el bloque detallado reemplaza esta cifra; sin
                  lista (no debería pasar con omitidos > 0) se conserva como respaldo. */}
              {!(r.omitidos_sin_pago?.length > 0) && (
                <Cifra valor={r.omitidos_no_confirmados} etiqueta="Omitidos (no confirmados)" />
              )}
            </div>
          )}
        />
      </div>
    </div>
  );
}
