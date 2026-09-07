import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Building2, Globe, Search } from 'lucide-react';
import { apiFetch } from '../../api/client';
import { ESTADO_INSCRIPCION_VARIANT, capitalizar, formatCOP } from '../../utils/formato';
import { ROL_PARTICIPACION } from '../../utils/roles';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Alert } from '../../components/ui/Alert';
import { PageLoader } from '../../components/ui/PageLoader';
import { Spinner } from '../../components/ui/Spinner';
import { EstadisticasPanel } from '../../components/EstadisticasPanel';

const ESTADOS_INSCRIPCION = ['pendiente', 'confirmada', 'rechazada', 'cancelada'];

function SeccionEstadisticas({ idCongreso }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    apiFetch(`/congresos/${idCongreso}/estadisticas/inscripciones`)
      .then((data) => setStats(data ?? null))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [idCongreso]);

  function totalPorEstado(estado) {
    return stats?.por_estado?.find((e) => e.estado_inscripcion === estado)?.total ?? 0;
  }

  return (
    <EstadisticasPanel
      titulo="Estadísticas de inscripciones"
      totalLabel="inscripciones en total"
      totalValue={stats?.total_inscripciones}
      loading={loading}
      error={error}
      grupos={[
        {
          titulo: 'Por tipo de asistente',
          items: [...(stats?.por_tipo_asistente ?? [])]
            .sort((a, b) => b.total - a.total)
            .map((t) => ({ nombre: t.tipo, total: t.total })),
        },
        {
          titulo: 'Por rol de participación',
          items: (stats?.por_rol_participacion ?? []).map((r) => ({ nombre: r.nombre, total: r.total })),
        },
      ]}
      grupoBadges={{
        titulo: 'Por estado',
        items: [
          { nombre: 'Pendiente', total: totalPorEstado('pendiente'), variant: ESTADO_INSCRIPCION_VARIANT.pendiente },
          { nombre: 'Confirmada', total: totalPorEstado('confirmada'), variant: ESTADO_INSCRIPCION_VARIANT.confirmada },
          { nombre: 'Rechazada', total: totalPorEstado('rechazada'), variant: ESTADO_INSCRIPCION_VARIANT.rechazada },
          { nombre: 'Cancelada', total: totalPorEstado('cancelada'), variant: ESTADO_INSCRIPCION_VARIANT.cancelada },
        ],
      }}
    />
  );
}

export function InscripcionesAdmin() {
  const navigate = useNavigate();
  const { id_congreso } = useParams();
  const [inscripciones, setInscripciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Server-side: GET /inscripciones soporta id_congreso, activo, busqueda (nombre/apellido/correo),
  // pais, institucion e id_rol_participacion.
  const [busqueda, setBusqueda] = useState('');
  const [activoFiltro, setActivoFiltro] = useState('');
  const [pais, setPais] = useState('');
  const [institucion, setInstitucion] = useState('');
  const [rolFiltro, setRolFiltro] = useState('');

  // In-memory: el backend NO soporta estado_inscripcion ni id_tipo_asistente en GET /inscripciones,
  // así que se filtran sobre los datos ya traídos (que sí respetan activo/busqueda server-side).
  const [estadoFiltro, setEstadoFiltro] = useState('');
  const [tipoAsistenteFiltro, setTipoAsistenteFiltro] = useState('');
  const [tiposAsistente, setTiposAsistente] = useState([]);

  // Solo se manda al backend con 2+ caracteres; con menos, se ignora en vez de filtrar.
  function textoBusquedaValido() {
    const texto = busqueda.trim();
    return texto.length >= 2 ? texto : '';
  }

  function cargar(activo, busquedaTexto, paisTexto, institucionTexto, rol) {
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    params.set('id_congreso', id_congreso);
    if (activo) params.set('activo', activo);
    if (busquedaTexto) params.set('busqueda', busquedaTexto);
    if (paisTexto) params.set('pais', paisTexto);
    if (institucionTexto) params.set('institucion', institucionTexto);
    if (rol) params.set('id_rol_participacion', rol);
    return apiFetch(`/inscripciones?${params.toString()}`)
      .then((data) => setInscripciones(data ?? []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    cargar();
    apiFetch(`/congresos/${id_congreso}/tipos-asistente?activo=true`)
      .then((data) => setTiposAsistente(data ?? []))
      .catch((err) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id_congreso]);

  // Debounce del texto libre: igual patrón que useBuscarParticipantes en PonenciasAdmin.jsx.
  // < 2 caracteres no dispara petición (ni siquiera al llegar a 1 desde 2+); al vaciarse sí
  // recarga, para volver a mostrar todo sujeto a los demás filtros activos.
  const esPrimerRender = useRef(true);
  useEffect(() => {
    if (esPrimerRender.current) {
      esPrimerRender.current = false;
      return;
    }
    const texto = busqueda.trim();
    if (texto.length === 1) return;
    const timeoutId = setTimeout(() => {
      cargar(activoFiltro, texto, pais.trim(), institucion.trim(), rolFiltro);
    }, 350);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda]);

  // Igual patrón de debounce que busqueda, pero sin longitud mínima: cualquier
  // carácter (incluyendo 1) dispara la petición tras el debounce.
  const esPrimerRenderPais = useRef(true);
  useEffect(() => {
    if (esPrimerRenderPais.current) {
      esPrimerRenderPais.current = false;
      return;
    }
    const timeoutId = setTimeout(() => {
      cargar(activoFiltro, textoBusquedaValido(), pais.trim(), institucion.trim(), rolFiltro);
    }, 350);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pais]);

  const esPrimerRenderInstitucion = useRef(true);
  useEffect(() => {
    if (esPrimerRenderInstitucion.current) {
      esPrimerRenderInstitucion.current = false;
      return;
    }
    const timeoutId = setTimeout(() => {
      cargar(activoFiltro, textoBusquedaValido(), pais.trim(), institucion.trim(), rolFiltro);
    }, 350);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [institucion]);

  const inscripcionesFiltradas = useMemo(() => {
    return inscripciones.filter((i) => {
      if (estadoFiltro && i.estado_inscripcion !== estadoFiltro) return false;
      if (tipoAsistenteFiltro && String(i.id_tipo_asistente) !== tipoAsistenteFiltro) return false;
      return true;
    });
  }, [inscripciones, estadoFiltro, tipoAsistenteFiltro]);

  function handleActivoChange(e) {
    const valor = e.target.value;
    setActivoFiltro(valor);
    cargar(valor, textoBusquedaValido(), pais.trim(), institucion.trim(), rolFiltro);
  }

  function handleRolChange(e) {
    const valor = e.target.value;
    setRolFiltro(valor);
    cargar(activoFiltro, textoBusquedaValido(), pais.trim(), institucion.trim(), valor);
  }

  const hayFiltrosActivos = Boolean(
    busqueda.trim() ||
      activoFiltro ||
      estadoFiltro ||
      tipoAsistenteFiltro ||
      pais.trim() ||
      institucion.trim() ||
      rolFiltro,
  );

  function handleLimpiarFiltros() {
    setBusqueda('');
    setActivoFiltro('');
    setEstadoFiltro('');
    setTipoAsistenteFiltro('');
    setPais('');
    setInstitucion('');
    setRolFiltro('');
    cargar('', '', '', '', '');
  }

  return (
    <div className="flex flex-col gap-6 pt-6">
      <div>
        <h1 className="font-sans text-2xl font-bold text-text-primary">Inscripciones</h1>
        <p className="mt-1 text-sm text-text-muted">Todas las inscripciones registradas en el sistema.</p>
      </div>

      <SeccionEstadisticas idCongreso={id_congreso} />

      <div className="flex flex-wrap items-end gap-3">
        <div className="relative w-full sm:w-64">
          <Input
            icon={<Search className="size-4" />}
            placeholder="Buscar por nombre, apellido o correo..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          {loading && (
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">
              <Spinner className="size-4" />
            </span>
          )}
        </div>

        <Input
          icon={<Globe className="size-4" />}
          placeholder="País..."
          value={pais}
          onChange={(e) => setPais(e.target.value)}
          className="w-40"
        />

        <Input
          icon={<Building2 className="size-4" />}
          placeholder="Institución..."
          value={institucion}
          onChange={(e) => setInstitucion(e.target.value)}
          className="w-48"
        />

        <Select label="Activa" value={activoFiltro} onChange={handleActivoChange} className="w-40">
          <option value="">Todas</option>
          <option value="true">Solo activas</option>
          <option value="false">Solo inactivas</option>
        </Select>

        <Select
          label="Estado"
          value={estadoFiltro}
          onChange={(e) => setEstadoFiltro(e.target.value)}
          className="w-40"
        >
          <option value="">Todos</option>
          {ESTADOS_INSCRIPCION.map((estado) => (
            <option key={estado} value={estado}>
              {capitalizar(estado)}
            </option>
          ))}
        </Select>

        <Select label="Rol" value={rolFiltro} onChange={handleRolChange} className="w-40">
          <option value="">Todos</option>
          <option value={ROL_PARTICIPACION.EXPOSITOR}>Expositor</option>
          <option value={ROL_PARTICIPACION.ASISTENTE}>Asistente</option>
        </Select>

        <Select
          label="Tipo de asistente"
          value={tipoAsistenteFiltro}
          onChange={(e) => setTipoAsistenteFiltro(e.target.value)}
          className="w-48"
        >
          <option value="">Todos los tipos</option>
          {tiposAsistente.map((t) => (
            <option key={t.id_tipo_asistente} value={t.id_tipo_asistente}>
              {t.tipo}
            </option>
          ))}
        </Select>

        {hayFiltrosActivos && (
          <Button type="button" variant="ghost" onClick={handleLimpiarFiltros}>
            Limpiar filtros
          </Button>
        )}
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {!loading && (
        <p className="text-sm text-text-muted">
          Mostrando {inscripcionesFiltradas.length} de {inscripciones.length} inscripciones
        </p>
      )}

      {loading ? (
        <PageLoader />
      ) : inscripcionesFiltradas.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface px-6 py-12 text-center">
          <p className="text-sm text-text-muted">
            {busqueda.trim().length >= 2
              ? 'Sin resultados para esa búsqueda.'
              : 'Ninguna inscripción coincide con los filtros aplicados.'}
          </p>
          {hayFiltrosActivos && (
            <Button type="button" variant="ghost" onClick={handleLimpiarFiltros}>
              Limpiar filtros
            </Button>
          )}
        </div>
      ) : (
        <Table>
          <Table.Head>
            <tr>
              <Table.HeadCell>ID</Table.HeadCell>
              <Table.HeadCell>Usuario</Table.HeadCell>
              <Table.HeadCell>Tipo</Table.HeadCell>
              <Table.HeadCell>Costo final</Table.HeadCell>
              <Table.HeadCell>Estado</Table.HeadCell>
            </tr>
          </Table.Head>
          <tbody>
            {inscripcionesFiltradas.map((i) => (
              <Table.Row
                key={i.id_inscripcion}
                onClick={() => navigate(`/congresos/${id_congreso}/admin/inscripciones/${i.id_inscripcion}`)}
                className="cursor-pointer"
              >
                <Table.Cell>{i.id_inscripcion}</Table.Cell>
                <Table.Cell className="text-text-muted">
                  {i.usuario
                    ? `${capitalizar(i.usuario.nombre)} ${capitalizar(i.usuario.apellido)}`
                    : `Usuario #${i.id_usuario}`}
                </Table.Cell>
                <Table.Cell>{i.tipo_asistente?.tipo ?? '—'}</Table.Cell>
                <Table.Cell>{formatCOP(i.costo_final)}</Table.Cell>
                <Table.Cell>
                  <Badge variant={ESTADO_INSCRIPCION_VARIANT[i.estado_inscripcion] ?? 'default'}>
                    {i.estado_inscripcion}
                  </Badge>
                  {i.activo === false && (
                    <Badge variant="default" className="ml-2">
                      Inactiva
                    </Badge>
                  )}
                </Table.Cell>
              </Table.Row>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
