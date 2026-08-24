import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { apiFetch } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { SelectInstitucion } from '../components/ui/SelectInstitucion';
import { SelectPais } from '../components/ui/SelectPais';
import { Modal } from '../components/ui/Modal';
import { PageLoader } from '../components/ui/PageLoader';
import { capitalizar, capitalizarPais, formatFecha } from '../utils/formato';

const ROL_LABELS = { 1: 'Admin', 2: 'Ponente', 3: 'Estudiante' };
const ROL_BADGE = { 1: 'admin', 2: 'ponente', 3: 'estudiante' };

function CheckIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function CircleIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

function PasswordCheckItem({ satisfied, label }) {
  return (
    <div className={`flex items-center gap-1.5 ${satisfied ? 'text-accent' : 'text-text-muted'}`}>
      {satisfied ? <CheckIcon className="size-3.5" /> : <CircleIcon className="size-3.5" />}
      {label}
    </div>
  );
}

function validarContrasena(value) {
  if (value.length < 8) {
    return 'La contraseña debe tener al menos 8 caracteres';
  }
  const tieneLetra = /[a-zA-Z]/.test(value);
  const tieneNumero = /\d/.test(value);
  const tieneEspecial = /[^a-zA-Z0-9]/.test(value);
  if (!tieneLetra || !tieneNumero || !tieneEspecial) {
    return 'La contraseña debe incluir letras, números y un carácter especial';
  }
  return '';
}

function avatarUrl(seed) {
  return `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
}

function getStoredSeed(user) {
  if (!user) return null;
  return localStorage.getItem(`avatar-seed-${user.id_usuario}`) || user.correo;
}

function generarSeeds() {
  return Array.from({ length: 8 }, () => Math.random().toString(36).slice(2, 10));
}

function userToForm(user) {
  return {
    nombre: user?.nombre ?? '',
    apellido: user?.apellido ?? '',
    cedula: user?.cedula ?? '',
    institucion: user?.institucion ?? '',
    pais: user?.pais ? capitalizarPais(user.pais) : '',
  };
}

export function Perfil() {
  const { user, logout, actualizarUsuario } = useAuth();
  const navigate = useNavigate();
  const [avatarSeed, setAvatarSeed] = useState(() => getStoredSeed(user));
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSeeds, setModalSeeds] = useState([]);
  const [modalSelected, setModalSelected] = useState(null);

  const [form, setForm] = useState(() => userToForm(user));
  const [snapshot, setSnapshot] = useState(() => userToForm(user));
  const [datosError, setDatosError] = useState('');
  const [cedulaError, setCedulaError] = useState('');
  const [datosSuccess, setDatosSuccess] = useState('');
  const [guardandoDatos, setGuardandoDatos] = useState(false);

  const [contrasenaActual, setContrasenaActual] = useState('');
  const [contrasenaNueva, setContrasenaNueva] = useState('');
  const [confirmarContrasena, setConfirmarContrasena] = useState('');
  const [currentPasswordError, setCurrentPasswordError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [submittingPassword, setSubmittingPassword] = useState(false);

  const tieneLetra = /[a-zA-Z]/.test(contrasenaNueva);
  const tieneNumero = /\d/.test(contrasenaNueva);
  const tieneEspecial = /[^a-zA-Z0-9]/.test(contrasenaNueva);

  useEffect(() => {
    setAvatarSeed(getStoredSeed(user));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id_usuario]);

  if (!user) return <PageLoader />;

  const rolLabel = user.rol?.nombre ?? ROL_LABELS[user.id_rol] ?? '';
  const rolVariant = ROL_BADGE[user.id_rol] ?? 'default';

  function handleAbrirModal() {
    setModalSeeds(generarSeeds());
    setModalSelected(null);
    setModalOpen(true);
  }

  function handleRegenerar() {
    setModalSeeds(generarSeeds());
  }

  function handleCancelar() {
    setModalOpen(false);
  }

  function handleGuardar() {
    if (!modalSelected) return;
    localStorage.setItem(`avatar-seed-${user.id_usuario}`, modalSelected);
    setAvatarSeed(modalSelected);
    setModalOpen(false);
  }

  const hayCambiosDatos =
    form.nombre !== snapshot.nombre ||
    form.apellido !== snapshot.apellido ||
    form.cedula !== snapshot.cedula ||
    form.institucion !== snapshot.institucion ||
    form.pais !== snapshot.pais;

  function handleFormChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (name === 'cedula' && cedulaError) setCedulaError('');
  }

  async function handleGuardarDatos(e) {
    e.preventDefault();
    setDatosError('');
    setCedulaError('');
    setDatosSuccess('');

    const cambios = {};
    if (form.nombre !== snapshot.nombre) cambios.nombre = form.nombre;
    if (form.apellido !== snapshot.apellido) cambios.apellido = form.apellido;
    if (form.cedula !== snapshot.cedula) cambios.cedula = form.cedula;
    if (form.institucion !== snapshot.institucion) cambios.institucion = form.institucion;
    if (form.pais !== snapshot.pais) cambios.pais = capitalizarPais(form.pais);
    if (Object.keys(cambios).length === 0) return;

    setGuardandoDatos(true);
    try {
      const actualizado = await apiFetch('/auth/perfil', {
        method: 'PATCH',
        body: JSON.stringify(cambios),
      });
      actualizarUsuario(actualizado);
      setForm(userToForm(actualizado));
      setSnapshot(userToForm(actualizado));
      setDatosSuccess('Perfil actualizado');
    } catch (err) {
      if (err.code === 'CEDULA_ALREADY_IN_USE') {
        setCedulaError(err.message);
      } else {
        setDatosError(err.message);
      }
    } finally {
      setGuardandoDatos(false);
    }
  }

  async function handleCambiarContrasena(e) {
    e.preventDefault();
    setPasswordError('');
    setCurrentPasswordError('');

    if (contrasenaNueva !== confirmarContrasena) {
      setPasswordError('Las contraseñas no coinciden');
      return;
    }
    const fuerzaError = validarContrasena(contrasenaNueva);
    if (fuerzaError) {
      setPasswordError(fuerzaError);
      return;
    }

    setSubmittingPassword(true);
    try {
      await apiFetch('/auth/password', {
        method: 'PATCH',
        body: JSON.stringify({
          contrasena_actual: contrasenaActual,
          contrasena_nueva: contrasenaNueva,
        }),
      });
      setPasswordSuccess('Contraseña actualizada, cerrando sesión...');
      setTimeout(() => {
        logout().then(() => navigate('/login'));
      }, 2000);
    } catch (err) {
      if (err.code === 'INVALID_CURRENT_PASSWORD') {
        setCurrentPasswordError(err.message);
      } else {
        setPasswordError(err.message);
      }
      setSubmittingPassword(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 mt-6 py-14">
      <div>
        <h1 className="font-sans text-2xl font-bold text-text-primary">Mi perfil</h1>
        <p className="mt-1 text-sm text-text-muted">Consulta tus datos y personaliza tu avatar.</p>
      </div>

      <Card>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <img
            src={avatarUrl(avatarSeed)}
            alt="Avatar"
            loading="lazy"
            className="size-24 shrink-0 rounded-full border border-border bg-background"
          />
          <div className="flex flex-1 flex-col items-center gap-2 sm:items-start">
            <h2 className="font-sans text-xl font-semibold text-text-primary">
              {capitalizar(user.nombre)} {capitalizar(user.apellido)}
            </h2>
            <Badge variant={rolVariant}>{rolLabel}</Badge>
            <Button type="button" variant="secondary" size="sm" onClick={handleAbrirModal}>
              Cambiar avatar
            </Button>
          </div>
        </div>

        <form className="mt-6 flex flex-col gap-4" onSubmit={handleGuardarDatos}>
          {datosSuccess && <Alert variant="success">{datosSuccess}</Alert>}
          {datosError && <Alert variant="error">{datosError}</Alert>}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input name="nombre" label="Nombre" value={form.nombre} onChange={handleFormChange} required />
            <Input
              name="apellido"
              label="Apellido"
              value={form.apellido}
              onChange={handleFormChange}
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Correo</p>
              <p className="mt-1.5 text-sm text-text-primary">{user.correo}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                Fecha de registro
              </p>
              <p className="mt-1.5 text-sm text-text-primary">{formatFecha(user.fecha_registro)}</p>
            </div>
          </div>

          <Input
            name="cedula"
            label="Cédula"
            placeholder="Aún no registrada"
            value={form.cedula}
            onChange={handleFormChange}
            error={cedulaError}
          />

          <SelectInstitucion
            label="Institución"
            value={form.institucion}
            onChange={(value) => setForm((prev) => ({ ...prev, institucion: value }))}
          />

          <SelectPais
            value={form.pais}
            onChange={(value) => setForm((prev) => ({ ...prev, pais: value }))}
          />

          <Button
            type="submit"
            variant="primary"
            loading={guardandoDatos}
            disabled={!hayCambiosDatos}
            className="self-start"
          >
            Guardar cambios
          </Button>
        </form>
      </Card>

      <Card>
        <h2 className="text-sm font-medium uppercase tracking-wide text-text-muted">
          Cambiar contraseña
        </h2>

        {passwordSuccess && (
          <Alert variant="success" className="mt-4">
            {passwordSuccess}
          </Alert>
        )}
        {passwordError && (
          <Alert variant="error" className="mt-4">
            {passwordError}
          </Alert>
        )}

        <form className="mt-4 flex flex-col gap-3" onSubmit={handleCambiarContrasena}>
          <Input
            type="password"
            label="Contraseña actual"
            autoComplete="current-password"
            value={contrasenaActual}
            onChange={(e) => {
              setContrasenaActual(e.target.value);
              if (currentPasswordError) setCurrentPasswordError('');
            }}
            error={currentPasswordError}
            disabled={submittingPassword}
            required
          />

          <div className="flex flex-col gap-2">
            <Input
              type="password"
              label="Nueva contraseña"
              autoComplete="new-password"
              value={contrasenaNueva}
              onChange={(e) => setContrasenaNueva(e.target.value)}
              disabled={submittingPassword}
              required
            />
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
              <PasswordCheckItem satisfied={tieneLetra} label="Letra" />
              <PasswordCheckItem satisfied={tieneNumero} label="Número" />
              <PasswordCheckItem satisfied={tieneEspecial} label="Carácter especial" />
            </div>
          </div>

          <Input
            type="password"
            label="Confirmar nueva contraseña"
            autoComplete="new-password"
            value={confirmarContrasena}
            onChange={(e) => setConfirmarContrasena(e.target.value)}
            disabled={submittingPassword}
            required
          />

          <Button type="submit" variant="primary" loading={submittingPassword} className="self-start">
            Actualizar contraseña
          </Button>
        </form>
      </Card>

      <Modal open={modalOpen} onClose={handleCancelar} title="Cambiar avatar">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-4 gap-3">
            {modalSeeds.map((seed) => (
              <button
                key={seed}
                type="button"
                onClick={() => setModalSelected(seed)}
                className={clsx(
                  'overflow-hidden rounded-lg border-2 bg-background p-1 transition-colors',
                  modalSelected === seed ? 'border-accent' : 'border-border hover:border-accent',
                )}
              >
                <img src={avatarUrl(seed)} alt="" loading="lazy" className="aspect-square w-full" />
              </button>
            ))}
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleRegenerar}
            className="self-start"
          >
            Generar más opciones
          </Button>

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="secondary" onClick={handleCancelar}>
              Cancelar
            </Button>
            <Button type="button" variant="primary" disabled={!modalSelected} onClick={handleGuardar}>
              Guardar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
