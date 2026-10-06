import { useState } from 'react';
import { apiFetch } from '../api/client';
import { formatFechaHora } from '../utils/formato';
import { mensajeErrorEmision } from '../utils/mensajesCertificacion';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Alert } from './ui/Alert';

const TIPO_TEXTO = { asistencia: 'asistencia', participacion: 'participación' };

// Botón + Modal de emisión individual, compartido por el resumen de Asistencia (tipo 'asistencia')
// y el detalle de trabajo del Admin (tipo 'participacion', con idTalk). Dos vistas en el mismo
// Modal: 'confirmar' (con la casilla de correo) y 'resultado'.
export function EmitirCertificado({ idCongreso, idInscripcion, tipo, idTalk, nombrePersona, tituloTrabajo, onEmitido }) {
  const [abierto, setAbierto] = useState(false);
  const [vista, setVista] = useState('confirmar');
  // Siempre booleano (e.target.checked): el backend responde 400 a "true" como string.
  const [notificar, setNotificar] = useState(false);
  const [emitiendo, setEmitiendo] = useState(false);
  const [error, setError] = useState(null);
  const [resultado, setResultado] = useState(null);
  // ya_existia de la PRIMERA respuesta: reenviar/reintentar responde ya_existia: true, pero la línea
  // de emisión debe seguir diciendo lo que pasó al pulsar "Emitir".
  const [yaExistia, setYaExistia] = useState(false);
  const [reintentando, setReintentando] = useState(false);
  const [errorCorreo, setErrorCorreo] = useState(null);

  function abrir() {
    setVista('confirmar');
    setNotificar(false);
    setError(null);
    setResultado(null);
    setYaExistia(false);
    setErrorCorreo(null);
    setAbierto(true);
  }

  function cerrar() {
    if (emitiendo || reintentando) return;
    setAbierto(false);
    if (resultado) onEmitido?.(resultado);
  }

  function emitirConCorreo(opcionesCorreo) {
    return apiFetch(`/congresos/${idCongreso}/certificacion/emitir`, {
      method: 'POST',
      body: JSON.stringify({
        id_inscripcion: idInscripcion,
        tipo,
        ...(tipo === 'participacion' && { id_talk: idTalk }),
        ...opcionesCorreo,
      }),
    });
  }

  async function handleEmitir() {
    setEmitiendo(true);
    setError(null);
    try {
      const data = await emitirConCorreo({ notificar });
      setResultado(data);
      setYaExistia(data?.ya_existia === true);
      setVista('resultado');
    } catch (err) {
      setError(err);
    } finally {
      setEmitiendo(false);
    }
  }

  // Reenviar (ya notificado) o reintentar (falló): el certificado ya existe, solo se repite el aviso.
  async function handleCorreoDeNuevo(reenviar) {
    setReintentando(true);
    setErrorCorreo(null);
    try {
      const data = await emitirConCorreo(reenviar ? { notificar: true, reenviar_notificacion: true } : { notificar: true });
      setResultado(data);
    } catch (err) {
      setErrorCorreo(err);
    } finally {
      setReintentando(false);
    }
  }

  const tipoTexto = TIPO_TEXTO[tipo] ?? tipo;

  return (
    <>
      <Button type="button" size="sm" variant="secondary" onClick={abrir}>
        Emitir certificado
      </Button>

      <Modal open={abierto} onClose={cerrar} title="Emitir certificado">
        {vista === 'confirmar' ? (
          <div className="flex flex-col gap-4">
            <div className="text-sm text-text-primary">
              <p>
                Emitir certificado de {tipoTexto} a <span className="font-medium">{nombrePersona}</span>
              </p>
              {tituloTrabajo && <p className="mt-1 text-text-muted">Trabajo: {tituloTrabajo}</p>}
            </div>
            <label className="flex items-start gap-2 text-sm text-text-primary">
              <input
                type="checkbox"
                checked={notificar}
                onChange={(e) => setNotificar(e.target.checked)}
                disabled={emitiendo}
                className="mt-0.5 size-4 cursor-pointer accent-accent"
              />
              <span>
                Enviar correo a la persona
                <span className="block text-xs text-text-muted">
                  Le avisa que su certificado ya está disponible en la plataforma.
                </span>
              </span>
            </label>
            {error && <Alert variant="error">{mensajeErrorEmision(error, idCongreso)}</Alert>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={cerrar} disabled={emitiendo}>
                Cancelar
              </Button>
              <Button type="button" loading={emitiendo} disabled={emitiendo} onClick={handleEmitir}>
                Emitir
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <ResultadoCorreo
              resultado={resultado}
              yaExistia={yaExistia}
              reintentando={reintentando}
              onCorreoDeNuevo={handleCorreoDeNuevo}
            />
            {resultado?.codigo_verificacion && (
              <p className="text-xs text-text-muted">
                Código de verificación <span className="font-mono">{resultado.codigo_verificacion}</span>
              </p>
            )}
            {errorCorreo && <Alert variant="error">{mensajeErrorEmision(errorCorreo, idCongreso)}</Alert>}
            <div className="flex justify-end">
              <Button type="button" onClick={cerrar} disabled={reintentando}>
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

function ResultadoCorreo({ resultado, yaExistia, reintentando, onCorreoDeNuevo }) {
  const lineaEmision = yaExistia ? 'Este certificado ya estaba emitido.' : 'Certificado emitido.';

  switch (resultado?.correo) {
    case 'enviado':
      return (
        <Alert variant="success">
          {yaExistia ? 'Este certificado ya estaba emitido. Correo enviado.' : 'Certificado emitido y correo enviado.'}
        </Alert>
      );
    case 'omitido_ya_notificado':
      return (
        <>
          <Alert variant="success">{lineaEmision}</Alert>
          <Alert variant="warning">
            Ya se había avisado a esta persona el {formatFechaHora(resultado.notificado_en)}.
          </Alert>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            loading={reintentando}
            disabled={reintentando}
            onClick={() => onCorreoDeNuevo(true)}
            className="self-start"
          >
            Reenviar correo
          </Button>
        </>
      );
    case 'fallido':
      return (
        <>
          <Alert variant="warning">
            {yaExistia ? 'Este certificado ya estaba emitido' : 'Certificado emitido'}, pero el correo no se pudo
            enviar: {resultado.motivo_correo}
          </Alert>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            loading={reintentando}
            disabled={reintentando}
            onClick={() => onCorreoDeNuevo(false)}
            className="self-start"
          >
            Reintentar correo
          </Button>
        </>
      );
    default:
      // 'no_solicitado'
      return <Alert variant="success">{lineaEmision}</Alert>;
  }
}
