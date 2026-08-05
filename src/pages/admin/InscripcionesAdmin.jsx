import { useEffect, useState } from 'react';
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

export function InscripcionesAdmin() {
  const navigate = useNavigate();
  const [inscripciones, setInscripciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [busqueda, setBusqueda] = useState('');
  const [filtroActivo, setFiltroActivo] = useState('');
  const [activoFiltro, setActivoFiltro] = useState('');

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleBuscar(e) {
    e.preventDefault();
    const valor = busqueda.trim();
    setFiltroActivo(valor);
    cargar(valor, activoFiltro);
  }

  function handleLimpiar() {
    setBusqueda('');
    setFiltroActivo('');
    cargar('', activoFiltro);
  }

  function handleActivoChange(e) {
    const valor = e.target.value;
    setActivoFiltro(valor);
    cargar(filtroActivo, valor);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-sans text-2xl font-bold text-text-primary">Inscripciones</h1>
        <p className="mt-1 text-sm text-text-muted">Todas las inscripciones registradas en el sistema.</p>
      </div>

      <div className="flex flex-wrap items-end gap-2">
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
          {filtroActivo && (
            <Button type="button" variant="ghost" onClick={handleLimpiar}>
              Limpiar filtro
            </Button>
          )}
        </form>

        <Select label="Estado" value={activoFiltro} onChange={handleActivoChange} className="w-40">
          <option value="">Todas</option>
          <option value="true">Solo activas</option>
          <option value="false">Solo inactivas</option>
        </Select>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {loading ? (
        <PageLoader />
      ) : inscripciones.length === 0 ? (
        <p className="text-sm text-text-muted">
          {filtroActivo
            ? 'No se encontraron inscripciones para ese usuario.'
            : 'No hay inscripciones registradas.'}
        </p>
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
            {inscripciones.map((i) => (
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
