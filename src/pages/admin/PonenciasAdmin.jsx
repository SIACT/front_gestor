import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Globe, Search } from 'lucide-react';
import { apiFetch } from '../../api/client';
import { useCongreso } from '../../context/CongresoContext';
import { capitalizar, formatFecha } from '../../utils/formato';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Alert } from '../../components/ui/Alert';
import { PageLoader } from '../../components/ui/PageLoader';
import { Spinner } from '../../components/ui/Spinner';
import { EstadisticasPanel } from '../../components/EstadisticasPanel';

const ESTADO_TALK_VARIANT = {
  pendiente: 'pendiente',
  aceptada: 'revisado',
  rechazada: 'rechazado',
};

// Mismo criterio que el filtro `programado` del backend: una talk está programada si tiene
// un horario individual (schedules) o si es un póster agrupado en una sesión (posters).
function estaProgramada(talk) {
  return talk.schedules?.length > 0 || talk.posters?.length > 0;
}

function TalkListItem({ talk, idCongreso, subtitulo }) {
  return (
    <Link
      to={`/congresos/${idCongreso}/admin/ponencias/${talk.id_talk}`}
      className="block rounded-lg border border-border px-3 py-2 transition-colors hover:border-accent"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-text-primary">{talk.titulo}</p>
        <Badge variant={ESTADO_TALK_VARIANT[talk.estado_talk] ?? 'default'}>{talk.estado_talk}</Badge>
      </div>
      <p className="mt-1 text-xs text-text-muted">
        {talk.area?.nombre}
        {talk.tipo_participacion?.nombre && ` · ${talk.tipo_participacion.nombre}`}
      </p>
      {subtitulo && <p className="mt-1 text-xs text-text-muted">{subtitulo}</p>}
    </Link>
  );
}

function ParticipanteCard({ persona, idCongreso }) {
  const u = persona.usuario ?? {};
  const propias = persona.ponencias_propias ?? [];
  const coponencias = persona.coponencias ?? [];
  const sinPonencias = propias.length === 0 && coponencias.length === 0;

  return (
    <Card>
      <div>
        <p className="font-medium text-text-primary">
          {capitalizar(u.nombre)} {capitalizar(u.apellido)}
        </p>
        <p className="text-sm text-text-muted">{u.correo}</p>
        {u.institucion && <p className="text-xs text-text-muted">{u.institucion}</p>}
      </div>

      {propias.length > 0 && (
        <div className="mt-4">
          <h3 className="text-xs font-medium uppercase tracking-wide text-text-muted">
            Autoría
          </h3>
          <div className="mt-2 flex flex-col gap-2">
            {propias.map((talk) => (
              <TalkListItem key={talk.id_talk} talk={talk} idCongreso={idCongreso} />
            ))}
          </div>
        </div>
      )}

      {coponencias.length > 0 && (
        <div className="mt-4">
          <h3 className="text-xs font-medium uppercase tracking-wide text-text-muted">Coautoría en</h3>
          <div className="mt-2 flex flex-col gap-2">
            {coponencias.map((talk) => (
              <TalkListItem
                key={talk.id_talk}
                talk={talk}
                idCongreso={idCongreso}
                subtitulo={
                  talk.dueño_principal
                    ? `Autoría: ${capitalizar(talk.dueño_principal.nombre)} ${capitalizar(talk.dueño_principal.apellido)}`
                    : undefined
                }
              />
            ))}
          </div>
        </div>
      )}

      {sinPonencias && <p className="mt-4 text-sm text-text-muted">Sin trabajos registrados</p>}
    </Card>
  );
}

// El input vive en la fila de filtros de PonenciasAdmin; los resultados se
// renderizan aparte, debajo, a ancho completo. Este hook comparte el state entre ambos.
// queryInicial viene de la URL (?busqueda=) para sobrevivir al "atrás" del navegador.
function useBuscarParticipantes(queryInicial = '') {
  const { congreso } = useCongreso();
  const idCongreso = congreso?.id_congreso;

  const [query, setQuery] = useState(queryInicial);
  // null = sin búsqueda activa (< 2 caracteres): la sección de resultados no se renderiza.
  const [resultados, setResultados] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const texto = query.trim();
    if (texto.length < 2) {
      setResultados(null);
      setError('');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    const timeoutId = setTimeout(() => {
      apiFetch(`/congresos/${idCongreso}/participantes/buscar?q=${encodeURIComponent(texto)}`)
        .then((data) => setResultados(data ?? []))
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }, 350);

    return () => clearTimeout(timeoutId);
  }, [query, idCongreso]);

  return { idCongreso, query, setQuery, resultados, loading, error };
}

function SeccionEstadisticas() {
  const { congreso } = useCongreso();
  const idCongreso = congreso?.id_congreso;

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    apiFetch(`/congresos/${idCongreso}/estadisticas/ponencias`)
      .then((data) => setStats(data ?? null))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [idCongreso]);

  const porArea = useMemo(
    () => [...(stats?.por_area ?? [])].sort((a, b) => b.total - a.total),
    [stats],
  );

  const porTipo = useMemo(
    () => [...(stats?.por_tipo_participacion ?? [])].sort((a, b) => b.total - a.total),
    [stats],
  );

  function totalPorEstado(estado) {
    return stats?.por_estado?.find((e) => e.estado_talk === estado)?.total ?? 0;
  }

  return (
    <EstadisticasPanel
      titulo="Estadísticas de trabajos"
      totalLabel="trabajos en total"
      totalValue={stats?.total_ponencias}
      loading={loading}
      error={error}
      grupos={[
        { titulo: 'Por área', items: porArea.map((a) => ({ nombre: a.nombre, total: a.total })) },
        {
          titulo: 'Por tipo de participación',
          items: porTipo.map((t) => ({ nombre: t.nombre, total: t.total })),
        },
      ]}
      grupoBadges={{
        titulo: 'Por estado',
        items: [
          { nombre: 'Pendiente', total: totalPorEstado('pendiente'), variant: ESTADO_TALK_VARIANT.pendiente },
          { nombre: 'Aceptada', total: totalPorEstado('aceptada'), variant: ESTADO_TALK_VARIANT.aceptada },
          { nombre: 'Rechazada', total: totalPorEstado('rechazada'), variant: ESTADO_TALK_VARIANT.rechazada },
        ],
      }}
    />
  );
}

// Todos los filtros viven en la query string (?busqueda=&pais=&estado_talk=&id_area=
// &id_tipo_participacion=&programado=&pagina=): al volver del detalle con el "atrás" del
// navegador, el componente se remonta y los reconstruye desde la URL. Los cambios usan
// replace para no llenar el historial con una entrada por cada tecla o select.
export function PonenciasAdmin() {
  const navigate = useNavigate();
  const { id_congreso } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const busquedaParticipantes = useBuscarParticipantes(searchParams.get('busqueda') ?? '');
  const [talks, setTalks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [areas, setAreas] = useState([]);
  const [tipos, setTipos] = useState([]);

  const filtro = searchParams.get('estado_talk') ?? '';
  const areaFiltro = searchParams.get('id_area') ?? '';
  const tipoFiltro = searchParams.get('id_tipo_participacion') ?? '';
  const programadoFiltro = searchParams.get('programado') ?? '';
  const paginaParam = Number(searchParams.get('pagina')) || 1;

  // Los inputs de texto necesitan state local para no perder el cursor; la URL se
  // actualiza en cada tecla y el fetch del país va con debounce.
  const [paisFiltro, setPaisFiltro] = useState(() => searchParams.get('pais') ?? '');
  const [paisDebounced, setPaisDebounced] = useState(() => (searchParams.get('pais') ?? '').trim());

  // Cualquier cambio de filtro vuelve a la página 1: evita quedar "atascado" en una
  // página que ya no existe.
  function actualizarParam(clave, valor) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (valor) next.set(clave, valor);
        else next.delete(clave);
        if (clave !== 'pagina') next.delete('pagina');
        return next;
      },
      { replace: true },
    );
  }

  function setPaginaActual(pagina) {
    actualizarParam('pagina', pagina > 1 ? String(pagina) : '');
  }

  useEffect(() => {
    apiFetch(`/congresos/${id_congreso}/areas-estudio?activo=true`)
      .then((data) => setAreas(data ?? []))
      .catch((err) => setError(err.message));
    apiFetch(`/congresos/${id_congreso}/tipos-participacion?activo=true`)
      .then((data) => setTipos(data ?? []))
      .catch((err) => setError(err.message));
  }, [id_congreso]);

  // Debounce del país: mismo patrón (350ms, sin longitud mínima) ya usado para
  // país/institución en InscripcionesAdmin.jsx.
  useEffect(() => {
    const timeoutId = setTimeout(() => setPaisDebounced(paisFiltro.trim()), 350);
    return () => clearTimeout(timeoutId);
  }, [paisFiltro]);

  // Filtros server-side: GET /congresos/:id/talks/para-programacion soporta estado_talk,
  // id_area, pais (coincidencia parcial sobre el país del ponente principal) y
  // programado (ponencia individual o póster agrupado en sesión), combinables (AND).
  useEffect(() => {
    let cancelado = false;
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    if (filtro) params.set('estado_talk', filtro);
    if (areaFiltro) params.set('id_area', areaFiltro);
    if (paisDebounced) params.set('pais', paisDebounced);
    if (programadoFiltro) params.set('programado', programadoFiltro);
    apiFetch(`/congresos/${id_congreso}/talks/para-programacion?${params.toString()}`)
      .then((data) => {
        if (!cancelado) setTalks(data ?? []);
      })
      .catch((err) => {
        if (!cancelado) setError(err.message);
      })
      .finally(() => {
        if (!cancelado) setLoading(false);
      });
    return () => {
      cancelado = true;
    };
  }, [id_congreso, filtro, areaFiltro, paisDebounced, programadoFiltro]);

  function handleBusquedaChange(e) {
    const valor = e.target.value;
    busquedaParticipantes.setQuery(valor);
    actualizarParam('busqueda', valor);
  }

  function handlePaisChange(e) {
    const valor = e.target.value;
    setPaisFiltro(valor);
    actualizarParam('pais', valor);
  }

  function handleLimpiarFiltros() {
    busquedaParticipantes.setQuery('');
    setPaisFiltro('');
    setPaisDebounced('');
    setSearchParams({}, { replace: true });
  }

  const hayFiltrosActivos = Boolean(
    busquedaParticipantes.query.trim() ||
      paisFiltro.trim() ||
      filtro ||
      areaFiltro ||
      tipoFiltro ||
      programadoFiltro,
  );

  // Filtro de tipo en memoria (no server-side) para que "Mostrando X de Y" siga
  // reflejando cuántos trabajos descarta el tipo sobre los filtros del backend.
  const talksFiltradas = useMemo(() => {
    if (!tipoFiltro) return talks;
    return talks.filter(
      (talk) => String(talk.tipo_participacion?.id_tipo_participacion) === tipoFiltro,
    );
  }, [talks, tipoFiltro]);

  const PONENCIAS_POR_PAGINA = 15;
  const totalPaginas = Math.ceil(talksFiltradas.length / PONENCIAS_POR_PAGINA);
  // Una ?pagina= de la URL puede quedar fuera de rango (enlace viejo, datos que cambiaron).
  const paginaActual = Math.min(paginaParam, Math.max(totalPaginas, 1));
  const talksPagina = useMemo(() => {
    const inicio = (paginaActual - 1) * PONENCIAS_POR_PAGINA;
    return talksFiltradas.slice(inicio, inicio + PONENCIAS_POR_PAGINA);
  }, [talksFiltradas, paginaActual]);

  return (
    <div className="flex flex-col gap-6 pt-6">
      <div>
        <h1 className="font-sans text-2xl font-bold text-text-primary">Trabajos</h1>
        <p className="mt-1 text-sm text-text-muted">Propuestas de trabajos enviadas por los ponentes.</p>
      </div>

      <SeccionEstadisticas />

      <div className="flex flex-wrap items-end gap-3">
        <div className="relative w-full sm:w-64">
          <Input
            icon={<Search className="size-4" />}
            placeholder="Buscar por nombre, apellido o correo..."
            value={busquedaParticipantes.query}
            onChange={handleBusquedaChange}
          />
          {busquedaParticipantes.loading && (
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">
              <Spinner className="size-4" />
            </span>
          )}
        </div>

        <Input
          icon={<Globe className="size-4" />}
          placeholder="País..."
          value={paisFiltro}
          onChange={handlePaisChange}
          className="w-40"
        />

        <div className="w-40">
          <Select label="Estado" value={filtro} onChange={(e) => actualizarParam('estado_talk', e.target.value)}>
            <option value="">Todas</option>
            <option value="pendiente">Pendientes</option>
            <option value="aceptada">Aceptadas</option>
            <option value="rechazada">Rechazadas</option>
          </Select>
        </div>

        <div className="w-40">
          <Select label="Área" value={areaFiltro} onChange={(e) => actualizarParam('id_area', e.target.value)}>
            <option value="">Todas las áreas</option>
            {areas.map((a) => (
              <option key={a.id_area} value={a.id_area}>
                {a.nombre}
              </option>
            ))}
          </Select>
        </div>

        <div className="w-40">
          <Select
            label="Tipo"
            value={tipoFiltro}
            onChange={(e) => actualizarParam('id_tipo_participacion', e.target.value)}
          >
            <option value="">Todos los tipos</option>
            {tipos.map((t) => (
              <option key={t.id_tipo_participacion} value={t.id_tipo_participacion}>
                {t.nombre}
              </option>
            ))}
          </Select>
        </div>

        <div className="w-40">
          <Select
            label="Estado de programación"
            value={programadoFiltro}
            onChange={(e) => actualizarParam('programado', e.target.value)}
          >
            <option value="">Todas</option>
            <option value="true">Programadas</option>
            <option value="false">Sin programar</option>
          </Select>
        </div>

        {hayFiltrosActivos && (
          <Button type="button" variant="ghost" onClick={handleLimpiarFiltros}>
            Limpiar filtros
          </Button>
        )}
      </div>

      {busquedaParticipantes.error && <Alert variant="error">{busquedaParticipantes.error}</Alert>}

      {!busquedaParticipantes.error &&
        busquedaParticipantes.resultados &&
        busquedaParticipantes.resultados.length === 0 && (
          <p className="text-center text-sm text-text-muted">
            No se encontraron participantes con ese criterio de búsqueda.
          </p>
        )}

      {!busquedaParticipantes.error &&
        busquedaParticipantes.resultados &&
        busquedaParticipantes.resultados.length > 0 && (
          <div className="flex flex-col gap-4">
            {busquedaParticipantes.resultados.map((persona) => (
              <ParticipanteCard
                key={persona.id_inscripcion}
                persona={persona}
                idCongreso={busquedaParticipantes.idCongreso}
              />
            ))}
          </div>
        )}

      {error && <Alert variant="error">{error}</Alert>}

      {!loading && (
        <p className="text-sm text-text-muted">
          Mostrando {talksFiltradas.length} de {talks.length} trabajos
        </p>
      )}

      <div className="flex flex-col gap-6 border-t border-border pt-6">
        {loading ? (
          <PageLoader />
        ) : talksFiltradas.length === 0 ? (
          <p className="text-sm text-text-muted">No hay trabajos para este filtro.</p>
        ) : (
          <>
            <Table>
              <Table.Head>
                <tr>
                  <Table.HeadCell>Título</Table.HeadCell>
                  <Table.HeadCell>Autoría</Table.HeadCell>
                  <Table.HeadCell>Área</Table.HeadCell>
                  <Table.HeadCell>Tipo</Table.HeadCell>
                  <Table.HeadCell>Estado</Table.HeadCell>
                  <Table.HeadCell>Horario</Table.HeadCell>
                  <Table.HeadCell>Fecha</Table.HeadCell>
                </tr>
              </Table.Head>
              <tbody>
                {talksPagina.map((talk) => (
                  <Table.Row
                    key={talk.id_talk}
                    onClick={() => navigate(`/congresos/${id_congreso}/admin/ponencias/${talk.id_talk}`)}
                    className="cursor-pointer"
                  >
                    <Table.Cell>{talk.titulo}</Table.Cell>
                    <Table.Cell className="text-text-muted">
                      {talk.inscripcion?.usuario
                        ? `${capitalizar(talk.inscripcion.usuario.nombre)} ${capitalizar(talk.inscripcion.usuario.apellido)}`
                        : '—'}
                    </Table.Cell>
                    <Table.Cell className="text-text-muted">{talk.area?.nombre ?? '—'}</Table.Cell>
                    <Table.Cell className="text-text-muted">{talk.tipo_participacion?.nombre ?? '—'}</Table.Cell>
                    <Table.Cell>
                      <Badge variant={ESTADO_TALK_VARIANT[talk.estado_talk] ?? 'default'}>
                        {talk.estado_talk}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge variant={estaProgramada(talk) ? 'revisado' : 'default'}>
                        {estaProgramada(talk) ? 'Programada' : 'Sin programar'}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell className="text-text-muted">{formatFecha(talk.fecha_creacion)}</Table.Cell>
                  </Table.Row>
                ))}
              </tbody>
            </Table>

            {totalPaginas > 1 && (
              <div className="flex items-center justify-between pb-6">
                <p className="text-sm text-text-muted">
                  Mostrando {(paginaActual - 1) * PONENCIAS_POR_PAGINA + 1}–
                  {Math.min(paginaActual * PONENCIAS_POR_PAGINA, talksFiltradas.length)} de{' '}
                  {talksFiltradas.length} trabajos
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={paginaActual === 1}
                    onClick={() => setPaginaActual(paginaActual - 1)}
                  >
                    Anterior
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={paginaActual === totalPaginas}
                    onClick={() => setPaginaActual(paginaActual + 1)}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
