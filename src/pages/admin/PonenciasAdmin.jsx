import { useEffect, useState } from 'react';
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

  function cargar(estado) {
    setLoading(true);
    setError('');
    const query = estado ? `?estado_talk=${estado}` : '';
    return apiFetch(`/talks${query}`)
      .then((data) => setTalks(data ?? []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleFiltroChange(e) {
    const valor = e.target.value;
    setFiltro(valor);
    cargar(valor);
  }

  return (
    <div className="flex flex-col gap-6 pt-6">
      <div>
        <h1 className="font-sans text-2xl font-bold text-text-primary">Ponencias</h1>
        <p className="mt-1 text-sm text-text-muted">Propuestas de ponencia enviadas por los ponentes.</p>
      </div>

      <Select label="Estado" value={filtro} onChange={handleFiltroChange} className="w-48">
        <option value="">Todas</option>
        <option value="pendiente">Pendientes</option>
        <option value="aceptada">Aceptadas</option>
        <option value="rechazada">Rechazadas</option>
      </Select>

      {error && <Alert variant="error">{error}</Alert>}

      {loading ? (
        <PageLoader />
      ) : talks.length === 0 ? (
        <p className="text-sm text-text-muted">No hay ponencias para este filtro.</p>
      ) : (
        <Table>
          <Table.Head>
            <tr>
              <Table.HeadCell>Título</Table.HeadCell>
              <Table.HeadCell>Ponente principal</Table.HeadCell>
              <Table.HeadCell>Estado</Table.HeadCell>
              <Table.HeadCell>Fecha</Table.HeadCell>
            </tr>
          </Table.Head>
          <tbody>
            {talks.map((talk) => (
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
