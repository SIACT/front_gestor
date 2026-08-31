import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';
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

const ESTADO_TALK_VARIANT = {
  pendiente: 'pendiente',
  aceptada: 'revisado',
  rechazada: 'rechazado',
};

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

      {sinPonencias && <p className="mt-4 text-sm text-text-muted">Sin ponencias registradas</p>}
    </Card>
  );
}

// El input vive en la fila de filtros de PonenciasAdmin; los resultados se
// renderizan aparte, debajo, a ancho completo. Este hook comparte el state entre ambos.
function useBuscarParticipantes() {
  const { congreso } = useCongreso();
  const idCongreso = congreso?.id_congreso;

  const [query, setQuery] = useState('');
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

function BarraEstadistica({ nombre, total, maximo }) {
  const ancho = total === 0 ? '2px' : `${(total / Math.max(maximo, 1)) * 100}%`;
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-text-primary">{nombre}</span>
        <span className="text-text-muted">{total}</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface">
        <div className="h-full rounded-full bg-accent" style={{ width: ancho }} />
      </div>
    </div>
  );
}

function SeccionEstadisticas() {
  const { congreso } = useCongreso();
  const idCongreso = congreso?.id_congreso;

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandido, setExpandido] = useState(false);

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
  const maxArea = Math.max(...porArea.map((a) => a.total), 1);

  const porTipo = useMemo(
    () => [...(stats?.por_tipo_participacion ?? [])].sort((a, b) => b.total - a.total),
    [stats],
  );
  const maxTipo = Math.max(...porTipo.map((t) => t.total), 1);

  function totalPorEstado(estado) {
    return stats?.por_estado?.find((e) => e.estado_talk === estado)?.total ?? 0;
  }

  return (
    <Card className="p-4!">
      <h2 className="text-sm font-medium uppercase tracking-wide text-text-muted">
        Estadísticas de ponencias
      </h2>

      {loading && (
        <div className="mt-4 flex justify-center">
          <Spinner className="size-5 text-accent" />
        </div>
      )}

      {!loading && error && (
        <Alert variant="error" className="mt-3">
          {error}
        </Alert>
      )}

      {!loading && !error && stats && (
        <div className="mt-3 flex flex-col gap-3">
          <div>
            <p className="text-2xl font-semibold text-accent">{stats.total_ponencias}</p>
            <p className="text-xs text-text-muted">ponencias en total</p>
          </div>

          {/* Siempre visible, colapsado o no: es la info más accionable de un vistazo. */}
          <div className="flex flex-wrap gap-2">
            <Badge variant={ESTADO_TALK_VARIANT.pendiente}>{totalPorEstado('pendiente')} pendiente</Badge>
            <Badge variant={ESTADO_TALK_VARIANT.aceptada}>{totalPorEstado('aceptada')} aceptada</Badge>
            <Badge variant={ESTADO_TALK_VARIANT.rechazada}>{totalPorEstado('rechazada')} rechazada</Badge>
          </div>

          <button
            type="button"
            onClick={() => setExpandido((v) => !v)}
            className="flex items-center gap-1 self-start text-xs font-medium text-accent transition-colors hover:text-accent-hover"
          >
            {expandido ? 'Ocultar detalle' : 'Ver detalle completo'}
            {expandido ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          </button>

          <motion.div
            initial={false}
            animate={{ height: expandido ? 'auto' : 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 gap-4 pt-1 md:grid-cols-2">
              <div>
                <h3 className="text-xs font-medium uppercase tracking-wide text-text-muted">Por área</h3>
                <div className="mt-2 flex max-h-64 flex-col gap-2 overflow-y-auto pr-1">
                  {porArea.map((a) => (
                    <BarraEstadistica key={a.id_area} nombre={a.nombre} total={a.total} maximo={maxArea} />
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-medium uppercase tracking-wide text-text-muted">
                  Por tipo de participación
                </h3>
                <div className="mt-2 flex max-h-64 flex-col gap-2 overflow-y-auto pr-1">
                  {porTipo.map((t) => (
                    <BarraEstadistica
                      key={t.id_tipo_participacion ?? 'sin-tipo'}
                      nombre={t.nombre}
                      total={t.total}
                      maximo={maxTipo}
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </Card>
  );
}

export function PonenciasAdmin() {
  const navigate = useNavigate();
  const { id_congreso } = useParams();
  const busquedaParticipantes = useBuscarParticipantes();
  const [talks, setTalks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtro, setFiltro] = useState('');
  const [areas, setAreas] = useState([]);
  const [areaFiltro, setAreaFiltro] = useState('');
  const [tipos, setTipos] = useState([]);
  const [tipoFiltro, setTipoFiltro] = useState('');
  const [paginaActual, setPaginaActual] = useState(1);

  // Filtros server-side: el backend (GET /talks) soporta id_congreso, estado_talk
  // e id_area, combinables entre sí.
  function cargar(estado, idArea) {
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    params.set('id_congreso', id_congreso);
    if (estado) params.set('estado_talk', estado);
    if (idArea) params.set('id_area', idArea);
    return apiFetch(`/talks?${params.toString()}`)
      .then((data) => setTalks(data ?? []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    cargar();
    apiFetch(`/congresos/${id_congreso}/areas-estudio?activo=true`)
      .then((data) => setAreas(data ?? []))
      .catch((err) => setError(err.message));
    apiFetch(`/congresos/${id_congreso}/tipos-participacion?activo=true`)
      .then((data) => setTipos(data ?? []))
      .catch((err) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id_congreso]);

  function handleFiltroChange(e) {
    const valor = e.target.value;
    setFiltro(valor);
    cargar(valor, areaFiltro);
  }

  function handleAreaChange(e) {
    const valor = e.target.value;
    setAreaFiltro(valor);
    cargar(filtro, valor);
  }

  // Los filtros server-side (estado/área) siempre implican una tabla nueva:
  // evita quedar "atascado" en una página que ya no existe.
  useEffect(() => {
    setPaginaActual(1);
  }, [filtro, areaFiltro]);

  // Filtro de tipo en memoria: el backend GET /talks no soporta id_tipo_participacion
  // (solo id_congreso, estado_talk e id_area, ver listarTodasLasTalks en el backend).
  const talksFiltradas = useMemo(() => {
    if (!tipoFiltro) return talks;
    return talks.filter(
      (talk) => String(talk.tipo_participacion?.id_tipo_participacion) === tipoFiltro,
    );
  }, [talks, tipoFiltro]);

  const PONENCIAS_POR_PAGINA = 15;
  const totalPaginas = Math.ceil(talksFiltradas.length / PONENCIAS_POR_PAGINA);
  const talksPagina = useMemo(() => {
    const inicio = (paginaActual - 1) * PONENCIAS_POR_PAGINA;
    return talksFiltradas.slice(inicio, inicio + PONENCIAS_POR_PAGINA);
  }, [talksFiltradas, paginaActual]);

  return (
    <div className="flex flex-col gap-6 pt-6">
      <div>
        <h1 className="font-sans text-2xl font-bold text-text-primary">Ponencias</h1>
        <p className="mt-1 text-sm text-text-muted">Propuestas de ponencia enviadas por los ponentes.</p>
      </div>

      <SeccionEstadisticas />

      <div className="flex flex-wrap items-end gap-3">
        <div className="relative w-full sm:w-64">
          <Input
            icon={<Search className="size-4" />}
            placeholder="Buscar por nombre, apellido o correo..."
            value={busquedaParticipantes.query}
            onChange={(e) => busquedaParticipantes.setQuery(e.target.value)}
          />
          {busquedaParticipantes.loading && (
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">
              <Spinner className="size-4" />
            </span>
          )}
        </div>

        <div className="w-40">
          <Select label="Estado" value={filtro} onChange={handleFiltroChange}>
            <option value="">Todas</option>
            <option value="pendiente">Pendientes</option>
            <option value="aceptada">Aceptadas</option>
            <option value="rechazada">Rechazadas</option>
          </Select>
        </div>

        <div className="w-40">
          <Select label="Área" value={areaFiltro} onChange={handleAreaChange}>
            <option value="">Todas las áreas</option>
            {areas.map((a) => (
              <option key={a.id_area} value={a.id_area}>
                {a.nombre}
              </option>
            ))}
          </Select>
        </div>

        <div className="w-40">
          <Select label="Tipo" value={tipoFiltro} onChange={(e) => setTipoFiltro(e.target.value)}>
            <option value="">Todos los tipos</option>
            {tipos.map((t) => (
              <option key={t.id_tipo_participacion} value={t.id_tipo_participacion}>
                {t.nombre}
              </option>
            ))}
          </Select>
        </div>
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
          Mostrando {talksFiltradas.length} de {talks.length} ponencias
        </p>
      )}

      <div className="flex flex-col gap-6 border-t border-border pt-6">
        {loading ? (
          <PageLoader />
        ) : talksFiltradas.length === 0 ? (
          <p className="text-sm text-text-muted">No hay ponencias para este filtro.</p>
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
                    <Table.Cell className="text-text-muted">{formatFecha(talk.fecha_creacion)}</Table.Cell>
                  </Table.Row>
                ))}
              </tbody>
            </Table>

            {totalPaginas > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-text-muted">
                  Mostrando {(paginaActual - 1) * PONENCIAS_POR_PAGINA + 1}–
                  {Math.min(paginaActual * PONENCIAS_POR_PAGINA, talksFiltradas.length)} de{' '}
                  {talksFiltradas.length} ponencias
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={paginaActual === 1}
                    onClick={() => setPaginaActual((p) => p - 1)}
                  >
                    Anterior
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={paginaActual === totalPaginas}
                    onClick={() => setPaginaActual((p) => p + 1)}
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
