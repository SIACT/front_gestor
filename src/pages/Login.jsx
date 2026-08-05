import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';

function MailIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 6.75c0-.414.336-.75.75-.75h18c.414 0 .75.336.75.75v10.5a.75.75 0 01-.75.75h-18a.75.75 0 01-.75-.75V6.75z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 7.5l9.375 6.5a.75.75 0 00.75 0L21.75 7.5" />
    </svg>
  );
}

function LockIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 0h10.5a1.5 1.5 0 011.5 1.5v7.5a1.5 1.5 0 01-1.5 1.5h-10.5a1.5 1.5 0 01-1.5-1.5v-7.5a1.5 1.5 0 011.5-1.5z"
      />
    </svg>
  );
}

function ArrowRightIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  );
}

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const mensaje = location.state?.mensaje;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(correo, contrasena);
      navigate('/inscripciones');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <Link
        to="/"
        className="text-sm text-text-muted transition-colors hover:text-text-primary"
      >
        ← Volver
      </Link>

      <h1 className="mt-8 font-sans text-3xl font-bold text-text-primary">
        Bienvenido de vuelta
      </h1>
      <p className="mt-2 text-sm text-text-muted">
        Ingresa a tu cuenta para gestionar tu ponencia.
      </p>

      <form className="mt-8 flex flex-col gap-5" onSubmit={handleSubmit}>
        {mensaje && <Alert variant="success">{mensaje}</Alert>}
        {error && <Alert variant="error">{error}</Alert>}

        <Input
          id="login-correo"
          type="email"
          label="Correo electrónico"
          autoComplete="email"
          icon={<MailIcon className="size-4" />}
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          required
        />

        <Input
          id="login-contrasena"
          type="password"
          label="Contraseña"
          autoComplete="current-password"
          icon={<LockIcon className="size-4" />}
          value={contrasena}
          onChange={(e) => setContrasena(e.target.value)}
          required
        />

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-text-muted">
            <input
              type="checkbox"
              className="size-4 rounded border-border bg-surface accent-accent"
            />
            Recordarme
          </label>
          <Link
            to="/olvide-contrasena"
            className="text-sm text-text-muted transition-colors hover:text-text-primary"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        <Button type="submit" variant="primary" loading={submitting} className="w-full">
          Ingresar
          {!submitting && <ArrowRightIcon className="size-4" />}
        </Button>

        <p className="text-center text-sm text-text-muted">
          ¿Aún no estás registrado?{' '}
          <Link to="/register" className="text-accent hover:text-accent-hover">
            Solicita acceso
          </Link>
        </p>
      </form>
    </div>
  );
}
