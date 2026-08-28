import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Search } from 'lucide-react';
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
            Ponencias propias
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
          <h3 className="text-xs font-medium uppercase tracking-wide text-text-muted">Coponente en</h3>
          <div className="mt-2 flex flex-col gap-2">
            {coponencias.map((talk) => (
              <TalkListItem
                key={talk.id_talk}
                talk={talk}
                idCongreso={idCongreso}
                subtitulo={
                  talk.dueño_principal
                    ? `Autor principal: ${capitalizar(talk.dueño_principal.nombre)} ${capitalizar(talk.dueño_principal.apellido)}`
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

function SeccionBuscarParticipante() {
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

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-sans text-lg font-semibold text-text-primary">Buscar participante</h2>

      <div className="relative max-w-md">
        <Input
          icon={<Search className="size-4" />}
          placeholder="Buscar por nombre, apellido o correo..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {loading && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">
            <Spinner className="size-4" />
          </span>
        )}
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {!error && resultados && resultados.length === 0 && (
        <p className="text-center text-sm text-text-muted">
          No se encontraron participantes con ese criterio de búsqueda.
        </p>
      )}

      {!error && resultados && resultados.length > 0 && (
        <div className="flex flex-col gap-4">
          {resultados.map((persona) => (
            <ParticipanteCard key={persona.id_inscripcion} persona={persona} idCongreso={idCongreso} />
          ))}
        </div>
      )}
    </div>
  );
}

export function PonenciasAdmin() {
  const navigate = useNavigate();
  const { id_congreso } = useParams();
  const [talks, setTalks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtro, setFiltro] = useState('');
  const [areas, setAreas] = useState([]);
  const [areaFiltro, setAreaFiltro] = useState('');
  const [tipos, setTipos] = useState([]);
  const [tipoFiltro, setTipoFiltro] = useState('');
  const [busqueda, setBusqueda] = useState('');

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

  // Filtro de tipo y de texto libre, ambos en memoria: el backend GET /talks solo
  // soporta id_congreso, estado_talk e id_area (ver listarTodasLasTalks en el backend).
  const talksFiltradas = useMemo(() => {
    let resultado = talks;

    if (tipoFiltro) {
      resultado = resultado.filter(
        (talk) => String(talk.tipo_participacion?.id_tipo_participacion) === tipoFiltro,
      );
    }

    const texto = busqueda.trim().toLowerCase();
    if (texto) {
      resultado = resultado.filter((talk) => {
        const nombrePonente = talk.inscripcion?.usuario
          ? `${talk.inscripcion.usuario.nombre} ${talk.inscripcion.usuario.apellido}`
          : '';
        return (
          talk.titulo?.toLowerCase().includes(texto) || nombrePonente.toLowerCase().includes(texto)
        );
      });
    }

    return resultado;
  }, [talks, tipoFiltro, busqueda]);

  return (
    <div className="flex flex-col gap-6 pt-6">
      <div>
        <h1 className="font-sans text-2xl font-bold text-text-primary">Ponencias</h1>
        <p className="mt-1 text-sm text-text-muted">Propuestas de ponencia enviadas por los ponentes.</p>
      </div>

      <SeccionBuscarParticipante />

      <div className="flex flex-col gap-6 border-t border-border pt-6">
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

          <Input
            label="Buscar"
            icon={<Search className="size-4" />}
            placeholder="Buscar por título o ponente..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-64"
          />
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        {!loading && (
          <p className="text-sm text-text-muted">
            Mostrando {talksFiltradas.length} de {talks.length} ponencias
          </p>
        )}

        {loading ? (
          <PageLoader />
        ) : talksFiltradas.length === 0 ? (
          busqueda.trim() ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface px-6 py-12 text-center">
              <p className="text-sm text-text-muted">Ninguna ponencia coincide con tu búsqueda.</p>
              <Button type="button" variant="ghost" onClick={() => setBusqueda('')}>
                Limpiar búsqueda
              </Button>
            </div>
          ) : (
            <p className="text-sm text-text-muted">No hay ponencias para este filtro.</p>
          )
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
        )}
      </div>
    </div>
  );
}
