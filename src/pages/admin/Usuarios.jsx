import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { apiFetch } from '../../api/client';
import { capitalizar, formatFecha } from '../../utils/formato';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { DatePicker, toDateKey } from '../../components/ui/DatePicker';
import { Modal } from '../../components/ui/Modal';
import { Alert } from '../../components/ui/Alert';
import { PageLoader } from '../../components/ui/PageLoader';

const ROLES = [
  { id_rol: 1, nombre: 'Admin' },
  { id_rol: 2, nombre: 'Ponente' },
  { id_rol: 3, nombre: 'Estudiante' },
];

const ROL_BADGE = { 1: 'admin', 2: 'ponente', 3: 'estudiante' };
const ROL_LABELS = { 1: 'Admin', 2: 'Ponente', 3: 'Estudiante' };

const FORM_INICIAL = {
  nombre: '',
  apellido: '',
  correo: '',
  contrasena: '',
  cedula: '',
  institucion: '',
  id_rol: '3',
};

export function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [inscripciones, setInscripciones] = useState([]);
  const [inscripcionesError, setInscripcionesError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(FORM_INICIAL);
  const [contrasenaError, setContrasenaError] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [busqueda, setBusqueda] = useState('');
  const [rolFiltro, setRolFiltro] = useState('');
  const [fechaFiltro, setFechaFiltro] = useState(null);

  useEffect(() => {
    apiFetch('/usuarios')
      .then((data) => setUsuarios(data ?? []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

    apiFetch('/inscripciones')
      .then((data) => setInscripciones(data ?? []))
      .catch((err) => setInscripcionesError(err.message));
  }, []);

  const inscripcionesPorUsuario = useMemo(() => {
    const mapa = {};
    for (const i of inscripciones) {
      if (!mapa[i.id_usuario]) mapa[i.id_usuario] = [];
      mapa[i.id_usuario].push(i.id_inscripcion);
    }
    return mapa;
  }, [inscripciones]);

  const rolesDisponibles = useMemo(() => {
    const mapa = new Map();
    for (const u of usuarios) {
      if (!mapa.has(u.id_rol)) {
        mapa.set(u.id_rol, u.rol?.nombre ?? ROL_LABELS[u.id_rol] ?? String(u.id_rol));
      }
    }
    return Array.from(mapa.entries()).map(([id_rol, nombre]) => ({ id_rol, nombre }));
  }, [usuarios]);

  const usuariosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return usuarios.filter((u) => {
      if (texto) {
        const campo = `${u.nombre} ${u.apellido} ${u.correo}`.toLowerCase();
        if (!campo.includes(texto)) return false;
      }
      if (rolFiltro && String(u.id_rol) !== rolFiltro) return false;
      if (fechaFiltro) {
        if (!u.fecha_registro || toDateKey(new Date(u.fecha_registro)) !== fechaFiltro) return false;
      }
      return true;
    });
  }, [usuarios, busqueda, rolFiltro, fechaFiltro]);

  const hayFiltrosActivos = Boolean(busqueda || rolFiltro || fechaFiltro);

  function handleLimpiarFiltros() {
    setBusqueda('');
    setRolFiltro('');
    setFechaFiltro(null);
  }

  async function handleRolChange(idUsuario, idRol) {
    try {
      const actualizado = await apiFetch(`/usuarios/${idUsuario}/rol`, {
        method: 'PATCH',
        body: JSON.stringify({ id_rol: Number(idRol) }),
      });
      setUsuarios((prev) =>
        prev.map((u) => (u.id_usuario === idUsuario ? { ...u, ...actualizado } : u)),
      );
    } catch (err) {
      setError(err.message);
    }
  }

  function handleAbrirModal() {
    setForm(FORM_INICIAL);
    setContrasenaError('');
    setFormError('');
    setModalOpen(true);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleCedulaChange(e) {
    const soloDigitos = e.target.value.replace(/\D/g, '');
    setForm((prev) => ({ ...prev, cedula: soloDigitos }));
  }

  function handleContrasenaChange(e) {
    const { value } = e.target;
    setForm((prev) => ({ ...prev, contrasena: value }));
    if (contrasenaError) setContrasenaError('');
  }

  async function handleCrear(e) {
    e.preventDefault();
    setFormError('');

    if (form.contrasena.length < 8) {
      setContrasenaError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    setContrasenaError('');

    setSubmitting(true);
    try {
      const nuevo = await apiFetch('/auth/usuarios', {
        method: 'POST',
        body: JSON.stringify({
          nombre: form.nombre,
          apellido: form.apellido,
          correo: form.correo,
          contrasena: form.contrasena,
          cedula: form.cedula || undefined,
          institucion: form.institucion || undefined,
          id_rol: Number(form.id_rol),
        }),
      });
      setUsuarios((prev) => [...prev, nuevo]);
      setModalOpen(false);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <PageLoader />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-sans text-2xl font-bold text-text-primary">Usuarios</h1>
          <p className="mt-1 text-sm text-text-muted">Gestiona las cuentas y roles del sistema.</p>
        </div>
        <Button type="button" variant="primary" onClick={handleAbrirModal}>
          Crear usuario
        </Button>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {inscripcionesError && (
        <Alert variant="warning">
          No se pudo cargar la columna de inscripciones: {inscripcionesError}
        </Alert>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <Input
          label="Buscar"
          icon={<Search className="size-4" />}
          placeholder="Nombre, apellido o correo..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-64"
        />
        <Select
          label="Rol"
          value={rolFiltro}
          onChange={(e) => setRolFiltro(e.target.value)}
          className="w-40"
        >
          <option value="">Todos los roles</option>
          {rolesDisponibles.map((r) => (
            <option key={r.id_rol} value={r.id_rol}>
              {r.nombre}
            </option>
          ))}
        </Select>
        <DatePicker
          label="Fecha de registro"
          value={fechaFiltro}
          onChange={setFechaFiltro}
          placeholder="Cualquier fecha"
        />
        {hayFiltrosActivos && (
          <Button type="button" variant="ghost" onClick={handleLimpiarFiltros}>
            Limpiar filtros
          </Button>
        )}
      </div>

      <p className="text-sm text-text-muted">
        Mostrando {usuariosFiltrados.length} de {usuarios.length} usuarios
      </p>

      {usuariosFiltrados.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface px-6 py-12 text-center">
          <p className="text-sm text-text-muted">Ningún usuario coincide con los filtros aplicados.</p>
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
              <Table.HeadCell>Nombre</Table.HeadCell>
              <Table.HeadCell>Correo</Table.HeadCell>
              <Table.HeadCell>Rol</Table.HeadCell>
              <Table.HeadCell>Inscripciones</Table.HeadCell>
              <Table.HeadCell>Registrado</Table.HeadCell>
              <Table.HeadCell>Cambiar rol</Table.HeadCell>
            </tr>
          </Table.Head>
          <tbody>
            {usuariosFiltrados.map((u) => {
              const idsInscripciones = inscripcionesPorUsuario[u.id_usuario];
              return (
                <Table.Row key={u.id_usuario}>
                  <Table.Cell>
                    {capitalizar(u.nombre)} {capitalizar(u.apellido)}
                  </Table.Cell>
                  <Table.Cell className="text-text-muted">{u.correo}</Table.Cell>
                  <Table.Cell>
                    <Badge variant={ROL_BADGE[u.id_rol] ?? 'default'}>
                      {u.rol?.nombre ?? ROL_LABELS[u.id_rol] ?? u.id_rol}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>
                    {inscripcionesError ? (
                      <span className="text-text-muted">No disponible</span>
                    ) : !idsInscripciones || idsInscripciones.length === 0 ? (
                      <span className="text-text-muted">Sin inscripciones</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {idsInscripciones.map((idInscripcion) => (
                          <Link key={idInscripcion} to={`/admin/inscripciones/${idInscripcion}`}>
                            <Badge
                              variant="default"
                              className="cursor-pointer transition-colors hover:border-accent hover:text-accent"
                            >
                              #{idInscripcion}
                            </Badge>
                          </Link>
                        ))}
                      </div>
                    )}
                  </Table.Cell>
                  <Table.Cell className="text-text-muted">
                    {u.fecha_registro ? formatFecha(u.fecha_registro) : '—'}
                  </Table.Cell>
                  <Table.Cell>
                    <Select
                      value={u.id_rol}
                      onChange={(e) => handleRolChange(u.id_usuario, e.target.value)}
                      className="w-36"
                    >
                      {ROLES.map((r) => (
                        <option key={r.id_rol} value={r.id_rol}>
                          {r.nombre}
                        </option>
                      ))}
                    </Select>
                  </Table.Cell>
                </Table.Row>
              );
            })}
          </tbody>
        </Table>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Crear usuario">
        <form className="flex flex-col gap-3" onSubmit={handleCrear}>
          {formError && <Alert variant="error">{formError}</Alert>}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              name="nombre"
              label="Nombre"
              value={form.nombre}
              onChange={handleChange}
              required
            />
            <Input
              name="apellido"
              label="Apellido"
              value={form.apellido}
              onChange={handleChange}
              required
            />
          </div>

          <Input
            name="correo"
            type="email"
            label="Correo electrónico"
            value={form.correo}
            onChange={handleChange}
            required
          />

          <Input
            name="contrasena"
            type="password"
            label="Contraseña"
            minLength={8}
            value={form.contrasena}
            onChange={handleContrasenaChange}
            error={contrasenaError}
            required
          />

          <Input
            name="cedula"
            label="Cédula (opcional)"
            inputMode="numeric"
            value={form.cedula}
            onChange={handleCedulaChange}
          />

          <Input
            name="institucion"
            label="Institución (opcional)"
            value={form.institucion}
            onChange={handleChange}
          />

          <Select name="id_rol" label="Rol" value={form.id_rol} onChange={handleChange}>
            {ROLES.map((r) => (
              <option key={r.id_rol} value={r.id_rol}>
                {r.nombre}
              </option>
            ))}
          </Select>

          <Button type="submit" variant="primary" loading={submitting} className="mt-2 w-full">
            Crear usuario
          </Button>
        </form>
      </Modal>
    </div>
  );
}
