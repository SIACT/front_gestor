import { useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Download } from 'lucide-react';
import clsx from 'clsx';
import { apiFetch } from '../api/client';
import { Button } from './ui/Button';
import { Spinner } from './ui/Spinner';

const MENSAJES = {
  ARCHIVO_NO_DISPONIBLE:
    'El archivo de este certificado no está disponible por ahora. Inténtalo de nuevo en unos minutos; si sigue igual, avisa a la organización.',
  CERTIFICADO_NOT_FOUND: 'No se encontró este certificado.',
  FORBIDDEN: 'No tienes permiso para descargar este certificado.',
};
const MENSAJE_GENERICO = 'No se pudo descargar. Revisa tu conexión e inténtalo de nuevo.';

// Cada clic pide un enlace firmado NUEVO (dura 60 s): el que venía en la lista caducaba si la
// pantalla quedaba abierta. Sirve igual para el dueño y para el Admin; el backend autoriza.
export function BotonDescargarCertificado({ idCongreso, idInscripcion, idCertificado, onNoEncontrado, size, className }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [descargando, setDescargando] = useState(false);
  const [error, setError] = useState('');
  // El estado tarda un render en deshabilitar el botón: el ref corta el doble clic al instante.
  const enCurso = useRef(false);

  async function handleDescargar() {
    if (enCurso.current) return;
    enCurso.current = true;
    setDescargando(true);
    setError('');
    try {
      const data = await apiFetch(
        `/congresos/${idCongreso}/certificacion/certificados/${idInscripcion}/${idCertificado}/descarga`,
      );
      // Enlace temporal en el mismo tick de la respuesta, sin pasar por estado (es un enlace firmado
      // que no debe quedar guardado ni en consola). No window.open: tras una petición asíncrona, los
      // navegadores móviles lo bloquean como ventana emergente. El backend lo sirve como adjunto.
      const enlace = document.createElement('a');
      enlace.href = data.url_descarga;
      enlace.rel = 'noopener';
      enlace.style.display = 'none';
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
    } catch (err) {
      if (err.status === 401) {
        // Sesión caducada: mismo mecanismo que ProtectedRoute, para volver aquí tras el login.
        navigate('/login', { replace: true, state: { from: location } });
        return;
      }
      setError(MENSAJES[err.code] ?? MENSAJE_GENERICO);
      if (err.code === 'CERTIFICADO_NOT_FOUND') onNoEncontrado?.();
    } finally {
      enCurso.current = false;
      setDescargando(false);
    }
  }

  return (
    <div className={clsx('flex flex-col items-end gap-1', className)}>
      <Button type="button" variant="secondary" size={size} disabled={descargando} onClick={handleDescargar}>
        {descargando ? <Spinner className="size-4" /> : <Download className="size-4" />}
        Descargar
      </Button>
      {error && (
        <p role="alert" className="max-w-xs text-right text-xs text-error-text">
          {error}
        </p>
      )}
    </div>
  );
}
