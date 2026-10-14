import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Check, Copy, Search } from 'lucide-react';
import clsx from 'clsx';
import { apiFetch } from '../../api/client';
import { useCongreso } from '../../context/CongresoContext';
import { ESTADO_INSCRIPCION_VARIANT, capitalizar, estadoInscripcionClaro, formatFechaHora } from '../../utils/formato';
import { BotonDescargarCertificado } from '../../components/BotonDescargarCertificado';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Alert } from '../../components/ui/Alert';
import { Spinner } from '../../components/ui/Spinner';

const LIMITE = 25;
const TIPOS_VALIDOS = ['asistencia', 'participacion'];
const BOOLEANOS_VALIDOS = ['true', 'false'];
const BUSQUEDA_MINIMA = 2;

const ETIQUETA_TIPO = { asistencia: 'Asistencia', participacion: 'Participación' };
// Por debajo de xl (laptops pequeñas, con el menú lateral abierto) el tipo se abrevia para evitar el
// scroll horizontal de la tabla.
const ETIQUETA_TIPO_CORTA = { asistencia: 'Asist.', participacion: 'Partic.' };

// Badge aplica `capitalize` (cada palabra en mayúscula): para frases se anula y se pone en
// mayúscula solo la primera letra.
const SIN_CAPITALIZAR = { textTransform: 'none' };
function primeraMayuscula(texto) {
  return texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : texto;
}

// Lo leído de la URL se valida SIEMPRE: un valor escrito a mano que no sea exacto se trata como
// "no definido", así nunca llega al backend (respondería 400 VALIDATION_ERROR).
function leerFiltros(searchParams) {
  const q = (searchParams.get('q') ?? '').trim();
  const tipo = searchParams.get('tipo');
  const notificado = searchParams.get('notificado');
  const sinPago = searchParams.get('sin_pago');
  const paginaTexto = searchParams.get('pagina') ?? '';
  const pagina = /^\d+$/.test(paginaTexto) ? Number(paginaTexto) : 0;
  return {
    q: q.length >= BUSQUEDA_MINIMA ? q : '',
    tipo: TIPOS_VALIDOS.includes(tipo) ? tipo : '',
    notificado: BOOLEANOS_VALIDOS.includes(notificado) ? notificado : '',
    sinPago: BOOLEANOS_VALIDOS.includes(sinPago) ? sinPago : '',
    pagina: Number.isSafeInteger(pagina) && pagina >= 1 ? pagina : 1,
  };
}

// URL canónica: solo valores válidos y en un orden fijo; la opción neutra (y la página 1) se omite.
function filtrosAParams({ q, tipo, notificado, sinPago, pagina }) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (tipo) params.set('tipo', tipo);
  if (notificado) params.set('notificado', notificado);
  if (sinPago) params.set('sin_pago', sinPago);
  if (pagina > 1) params.set('pagina', String(pagina));
  return params;
}

function BotonCopiarCorreo({ correo, nombre }) {
  const [estado, setEstado] = useState(null); // null | 'copiado' | 'error'
  const temporizador = useRef(null);

  useEffect(() => () => clearTimeout(temporizador.current), []);

  async function handleCopiar() {
    clearTimeout(temporizador.current);
    let resultado;
    try {
      await navigator.clipboard.writeText(correo);
      resultado = 'copiado';
    } catch {
      resultado = 'error';
    }
    setEstado(resultado);
    temporizador.current = setTimeout(() => setEstado(null), resultado === 'copiado' ? 2000 : 4000);
  }

  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={handleCopiar}
        aria-label={`Copiar correo de ${nombre}`}
        title="Copiar correo"
        className="rounded p-1 text-text-muted transition-colors hover:bg-surface hover:text-text-primary"
      >
        {estado === 'copiado' ? <Check className="size-3.5 text-success-text" /> : <Copy className="size-3.5" />}
      </button>
      {estado === 'error' && <span className="text-xs text-error-text">No se pudo copiar</span>}
    </span>
  );
}

// Vista de solo lectura de todos los certificados emitidos en el congreso. Los filtros viven en la
// query string (?q=&tipo=&notificado=&sin_pago=&pagina=): al volver del detalle de una inscripción
// con el "atrás" del navegador se reconstruyen desde la URL. Se escribe con replace para no llenar
// el historial con una entrada por cada cambio.
export function CertificadosEmitidos() {
  const { congreso } = useCongreso();
  const idCongreso = congreso?.id_congreso;
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { q, tipo, notificado, sinPago, pagina } = leerFiltros(searchParams);

  // Lo que se teclea; la búsqueda efectiva (q) llega a la URL con debounce.
  const [busquedaInput, setBusquedaInput] = useState(q);
  const [resultado, setResultado] = useState(null); // { certificados, total, pagina, limite }
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null); // { status, mensaje }
  const [reintento, setReintento] = useState(0);
  // Navegación pedida por una respuesta: { login: true } o { pagina }. Vive fuera del efecto de carga
  // para que este dependa solo de los filtros (location y setSearchParams cambian con cada URL).
  const [redireccion, setRedireccion] = useState(null);
  // Cada petición toma un número: una respuesta que no sea la última se descarta entera.
  const ultimaPeticion = useRef(0);

  const hayFiltros = Boolean(q || tipo || notificado || sinPago);

  // Única vía de escritura: parte de la URL vigente ya validada y aplica los cambios.
  function escribirFiltros(cambios) {
    setSearchParams((prev) => filtrosAParams({ ...leerFiltros(prev), ...cambios }), { replace: true });
  }

  // Filtro o búsqueda nuevos vuelven a la página 1 en la misma escritura: un render, una petición.
  function cambiarFiltro(clave, valor) {
    escribirFiltros({ [clave]: valor, pagina: 1 });
  }

  // Quita de la URL lo que no pasó la validación (?tipo=foo, ?pagina=0...). No provoca otra
  // petición: los valores ya validados no cambian.
  const canonica = filtrosAParams({ q, tipo, notificado, sinPago, pagina }).toString();
  useEffect(() => {
    if (canonica !== searchParams.toString()) setSearchParams(new URLSearchParams(canonica), { replace: true });
  }, [canonica, searchParams, setSearchParams]);

  // Debounce de la búsqueda. Cada tecla (y el desmontaje) cancela el temporizador anterior. Sin
  // cambio efectivo (al montar, o "ab" → "ab ") no se escribe nada: la página se conserva.
  useEffect(() => {
    const texto = busquedaInput.trim();
    const nuevaQ = texto.length >= BUSQUEDA_MINIMA ? texto : '';
    if (nuevaQ === q) return undefined;
    const temporizador = setTimeout(() => {
      setSearchParams((prev) => filtrosAParams({ ...leerFiltros(prev), q: nuevaQ, pagina: 1 }), { replace: true });
    }, 350);
    return () => clearTimeout(temporizador);
  }, [busquedaInput, q, setSearchParams]);

  useEffect(() => {
    if (!idCongreso) return;
    const peticion = ++ultimaPeticion.current;
    const esVigente = () => peticion === ultimaPeticion.current;

    const params = new URLSearchParams();
    if (q) params.set('busqueda', q);
    if (tipo) params.set('tipo', tipo);
    if (notificado) params.set('notificado', notificado);
    if (sinPago) params.set('emitido_sin_pago', sinPago);
    params.set('pagina', String(pagina));
    params.set('limite', String(LIMITE));

    setCargando(true);
    setError(null);
    apiFetch(`/congresos/${idCongreso}/certificacion/certificados?${params.toString()}`)
      .then((data) => {
        if (!esVigente()) return;
        const ultima = Math.max(1, Math.ceil(data.total / data.limite));
        // Página fuera de rango (enlace viejo o datos que cambiaron): se pasa a la última una vez
        // por respuesta. La página solo baja, así que no hay bucle; la carga sigue activa.
        if (data.certificados.length === 0 && data.total > 0 && pagina > ultima) {
          setRedireccion({ pagina: ultima });
          return;
        }
        setResultado(data);
        setCargando(false);
      })
      .catch((err) => {
        if (!esVigente()) return;
        if (err.status === 401) {
          setRedireccion({ login: true });
          return;
        }
        // Sin filas que ya no corresponden a los filtros pedidos.
        setResultado(null);
        setError({ status: err.status, mensaje: err.message });
        setCargando(false);
      });
  }, [idCongreso, q, tipo, notificado, sinPago, pagina, reintento]);

  useEffect(() => {
    if (!redireccion) return;
    setRedireccion(null);
    if (redireccion.login) {
      // Sesión caducada: mismo mecanismo que ProtectedRoute, para volver aquí tras el login.
      navigate('/login', { replace: true, state: { from: location } });
    } else {
      setSearchParams((prev) => filtrosAParams({ ...leerFiltros(prev), pagina: redireccion.pagina }), { replace: true });
    }
  }, [redireccion, navigate, location, setSearchParams]);

  function handleLimpiarFiltros() {
    setBusquedaInput('');
    setSearchParams({}, { replace: true });
  }

  const filas = resultado?.certificados ?? [];
  const total = resultado?.total ?? 0;
  const paginaServidor = resultado?.pagina ?? pagina;
  const limiteServidor = resultado?.limite ?? LIMITE;
  const ultimaPagina = Math.max(1, Math.ceil(total / limiteServidor));
  const inicio = (paginaServidor - 1) * limiteServidor + 1;
  const fin = inicio + filas.length - 1;
  const recargando = cargando && resultado !== null;

  const botonLimpiar = (
    <Button type="button" variant="secondary" onClick={handleLimpiarFiltros}>
      Limpiar filtros
    </Button>
  );

  return (
    <div className="flex flex-col gap-6 pt-6">
      <div>
        <h1 className="font-sans text-2xl font-bold text-text-primary">Certificados emitidos</h1>
        <p className="mt-1 text-sm text-text-muted">Todos los certificados emitidos en el congreso.</p>
      </div>

      <div className="flex flex-wrap items-start gap-3">
        <div className="w-full sm:w-72">
          <Input
            label="Buscar"
            icon={<Search className="size-4" />}
            placeholder="Nombre, correo, cédula o título..."
            value={busquedaInput}
            onChange={(e) => setBusquedaInput(e.target.value)}
          />
          <p className="mt-1 text-xs text-text-muted">Busca por nombre, correo, cédula o título del trabajo.</p>
        </div>
        <div className="w-full sm:w-44">
          <Select label="Tipo" value={tipo} onChange={(e) => cambiarFiltro('tipo', e.target.value)}>
            <option value="">Todos</option>
            <option value="asistencia">Asistencia</option>
            <option value="participacion">Participación</option>
          </Select>
        </div>
        <div className="w-full sm:w-44">
          <Select label="Aviso por correo" value={notificado} onChange={(e) => cambiarFiltro('notificado', e.target.value)}>
            <option value="">Todos</option>
            <option value="true">Notificados</option>
            <option value="false">Sin notificar</option>
          </Select>
        </div>
        <div className="w-full sm:w-64">
          <Select label="Pago" value={sinPago} onChange={(e) => cambiarFiltro('sinPago', e.target.value)}>
            <option value="">Todos</option>
            <option value="true">Emitidos sin pago confirmado</option>
            <option value="false">Con pago confirmado</option>
          </Select>
        </div>
        {hayFiltros && <div className="self-end">{botonLimpiar}</div>}
      </div>

      {error ? (
        error.status === 403 ? (
          <Alert variant="error">No tienes permiso para ver los certificados de este congreso.</Alert>
        ) : (
          <Alert variant="error" className="flex flex-wrap items-center justify-between gap-3">
            <span>{error.mensaje}</span>
            <Button type="button" size="sm" variant="secondary" onClick={() => setReintento((n) => n + 1)}>
              Reintentar
            </Button>
          </Alert>
        )
      ) : resultado === null ? (
        <div className="flex justify-center py-12 text-text-muted">
          <Spinner className="size-6" />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-text-primary">
              {total} {total === 1 ? 'certificado' : 'certificados'}
            </p>
            {recargando && <Spinner className="size-4 text-text-muted" />}
          </div>

          {filas.length === 0 ? (
            hayFiltros ? (
              <div className="flex flex-col items-start gap-3">
                <p className="text-sm text-text-muted">No hay certificados con estos filtros.</p>
                {botonLimpiar}
              </div>
            ) : (
              <p className="text-sm text-text-muted">Aún no se han emitido certificados.</p>
            )
          ) : (
            <div className={clsx('transition-opacity', recargando && 'opacity-60')} aria-busy={recargando}>
              <Table>
                <Table.Head>
                  <tr>
                    <Table.HeadCell>Persona</Table.HeadCell>
                    <Table.HeadCell>Tipo</Table.HeadCell>
                    <Table.HeadCell>Acciones</Table.HeadCell>
                    <Table.HeadCell>Trabajo</Table.HeadCell>
                    <Table.HeadCell>Inscripción</Table.HeadCell>
                    <Table.HeadCell>Emitido</Table.HeadCell>
                    <Table.HeadCell>Aviso</Table.HeadCell>
                  </tr>
                </Table.Head>
                <tbody>
                  {filas.map((c) => {
                    const nombre = `${capitalizar(c.persona.nombre)} ${capitalizar(c.persona.apellido)}`;
                    return (
                      <Table.Row key={c.id_certificado}>
                        <Table.Cell className="min-w-44 sm:min-w-56">
                          <Link
                            to={`/congresos/${idCongreso}/admin/inscripciones/${c.id_inscripcion}`}
                            className="font-medium text-text-primary hover:text-accent hover:underline"
                          >
                            {nombre}
                          </Link>
                          <div className="flex items-center gap-1">
                            <span className="max-w-40 truncate text-xs text-text-muted sm:max-w-none" title={c.persona.correo}>
                              {c.persona.correo}
                            </span>
                            <BotonCopiarCorreo correo={c.persona.correo} nombre={nombre} />
                          </div>
                        </Table.Cell>
                        <Table.Cell>
                          <abbr title={ETIQUETA_TIPO[c.tipo] ?? c.tipo} className="no-underline xl:hidden">
                            {ETIQUETA_TIPO_CORTA[c.tipo] ?? c.tipo}
                          </abbr>
                          <span className="hidden xl:inline">{ETIQUETA_TIPO[c.tipo] ?? c.tipo}</span>
                        </Table.Cell>
                        <Table.Cell>
                          <BotonDescargarCertificado
                            idCongreso={idCongreso}
                            idInscripcion={c.id_inscripcion}
                            idCertificado={c.id_certificado}
                            onNoEncontrado={() => setReintento((n) => n + 1)}
                            size="sm"
                          />
                        </Table.Cell>
                        <Table.Cell>
                          {/* Más corto en pantallas pequeñas; el título completo queda en el tooltip. */}
                          <span
                            className="block max-w-32 truncate sm:max-w-40 xl:max-w-56 2xl:max-w-xs"
                            title={c.titulo_trabajo ?? undefined}
                          >
                            {c.titulo_trabajo ?? '—'}
                          </span>
                        </Table.Cell>
                        <Table.Cell>
                          <div className="flex flex-col items-start gap-1">
                            <Badge
                              variant={ESTADO_INSCRIPCION_VARIANT[c.estado_inscripcion] ?? 'default'}
                              style={SIN_CAPITALIZAR}
                            >
                              {primeraMayuscula(estadoInscripcionClaro(c.estado_inscripcion))}
                            </Badge>
                            {/* Historial: la marca se mantiene aunque la inscripción ya esté confirmada. */}
                            {c.emitido_sin_pago === true && (
                              <Badge variant="alerta" style={SIN_CAPITALIZAR}>
                                Emitido sin pago confirmado
                              </Badge>
                            )}
                          </div>
                        </Table.Cell>
                        <Table.Cell className="min-w-36 sm:min-w-44">
                          <p>{formatFechaHora(c.fecha_emision)}</p>
                          {c.emitido_por !== null && (
                            <p className="text-xs text-text-muted">
                              por {capitalizar(c.emitido_por.nombre)} {capitalizar(c.emitido_por.apellido)}
                            </p>
                          )}
                        </Table.Cell>
                        <Table.Cell className="min-w-36 sm:min-w-44">
                          {c.notificado_en !== null ? (
                            <span>Notificado el {formatFechaHora(c.notificado_en)}</span>
                          ) : (
                            <span className="text-text-muted">Sin notificar</span>
                          )}
                        </Table.Cell>
                      </Table.Row>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          )}

          {filas.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-text-muted">
                Mostrando {inicio}-{fin} de {total}
              </p>
              {total > limiteServidor && (
                <div className="flex w-full gap-2 sm:w-auto">
                  <Button
                    className="flex-1 sm:flex-none"
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={paginaServidor <= 1 || cargando}
                    onClick={() => escribirFiltros({ pagina: paginaServidor - 1 })}
                  >
                    Anterior
                  </Button>
                  <Button
                    className="flex-1 sm:flex-none"
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={paginaServidor >= ultimaPagina || cargando}
                    onClick={() => escribirFiltros({ pagina: paginaServidor + 1 })}
                  >
                    Siguiente
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
