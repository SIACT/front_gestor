import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ClipboardList, MapPin, Mic, Pencil, UserCog } from 'lucide-react';
import { apiFetch } from '../api/client';
import { useCongreso } from '../context/CongresoContext';
import { capitalizar, formatFecha } from '../utils/formato';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Select } from '../components/ui/Select';
import { DatePicker } from '../components/ui/DatePicker';
import { Modal } from '../components/ui/Modal';
import { Alert } from '../components/ui/Alert';
import { Table } from '../components/ui/Table';

const ESTADOS_CONGRESO = ['planeacion', 'activo', 'finalizado'];

const ADMIN_CONGRESO_ERROR_MESSAGES = {
  CONGRESO_NOT_FOUND: 'Este congreso ya no existe.',
  USUARIO_NOT_FOUND: 'No existe ningún usuario con ese correo.',
  ALREADY_GLOBAL_ADMIN: 'Este usuario ya es Admin Global, no necesita este rol.',
  YA_ES_ADMIN_DE_ESTE_CONGRESO: 'Este usuario ya administra este congreso.',
};

function toDateInputValue(value) {
  if (!value) return null;
  return String(value).slice(0, 10);
}

function congresoToForm(congreso) {
  return {
    nombre: congreso.nombre ?? '',
    fecha_inicio: toDateInputValue(congreso.fecha_inicio),
    fecha_fin: toDateInputValue(congreso.fecha_fin),
    lugar: congreso.lugar ?? '',
    descripcion: congreso.descripcion ?? '',
    area: congreso.area_congreso ?? '',
    pais: congreso.pais_congreso ?? '',
    porcentaje_min_asistencia:
      congreso.porcentaje_min_asistencia != null ? String(congreso.porcentaje_min_asistencia) : '',
    imagen_url: congreso.imagen_url ?? '',
    estado: congreso.estado ?? 'planeacion',
    activo: congreso.activo ?? true,
  };
}

function SeccionEditarCongreso({ congreso }) {
  const { refrescarCongreso } = useCongreso();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(() => congresoToForm(congreso));
  const [formError, setFormError] = useState('');
  const [dateRangeError, setDateRangeError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handleAbrir() {
    setForm(congresoToForm(congreso));
    setFormError('');
    setDateRangeError('');
    setModalOpen(true);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    setDateRangeError('');

    const original = congresoToForm(congreso);
    const cambios = {};
    if (form.nombre !== original.nombre) cambios.nombre = form.nombre;
    if (form.fecha_inicio !== original.fecha_inicio) cambios.fecha_inicio = form.fecha_inicio;
    if (form.fecha_fin !== original.fecha_fin) cambios.fecha_fin = form.fecha_fin;
    if (form.lugar !== original.lugar) cambios.lugar = form.lugar;
    if (form.descripcion !== original.descripcion) cambios.descripcion = form.descripcion || null;
    if (form.area !== original.area) cambios.area = form.area || null;
    if (form.pais !== original.pais) cambios.pais = form.pais || null;
    if (form.porcentaje_min_asistencia !== original.porcentaje_min_asistencia) {
      cambios.porcentaje_min_asistencia = form.porcentaje_min_asistencia
        ? Number(form.porcentaje_min_asistencia)
        : null;
    }
    if (form.imagen_url !== original.imagen_url) cambios.imagen_url = form.imagen_url || null;
    if (form.estado !== original.estado) cambios.estado = form.estado;
    if (form.activo !== original.activo) cambios.activo = form.activo;

    if (Object.keys(cambios).length === 0) {
      setModalOpen(false);
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch(`/congresos/${congreso.id_congreso}`, {
        method: 'PATCH',
        body: JSON.stringify(cambios),
      });
      await refrescarCongreso();
      setModalOpen(false);
    } catch (err) {
      if (err.code === 'INVALID_DATE_RANGE') {
        setDateRangeError(err.message);
      } else {
        setFormError(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button type="button" variant="secondary" onClick={handleAbrir}>
        <Pencil className="size-4" />
        Editar congreso
      </Button>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Editar congreso">
        <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
          {formError && <Alert variant="error">{formError}</Alert>}

          <Input name="nombre" label="Nombre" value={form.nombre} onChange={handleChange} required />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DatePicker
              label="Fecha inicio"
              value={form.fecha_inicio}
              onChange={(value) => setForm((prev) => ({ ...prev, fecha_inicio: value }))}
            />
            <DatePicker
              label="Fecha fin"
              value={form.fecha_fin}
              onChange={(value) => setForm((prev) => ({ ...prev, fecha_fin: value }))}
            />
          </div>
          {dateRangeError && <Alert variant="error">{dateRangeError}</Alert>}

          <Input name="lugar" label="Lugar" value={form.lugar} onChange={handleChange} required />

          <Textarea
            name="descripcion"
            label="Descripción (opcional)"
            value={form.descripcion}
            onChange={handleChange}
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input name="area" label="Área (opcional)" value={form.area} onChange={handleChange} />
            <Input name="pais" label="País (opcional)" value={form.pais} onChange={handleChange} />
          </div>

          <Input
            name="porcentaje_min_asistencia"
            type="number"
            min="0"
            max="100"
            label="% mínimo de asistencia (opcional)"
            value={form.porcentaje_min_asistencia}
            onChange={handleChange}
          />

          <Input
            name="imagen_url"
            label="URL de imagen (opcional)"
            value={form.imagen_url}
            onChange={handleChange}
          />

          <Select name="estado" label="Estado" value={form.estado} onChange={handleChange}>
            {ESTADOS_CONGRESO.map((estado) => (
              <option key={estado} value={estado}>
                {capitalizar(estado)}
              </option>
            ))}
          </Select>

          <label className="flex items-center gap-2 text-sm text-text-primary">
            <input
              type="checkbox"
              checked={form.activo}
              onChange={(e) => setForm((prev) => ({ ...prev, activo: e.target.checked }))}
              className="size-4 rounded border-border bg-surface accent-accent"
            />
            Activo
          </label>

          <Button type="submit" variant="primary" loading={submitting} className="mt-2 w-full">
            Guardar cambios
          </Button>
        </form>
      </Modal>
    </>
  );
}

function SeccionAdministradores() {
  const { id_congreso } = useParams();
  const { adminsDelCongreso, setAdminsDelCongreso } = useCongreso();
  const [loading, setLoading] = useState(adminsDelCongreso === null);
  const [error, setError] = useState('');
  const admins = adminsDelCongreso ?? [];

  useEffect(() => {
    if (adminsDelCongreso !== null) return;
    setLoading(true);
    apiFetch(`/congresos/${id_congreso}/admins`)
      .then((data) => setAdminsDelCongreso(data ?? []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id_congreso]);

  const [confirmandoRevocar, setConfirmandoRevocar] = useState(null);
  const [revocando, setRevocando] = useState(false);
  const [revocarError, setRevocarError] = useState('');

  async function handleConfirmarRevocar() {
    const idUsuario = confirmandoRevocar.id_usuario ?? confirmandoRevocar.usuario?.id_usuario;
    setRevocarError('');
    setRevocando(true);
    try {
      await apiFetch(`/congresos/${id_congreso}/admins/${idUsuario}`, { method: 'DELETE' });
      setAdminsDelCongreso((prev) =>
        (prev ?? []).filter((a) => (a.id_usuario ?? a.usuario?.id_usuario) !== idUsuario),
      );
      setConfirmandoRevocar(null);
    } catch (err) {
      setRevocarError(err.message);
    } finally {
      setRevocando(false);
    }
  }

  const [correo, setCorreo] = useState('');
  const [otorgando, setOtorgando] = useState(false);
  const [otorgarError, setOtorgarError] = useState('');
  const [otorgarExito, setOtorgarExito] = useState('');

  async function handleOtorgar(e) {
    e.preventDefault();
    setOtorgarError('');
    setOtorgarExito('');
    setOtorgando(true);
    try {
      const nuevo = await apiFetch(`/congresos/${id_congreso}/admins`, {
        method: 'POST',
        body: JSON.stringify({ correo }),
      });
      setAdminsDelCongreso((prev) => [...(prev ?? []), nuevo]);
      setOtorgarExito(
        'Acceso otorgado. El usuario deberá volver a iniciar sesión para que sus nuevos permisos tomen efecto.',
      );
      setCorreo('');
    } catch (err) {
      setOtorgarError(ADMIN_CONGRESO_ERROR_MESSAGES[err.code] ?? err.message);
    } finally {
      setOtorgando(false);
    }
  }

  return (
    <Card>
      <div className="flex items-center gap-2">
        <UserCog className="size-5 text-accent" />
        <h2 className="font-sans text-lg font-semibold text-text-primary">
          Administradores de este congreso
        </h2>
      </div>

      {error && (
        <Alert variant="error" className="mt-4">
          {error}
        </Alert>
      )}

      {!error && loading ? (
        <p className="mt-4 text-sm text-text-muted">Cargando…</p>
      ) : (
        !error && (
          <>
            {admins.length === 0 ? (
              <p className="mt-4 text-sm text-text-muted">
                Nadie más administra este congreso todavía.
              </p>
            ) : (
              <div className="mt-4">
                <Table>
                  <Table.Head>
                    <tr>
                      <Table.HeadCell>Nombre</Table.HeadCell>
                      <Table.HeadCell>Correo</Table.HeadCell>
                      <Table.HeadCell>Otorgado</Table.HeadCell>
                      <Table.HeadCell></Table.HeadCell>
                    </tr>
                  </Table.Head>
                  <tbody>
                    {admins.map((a) => {
                      const u = a.usuario ?? a;
                      const idUsuario = a.id_usuario ?? u.id_usuario;
                      return (
                        <Table.Row key={idUsuario}>
                          <Table.Cell>
                            {capitalizar(u.nombre)} {capitalizar(u.apellido)}
                          </Table.Cell>
                          <Table.Cell className="text-text-muted">{u.correo}</Table.Cell>
                          <Table.Cell className="text-text-muted">{formatFecha(a.otorgado_en)}</Table.Cell>
                          <Table.Cell>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                setRevocarError('');
                                setConfirmandoRevocar(a);
                              }}
                            >
                              Revocar
                            </Button>
                          </Table.Cell>
                        </Table.Row>
                      );
                    })}
                  </tbody>
                </Table>
              </div>
            )}

            <p className="mt-3 text-xs text-text-muted">
              Revocar no cambia el rol del usuario automáticamente — si necesitas volver a
              asignarle Asistente/Expositor, hazlo desde /admin/usuarios.
            </p>

            <form className="mt-6 flex items-end gap-2 border-t border-border pt-4" onSubmit={handleOtorgar}>
              <Input
                type="email"
                label="Otorgar acceso por correo"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                required
                className="flex-1"
              />
              <Button type="submit" variant="primary" loading={otorgando}>
                Otorgar acceso
              </Button>
            </form>
            {otorgarError && (
              <Alert variant="error" className="mt-2">
                {otorgarError}
              </Alert>
            )}
            {otorgarExito && (
              <Alert variant="success" className="mt-2">
                {otorgarExito}
              </Alert>
            )}
          </>
        )
      )}

      <Modal
        open={Boolean(confirmandoRevocar)}
        onClose={() => setConfirmandoRevocar(null)}
        title="Revocar acceso"
      >
        <div className="flex flex-col gap-4">
          {revocarError && <Alert variant="error">{revocarError}</Alert>}
          <p className="text-sm text-text-primary">
            ¿Revocar el acceso de administración a{' '}
            {capitalizar((confirmandoRevocar?.usuario ?? confirmandoRevocar)?.nombre)}{' '}
            {capitalizar((confirmandoRevocar?.usuario ?? confirmandoRevocar)?.apellido)} sobre este
            congreso?
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setConfirmandoRevocar(null)}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" loading={revocando} onClick={handleConfirmarRevocar}>
              Revocar
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}

export function CongresoOverview() {
  const { id_congreso } = useParams();
  const navigate = useNavigate();
  const { congreso, puedeAdministrarCongreso, esAdminGlobal, esExpositorEnEsteCongreso } = useCongreso();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 py-6">
      <Card>
        <div className="flex items-start justify-between gap-3">
          <h1 className="font-sans text-2xl font-bold text-text-primary">{congreso?.nombre}</h1>
          <div className="flex items-center gap-2">
            <Badge variant={congreso?.activo ? 'revisado' : 'default'}>
              {congreso?.activo ? 'Activo' : 'Inactivo'}
            </Badge>
            {puedeAdministrarCongreso && <SeccionEditarCongreso congreso={congreso} />}
          </div>
        </div>

        {congreso?.descripcion && (
          <p className="mt-3 text-sm text-text-muted">{congreso.descripcion}</p>
        )}

        <dl className="mt-5 flex flex-col gap-2 text-sm">
          <div className="flex items-center gap-2 text-text-primary">
            <span className="text-text-muted">Fechas:</span>
            {formatFecha(congreso?.fecha_inicio)} — {formatFecha(congreso?.fecha_fin)}
          </div>
          {congreso?.lugar && (
            <div className="flex items-center gap-1.5 text-text-primary">
              <MapPin className="size-4 text-text-muted" />
              {congreso.lugar}
            </div>
          )}
        </dl>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card
          className="cursor-pointer transition-colors hover:border-accent"
          onClick={() => navigate(`/congresos/${id_congreso}/inscripciones`)}
        >
          <ClipboardList className="size-6 text-accent" />
          <p className="mt-3 font-medium text-text-primary">Mis inscripciones</p>
          <p className="mt-1 text-sm text-text-muted">Consulta o crea tu inscripción a este congreso.</p>
        </Card>

        {esExpositorEnEsteCongreso && (
          <Card
            className="cursor-pointer transition-colors hover:border-accent"
            onClick={() => navigate(`/congresos/${id_congreso}/ponencias`)}
          >
            <Mic className="size-6 text-accent" />
            <p className="mt-3 font-medium text-text-primary">Mis ponencias</p>
            <p className="mt-1 text-sm text-text-muted">Consulta o propón ponencias para este congreso.</p>
          </Card>
        )}
      </div>

      {esAdminGlobal && <SeccionAdministradores />}
    </div>
  );
}
