import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { apiFetch } from '../../api/client';
import { ESTADO_INSCRIPCION_VARIANT, capitalizar, formatCOP } from '../../utils/formato';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Alert } from '../../components/ui/Alert';
import { PageLoader } from '../../components/ui/PageLoader';

const ESTADOS_INSCRIPCION = ['pendiente', 'confirmada', 'rechazada', 'cancelada'];

export function InscripcionesAdmin() {
  const navigate = useNavigate();
  const [inscripciones, setInscripciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Server-side: GET /inscripciones soporta id_usuario y activo.
  const [busqueda, setBusqueda] = useState('');
  const [filtroActivo, setFiltroActivo] = useState('');
  const [activoFiltro, setActivoFiltro] = useState('');

  // In-memory: el backend NO soporta estado_inscripcion ni id_tipo_asistente en GET /inscripciones,
  // así que se filtran sobre los datos ya traídos (que sí respetan id_usuario/activo server-side).
  const [estadoFiltro, setEstadoFiltro] = useState('');
  const [tipoAsistenteFiltro, setTipoAsistenteFiltro] = useState('');
  const [tiposAsistente, setTiposAsistente] = useState([]);

  function cargar(idUsuario, activo) {
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    if (idUsuario) params.set('id_usuario', idUsuario);
    if (activo) params.set('activo', activo);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiFetch(`/inscripciones${query}`)
      .then((data) => setInscripciones(data ?? []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    cargar();
    apiFetch('/tipos-asistente?activo=true')
      .then((data) => setTiposAsistente(data ?? []))
      .catch((err) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const inscripcionesFiltradas = useMemo(() => {
    return inscripciones.filter((i) => {
      if (estadoFiltro && i.estado_inscripcion !== estadoFiltro) return false;
      if (tipoAsistenteFiltro && String(i.id_tipo_asistente) !== tipoAsistenteFiltro) return false;
      return true;
    });
  }, [inscripciones, estadoFiltro, tipoAsistenteFiltro]);

  function handleBuscar(e) {
    e.preventDefault();
    const valor = busqueda.trim();
    setFiltroActivo(valor);
    cargar(valor, activoFiltro);
  }

  function handleActivoChange(e) {
    const valor = e.target.value;
    setActivoFiltro(valor);
    cargar(filtroActivo, valor);
  }

  const hayFiltrosActivos = Boolean(
    filtroActivo || activoFiltro || estadoFiltro || tipoAsistenteFiltro,
  );

  function handleLimpiarFiltros() {
    setBusqueda('');
    setFiltroActivo('');
    setActivoFiltro('');
    setEstadoFiltro('');
    setTipoAsistenteFiltro('');
    cargar('', '');
  }

  return (
    <div className="flex flex-col gap-6 pt-6">
      <div>
        <h1 className="font-sans text-2xl font-bold text-text-primary">Inscripciones</h1>
        <p className="mt-1 text-sm text-text-muted">Todas las inscripciones registradas en el sistema.</p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <form className="flex flex-wrap items-end gap-2" onSubmit={handleBuscar}>
          <Input
            label="Buscar por id de usuario"
            icon={<Search className="size-4" />}
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            inputMode="numeric"
            className="max-w-xs"
          />
          <Button type="submit" variant="secondary">
            Buscar
          </Button>
        </form>

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
            Ninguna inscripción coincide con los filtros aplicados.
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
                onClick={() => navigate(`/admin/inscripciones/${i.id_inscripcion}`)}
                className="cursor-pointer"
              >
                <Table.Cell>#{i.id_inscripcion}</Table.Cell>
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
