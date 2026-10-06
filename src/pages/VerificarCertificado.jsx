import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Clock, SearchX, WifiOff } from 'lucide-react';
import { API_URL } from '../api/client';
import { formatFecha, formatFechaSolo } from '../utils/formato';
import { Logo } from '../components/ui/Logo';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { IlustracionCertificado } from '../components/IlustracionCertificado';

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

function FormularioCodigo({ codigo, setCodigo, onSubmit, cargando }) {
  return (
    <Card className="flex flex-col gap-4 text-left">
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
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
        <Button type="submit" loading={cargando} disabled={!codigo.trim() || cargando} className="w-full">
          Verificar
        </Button>
      </form>
    </Card>
  );
}

function FormasHero({ tono }) {
  const color =
    tono === 'error'
      ? 'text-error-text'
      : tono === 'warning'
        ? 'text-warning-text'
        : 'text-accent';

  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-0 overflow-hidden ${color}`}>
      <svg className="absolute -right-10 -top-16 h-56 w-56 opacity-10" viewBox="0 0 240 200" fill="currentColor">
        <path d="M117 4c35-8 51 22 71 43 21 23 47 39 47 71 0 33-27 49-48 69-22 21-39 31-70 25-30-6-35-29-58-46C35 149 8 139 4 108c-4-30 21-44 39-65C62 20 86 11 117 4Z" />
      </svg>
      <svg className="absolute -bottom-20 -left-16 h-52 w-60 opacity-10" viewBox="0 0 240 200" fill="currentColor">
        <path d="M101 2c29-5 46 20 68 39 25 22 59 35 65 66 6 32-22 49-43 71-23 24-41 31-72 22-30-9-34-36-56-56C43 127 12 118 5 89-2 59 25 45 46 27 64 12 76 6 101 2Z" />
      </svg>
      <svg className="absolute right-1/3 top-1/2 h-28 w-32 opacity-[0.06]" viewBox="0 0 160 140" fill="currentColor">
        <path d="M76 3c24-4 35 17 51 32 17 16 34 29 30 51-4 20-24 30-40 43-19 15-34 12-52 1C47 119 42 99 26 85 9 70-3 58 4 39 12 19 32 18 49 10 60 5 65 5 76 3Z" />
      </svg>
    </div>
  );
}

function Hero({ estado, codigo, setCodigo, onSubmit, onReintentar }) {
  if (estado.fase === 'cargando') {
    return (
      <section className="relative flex min-h-64 items-center justify-center overflow-hidden rounded-b-[2.5rem] bg-surface px-5 py-10">
        <FormasHero tono="neutro" />
        <div className="relative flex flex-col items-center gap-4 text-center">
          <Spinner className="size-10 text-accent" />
          <p className="text-sm text-text-muted">Verificando certificado…</p>
        </div>
      </section>
    );
  }

  if (estado.fase === 'inactivo') {
    return (
      <section className="relative overflow-hidden rounded-b-[2.5rem] bg-surface px-5 py-9 sm:px-8">
        <FormasHero tono="neutro" />
        <div className="relative mx-auto flex max-w-md flex-col gap-5 text-center">
          <div>
            <h1 className="font-display text-3xl text-text-primary">Verifica tu certificado</h1>
            <p className="mt-2 text-sm text-text-muted">
              Ingresa el código de verificación que aparece en el certificado.
            </p>
          </div>
          <FormularioCodigo codigo={codigo} setCodigo={setCodigo} onSubmit={onSubmit} cargando={false} />
        </div>
      </section>
    );
  }

  const configuracion = {
    valido: {
      tono: 'valido',
      fondo: 'bg-accent/15',
      color: 'text-accent',
      Icono: CheckCircle2,
      titulo: '¡Certificado válido!',
      mensaje:
        'Este certificado fue emitido por la plataforma Altenua y su autenticidad está confirmada.',
    },
    no_encontrado: {
      tono: 'error',
      fondo: 'bg-error-bg',
      color: 'text-error-text',
      Icono: SearchX,
      titulo: 'No encontramos este certificado',
      mensaje: 'Revisa que el código esté completo o vuelve a escanear el QR del certificado.',
    },
    limite: {
      tono: 'warning',
      fondo: 'bg-warning-bg',
      color: 'text-warning-text',
      Icono: Clock,
      titulo: 'Demasiadas consultas',
      mensaje: 'Espera unos minutos e inténtalo de nuevo.',
    },
    error: {
      tono: 'warning',
      fondo: 'bg-warning-bg',
      color: 'text-warning-text',
      Icono: WifiOff,
      titulo: 'No pudimos conectarnos',
      mensaje: 'Revisa tu conexión e inténtalo de nuevo.',
    },
  }[estado.fase];

  const { tono, fondo, color, Icono, titulo, mensaje } = configuracion;
  return (
    <section className={`relative overflow-hidden rounded-b-[2.5rem] px-5 py-10 sm:px-8 ${fondo}`}>
      <FormasHero tono={tono} />
      <div className="relative mx-auto flex max-w-md flex-col items-center gap-4 text-center sm:items-end sm:text-right">
        <Icono className={`size-16 ${color}`} aria-hidden="true" />
        <div>
          <h1 className={`font-display text-3xl leading-tight ${color}`}>{titulo}</h1>
          <p className="mt-3 text-sm leading-relaxed text-text-primary">{mensaje}</p>
          {estado.fase === 'error' && (
            <Button type="button" variant="secondary" onClick={onReintentar} className="mt-4">
              Reintentar
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}

function DatosCertificado({ certificado }) {
  return (
    <Card className="flex flex-col gap-5">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Nombre completo</p>
        <p className="mt-1 font-display text-xl leading-snug text-text-primary">{certificado.nombre_completo}</p>
      </div>
      <div className="grid gap-4 border-t border-border pt-4">
        <Dato etiqueta="Tipo">{TIPO_LABEL[certificado.tipo] ?? certificado.tipo}</Dato>
        <Dato etiqueta="Congreso">
          {certificado.congreso?.nombre}
          {certificado.congreso?.fecha_inicio && certificado.congreso?.fecha_fin && (
            <span className="mt-1 block text-sm text-text-muted">
              {/* fecha_inicio/fin llegan como 'YYYY-MM-DD': formatFecha las leería como medianoche UTC y
                  en Colombia mostraría el día anterior. */}
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

function SeccionAutenticacion() {
  const [abierto, setAbierto] = useState(false);

  return (
    <section className="flex flex-col gap-3 px-1">
      <h2 className="font-display text-xl text-text-primary">Autenticación por Altenua</h2>
      <p className="text-sm leading-relaxed text-text-muted">
        Con Altenua, los congresos emiten sus certificados en PDF, enviados o disponibles para descarga por los
        participantes, sin necesidad de papel.
      </p>
      <p className="text-sm leading-relaxed text-text-muted">
        Cada certificado incluye un código QR de seguridad. Al escanearlo, cualquier persona puede verificar su
        autenticidad y validez.
      </p>
      <button
        type="button"
        aria-expanded={abierto}
        aria-controls="detalle-autenticacion"
        onClick={() => setAbierto((value) => !value)}
        className="self-start text-sm font-semibold text-accent hover:text-accent-hover"
      >
        {abierto ? 'Saber menos' : 'Saber más…'}
      </button>
      <AnimatePresence initial={false}>
        {abierto && (
          <motion.div
            id="detalle-autenticacion"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <p className="pb-1 text-sm leading-relaxed text-text-muted">
              El código QR apunta a esta página y contiene un código único de 20 caracteres que identifica el
              certificado. La verificación solo muestra el nombre del titular, el tipo de certificado, el congreso y
              la fecha de emisión. Si el código no existe en el sistema, el certificado no es auténtico.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
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
    <main className="min-h-screen w-full bg-background px-4 pb-8">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-7">
        <header className="pt-5">
          <Logo variant="altenua" className="h-8 w-auto" />
        </header>

        <Hero
          estado={estado}
          codigo={codigo}
          setCodigo={setCodigo}
          onSubmit={handleSubmit}
          onReintentar={() => consultar(codigoUrl, { forzar: true })}
        />

        {estado.fase === 'valido' && <DatosCertificado certificado={estado.certificado} />}

        {['no_encontrado', 'limite', 'error'].includes(estado.fase) && (
          <FormularioCodigo
            codigo={codigo}
            setCodigo={setCodigo}
            onSubmit={handleSubmit}
            cargando={estado.fase === 'cargando'}
          />
        )}

        <SeccionAutenticacion />
        <IlustracionCertificado />

        <footer className="border-t border-border pt-4 text-center text-xs text-text-muted">
          <Link to="/creditos" className="transition-colors hover:text-accent">
            Créditos
          </Link>
        </footer>
      </div>
    </main>
  );
}
