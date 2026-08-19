import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../api/client';
import { capitalizar, formatFecha } from '../../utils/formato';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Select } from '../../components/ui/Select';
import { Alert } from '../../components/ui/Alert';
import { PageLoader } from '../../components/ui/PageLoader';

const ESTADO_TALK_VARIANT = {
  pendiente: 'pendiente',
  aceptada: 'revisado',
  rechazada: 'rechazado',
};

export function PonenciasAdmin() {
  const navigate = useNavigate();
  const [talks, setTalks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtro, setFiltro] = useState('');
  const [areas, setAreas] = useState([]);
  const [areaFiltro, setAreaFiltro] = useState('');
  const [tipos, setTipos] = useState([]);
  const [tipoFiltro, setTipoFiltro] = useState('');

  // Filtros server-side: el backend (GET /talks) soporta estado_talk e id_area combinados.
  function cargar(estado, idArea) {
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    if (estado) params.set('estado_talk', estado);
    if (idArea) params.set('id_area', idArea);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiFetch(`/talks${query}`)
      .then((data) => setTalks(data ?? []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    cargar();
    apiFetch('/areas-estudio?activo=true')
      .then((data) => setAreas(data ?? []))
      .catch((err) => setError(err.message));
    apiFetch('/tipos-participacion?activo=true')
      .then((data) => setTipos(data ?? []))
      .catch((err) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Filtro de tipo en memoria: el backend GET /talks no soporta id_tipo_participacion
  // (solo estado_talk e id_area, ver listarTodasLasTalks en el backend).
  const talksFiltradas = useMemo(() => {
    if (!tipoFiltro) return talks;
    return talks.filter((talk) => String(talk.tipo_participacion?.id_tipo_participacion) === tipoFiltro);
  }, [talks, tipoFiltro]);

  return (
    <div className="flex flex-col gap-6 pt-6">
      <div>
        <h1 className="font-sans text-2xl font-bold text-text-primary">Ponencias</h1>
        <p className="mt-1 text-sm text-text-muted">Propuestas de ponencia enviadas por los ponentes.</p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <Select label="Estado" value={filtro} onChange={handleFiltroChange} className="w-48">
          <option value="">Todas</option>
          <option value="pendiente">Pendientes</option>
          <option value="aceptada">Aceptadas</option>
          <option value="rechazada">Rechazadas</option>
        </Select>

        <Select label="Área" value={areaFiltro} onChange={handleAreaChange} className="w-56">
          <option value="">Todas las áreas</option>
          {areas.map((a) => (
            <option key={a.id_area} value={a.id_area}>
              {a.nombre}
            </option>
          ))}
        </Select>

        <Select label="Tipo" value={tipoFiltro} onChange={(e) => setTipoFiltro(e.target.value)} className="w-56">
          <option value="">Todos los tipos</option>
          {tipos.map((t) => (
            <option key={t.id_tipo_participacion} value={t.id_tipo_participacion}>
              {t.nombre}
            </option>
          ))}
        </Select>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {loading ? (
        <PageLoader />
      ) : talksFiltradas.length === 0 ? (
        <p className="text-sm text-text-muted">No hay ponencias para este filtro.</p>
      ) : (
        <Table>
          <Table.Head>
            <tr>
              <Table.HeadCell>Título</Table.HeadCell>
              <Table.HeadCell>Ponente principal</Table.HeadCell>
              <Table.HeadCell>Área</Table.HeadCell>
              <Table.HeadCell>Tipo</Table.HeadCell>
              <Table.HeadCell>Estado</Table.HeadCell>
              <Table.HeadCell>Fecha</Table.HeadCell>
            </tr>
          </Table.Head>
          <tbody>
            {talksFiltradas.map((talk) => (
              <Table.Row
                key={talk.id_talk}
                onClick={() => navigate(`/admin/ponencias/${talk.id_talk}`)}
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
      )}
    </div>
  );
}
