import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { SelectInstitucion } from '../components/ui/SelectInstitucion';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';

function ArrowRightIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  );
}

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

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    nombre: '',
    apellido: '',
    correo: '',
    contrasena: '',
    cedula: '',
    institucion: '',
    id_rol: '3',
  });
  const [error, setError] = useState('');
  const [contrasenaError, setContrasenaError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const tieneLetra = /[a-zA-Z]/.test(form.contrasena);
  const tieneNumero = /\d/.test(form.contrasena);
  const tieneEspecial = /[^a-zA-Z0-9]/.test(form.contrasena);

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

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const passwordError = validarContrasena(form.contrasena);
    if (passwordError) {
      setContrasenaError(passwordError);
      return;
    }
    setContrasenaError('');

    setSubmitting(true);
    try {
      await register({
        nombre: form.nombre,
        apellido: form.apellido,
        correo: form.correo,
        contrasena: form.contrasena,
        cedula: form.cedula || undefined,
        institucion: form.institucion || undefined,
        id_rol: Number(form.id_rol),
      });
      navigate('/login', { state: { mensaje: 'Cuenta creada, ya puedes iniciar sesión' } });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      {/* <Link
        to="/"
        className="text-sm text-text-muted transition-colors hover:text-text-primary"
      >
        ← Volver
      </Link> */}

      <h1 className="mt-4 font-sans text-3xl font-bold text-text-primary">
        Crea tu cuenta
      </h1>
      <p className="mt-2 text-sm text-text-muted">
        Regístrate para gestionar tu inscripción o ponencia.
      </p>

      <form className="mt-4 flex flex-col gap-3" onSubmit={handleSubmit}>
        {error && <Alert variant="error">{error}</Alert>}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            id="register-nombre"
            name="nombre"
            label="Nombre"
            value={form.nombre}
            onChange={handleChange}
            required
          />
          <Input
            id="register-apellido"
            name="apellido"
            label="Apellido"
            value={form.apellido}
            onChange={handleChange}
            required
          />
        </div>

        <Input
          id="register-correo"
          name="correo"
          type="email"
          label="Correo electrónico"
          autoComplete="email"
          value={form.correo}
          onChange={handleChange}
          required
        />

        <div className="flex flex-col gap-2">
          <Input
            id="register-contrasena"
            name="contrasena"
            type="password"
            label="Contraseña"
            autoComplete="new-password"
            minLength={8}
            value={form.contrasena}
            onChange={handleContrasenaChange}
            error={contrasenaError}
            required
          />
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <PasswordCheckItem satisfied={tieneLetra} label="Letra" />
            <PasswordCheckItem satisfied={tieneNumero} label="Número" />
            <PasswordCheckItem satisfied={tieneEspecial} label="Carácter especial" />
          </div>
        </div>

        <Input
          id="register-cedula"
          name="cedula"
          label="Cédula"
          inputMode="numeric"
          value={form.cedula}
          onChange={handleCedulaChange}
        />

        <SelectInstitucion
          id="register-institucion"
          label="Institución (opcional)"
          value={form.institucion}
          onChange={(value) => setForm((prev) => ({ ...prev, institucion: value }))}
        />

        <Select id="register-rol" name="id_rol" label="Rol" value={form.id_rol} onChange={handleChange}>
          <option value="3">Asistente</option>
          <option value="2">Ponente</option>
        </Select>

        <Button type="submit" variant="primary" loading={submitting} className="w-full">
          Crear cuenta
          {!submitting && <ArrowRightIcon className="size-4" />}
        </Button>

        <p className="text-center text-sm text-text-muted">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-accent hover:text-accent-hover">
            Inicia sesión
          </Link>
        </p>
      </form>
    </div>
  );
}
