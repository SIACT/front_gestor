import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle } from 'lucide-react';
import { API_URL } from '../api/client';
import { formatFecha, formatFechaSolo } from '../utils/formato';
import { Logo } from '../components/ui/Logo';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import { PageLoader } from '../components/ui/PageLoader';

const TIPO_LABEL = {
  asistencia: 'Certificado de asistencia',
  participacion: 'Certificado de participación',
};

// Mismo formato que genera el backend al emitir (20 hexadecimales). Un código que no lo cumple no
// puede existir: se responde "no encontrado" sin gastar una de las 30 consultas por IP cada 15 min.
const FORMATO_CODIGO = /^[0-9a-f]{20}$/;

const normalizar = (codigo) => (codigo ?? '').trim().toLowerCase();

function Dato({ etiqueta, children }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-text-muted">{etiqueta}</p>
      <p className="mt-0.5 text-text-primary">{children}</p>
    </div>
  );
}

function Resultado({ estado, onReintentar }) {
  if (estado.fase === 'cargando') return <PageLoader />;

  if (estado.fase === 'valido') {
    const certificado = estado.certificado;
    return (
      <Card className="flex flex-col gap-5 border-success-text/40">
        <div className="flex flex-col items-center gap-3 text-center">
          <CheckCircle className="size-16 text-success-text" aria-hidden="true" />
          <p className="text-2xl font-semibold text-success-text">Certificado válido</p>
        </div>
        <div className="flex flex-col gap-3 border-t border-border pt-4">
          <Dato etiqueta="Otorgado a">{certificado.nombre_completo}</Dato>
          <Dato etiqueta="Tipo">{TIPO_LABEL[certificado.tipo] ?? certificado.tipo}</Dato>
          <Dato etiqueta="Congreso">
            {certificado.congreso?.nombre}
            {certificado.congreso?.fecha_inicio && certificado.congreso?.fecha_fin && (
              <span className="block text-sm text-text-muted">
                Del {formatFechaSolo(certificado.congreso.fecha_inicio)} al{' '}
                {formatFechaSolo(certificado.congreso.fecha_fin)}
              </span>
            )}
          </Dato>
          {certificado.tipo === 'participacion' && certificado.titulo_trabajo && (
            <Dato etiqueta="Trabajo">{certificado.titulo_trabajo}</Dato>
          )}
          <Dato etiqueta="Fecha de emisión">{formatFecha(certificado.fecha_emision)}</Dato>
        </div>
      </Card>
    );
  }

  if (estado.fase === 'no_encontrado') {
    return (
      <Card className="flex flex-col items-center gap-3 border-error-text/40 text-center">
        <XCircle className="size-16 text-error-text" aria-hidden="true" />
        <p className="text-lg font-semibold text-error-text">No se encontró ningún certificado con ese código.</p>
      </Card>
    );
  }

  if (estado.fase === 'limite') {
    return <Alert variant="warning">Demasiadas consultas. Espera unos minutos e inténtalo de nuevo.</Alert>;
  }

  if (estado.fase === 'error') {
    return (
      <div className="flex flex-col items-center gap-3">
        <Alert variant="error" className="w-full">
          No se pudo verificar el certificado. Revisa tu conexión e inténtalo de nuevo.
        </Alert>
        <Button type="button" variant="secondary" onClick={onReintentar}>
          Reintentar
        </Button>
      </div>
    );
  }

  return null;
}

// Página PÚBLICA (sin sesión, sin AuthLayout ni CongresoContext): es la que abre el QR impreso en el
// certificado (/verificar/<codigo>). El backend solo devuelve datos no sensibles y limita por IP.
export function VerificarCertificado() {
  const { codigo: codigoParam } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const codigoUrl = normalizar(codigoParam);

  // El input se precarga con el código de la URL y se resincroniza si la URL cambia.
  const [codigo, setCodigo] = useState(codigoUrl);
  const [codigoUrlPrevio, setCodigoUrlPrevio] = useState(codigoUrl);
  if (codigoUrl !== codigoUrlPrevio) {
    setCodigoUrlPrevio(codigoUrl);
    setCodigo(codigoUrl);
  }

  const [estado, setEstado] = useState({ fase: 'inactivo' });
  // Último código ya consultado. En desarrollo StrictMode ejecuta el efecto dos veces: un
  // AbortController no basta, porque la primera petición ya salió y cuenta contra el límite. Con
  // este ref la segunda ejecución sale sin pedir nada.
  const ultimoConsultado = useRef(null);

  const consultar = useCallback(async (valor, { forzar = false } = {}) => {
    if (!forzar && ultimoConsultado.current === valor) return;
    ultimoConsultado.current = valor;
    // Solo aplica su resultado la consulta más reciente.
    const vigente = () => ultimoConsultado.current === valor;

    if (!FORMATO_CODIGO.test(valor)) {
      setEstado({ fase: 'no_encontrado' });
      return;
    }

    setEstado({ fase: 'cargando' });
    try {
      // fetch directo (no apiFetch, que descarta el status) y sin cookies: la ruta es pública.
      const res = await fetch(`${API_URL}/certificacion/verificar/${encodeURIComponent(valor)}`, {
        credentials: 'omit',
      });
      if (!vigente()) return;
      if (res.status === 404) {
        setEstado({ fase: 'no_encontrado' });
        return;
      }
      if (res.status === 429) {
        setEstado({ fase: 'limite' });
        return;
      }
      const body = res.ok ? await res.json().catch(() => null) : null;
      if (!vigente()) return;
      setEstado(body?.data?.valido ? { fase: 'valido', certificado: body.data } : { fase: 'error' });
    } catch {
      if (vigente()) setEstado({ fase: 'error' });
    }
  }, []);

  useEffect(() => {
    if (codigoUrl) {
      consultar(codigoUrl);
      return;
    }
    // Enlaces antiguos con ?codigo=: se pasan al formato de ruta, que es el que imprime el QR.
    const codigoQuery = normalizar(searchParams.get('codigo'));
    if (codigoQuery) {
      navigate(`/verificar/${encodeURIComponent(codigoQuery)}`, { replace: true });
      return;
    }
    // Sin código en la URL (p. ej. al volver atrás): se olvida el último para que reabrirlo vuelva a consultar.
    ultimoConsultado.current = null;
    setEstado({ fase: 'inactivo' });
  }, [codigoUrl, consultar, navigate, searchParams]);

  function handleSubmit(e) {
    e.preventDefault();
    const valor = normalizar(codigo);
    if (!valor) return;
    // Mismo código que ya está en la URL: se relanza directo (el efecto no se volvería a disparar).
    if (valor === codigoUrl) {
      consultar(valor, { forzar: true });
      return;
    }
    // Código distinto: la URL queda compartible y el efecto sobre el parámetro hace la consulta.
    navigate(`/verificar/${encodeURIComponent(valor)}`);
  }

  return (
    <main className="min-h-screen w-full bg-background px-4 py-8">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <Logo variant="altenua" className="h-12 w-auto" />
          <div>
            <h1 className="font-display text-2xl text-text-primary">Verificar certificado</h1>
            <p className="mt-1 text-sm text-text-muted">
              Ingresa el código de verificación que aparece en el certificado.
            </p>
          </div>
        </div>

        <Resultado estado={estado} onReintentar={() => consultar(codigoUrl, { forzar: true })} />

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Input
            label="Código de verificación"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            placeholder="Ej. 5dec6e8ae45f9a59033b"
            className="font-mono"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
          />
          <Button type="submit" loading={estado.fase === 'cargando'} disabled={!codigo.trim() || estado.fase === 'cargando'}>
            Verificar
          </Button>
        </form>
      </div>
    </main>
  );
}
