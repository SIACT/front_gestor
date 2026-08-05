import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { apiFetch } from '../api/client';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';

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

const TOKEN_ERROR_MESSAGES = {
  TOKEN_ALREADY_USED: 'Este enlace ya fue utilizado. Solicita uno nuevo.',
  TOKEN_EXPIRED: 'El enlace ha expirado. Solicita uno nuevo.',
  INVALID_RESET_TOKEN: 'Enlace inválido.',
};

function VolverASolicitar() {
  return (
    <Link
      to="/olvide-contrasena"
      className="mt-6 inline-block text-sm text-text-muted transition-colors hover:text-text-primary"
    >
      ← Solicitar un nuevo enlace
    </Link>
  );
}

export function RestablecerContrasena() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [contrasenaNueva, setContrasenaNueva] = useState('');
  const [confirmarContrasena, setConfirmarContrasena] = useState('');
  const [error, setError] = useState('');
  const [tokenError, setTokenError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [exito, setExito] = useState(false);

  const tieneLetra = /[a-zA-Z]/.test(contrasenaNueva);
  const tieneNumero = /\d/.test(contrasenaNueva);
  const tieneEspecial = /[^a-zA-Z0-9]/.test(contrasenaNueva);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setTokenError('');

    if (contrasenaNueva !== confirmarContrasena) {
      setError('Las contraseñas no coinciden');
      return;
    }
    const fuerzaError = validarContrasena(contrasenaNueva);
    if (fuerzaError) {
      setError(fuerzaError);
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, contrasena_nueva: contrasenaNueva }),
      });
      setExito(true);
    } catch (err) {
      if (err.code && TOKEN_ERROR_MESSAGES[err.code]) {
        setTokenError(TOKEN_ERROR_MESSAGES[err.code]);
      } else {
        setError(err.message);
      }
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <div className="w-full max-w-sm">
        <h1 className="font-sans text-3xl font-bold text-text-primary">Restablecer contraseña</h1>
        <Alert variant="error" className="mt-8">
          Enlace inválido, solicita uno nuevo.
        </Alert>
        <VolverASolicitar />
      </div>
    );
  }

  if (exito) {
    return (
      <div className="w-full max-w-sm">
        <h1 className="font-sans text-3xl font-bold text-text-primary">Restablecer contraseña</h1>
        <Alert variant="success" className="mt-8">
          Tu contraseña fue restablecida correctamente.
        </Alert>
        <Button
          type="button"
          variant="primary"
          className="mt-6 w-full"
          onClick={() => navigate('/login')}
        >
          Ir a iniciar sesión
        </Button>
      </div>
    );
  }

  if (tokenError) {
    return (
      <div className="w-full max-w-sm">
        <h1 className="font-sans text-3xl font-bold text-text-primary">Restablecer contraseña</h1>
        <Alert variant="error" className="mt-8">
          {tokenError}
        </Alert>
        <VolverASolicitar />
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <h1 className="font-sans text-3xl font-bold text-text-primary">Restablecer contraseña</h1>
      <p className="mt-2 text-sm text-text-muted">Elige una nueva contraseña para tu cuenta.</p>

      <form className="mt-8 flex flex-col gap-5" onSubmit={handleSubmit}>
        {error && <Alert variant="error">{error}</Alert>}

        <div className="flex flex-col gap-2">
          <Input
            id="reset-contrasena-nueva"
            type="password"
            label="Nueva contraseña"
            autoComplete="new-password"
            value={contrasenaNueva}
            onChange={(e) => setContrasenaNueva(e.target.value)}
            required
          />
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <PasswordCheckItem satisfied={tieneLetra} label="Letra" />
            <PasswordCheckItem satisfied={tieneNumero} label="Número" />
            <PasswordCheckItem satisfied={tieneEspecial} label="Carácter especial" />
          </div>
        </div>

        <Input
          id="reset-confirmar-contrasena"
          type="password"
          label="Confirmar nueva contraseña"
          autoComplete="new-password"
          value={confirmarContrasena}
          onChange={(e) => setConfirmarContrasena(e.target.value)}
          required
        />

        <Button type="submit" variant="primary" loading={submitting} className="w-full">
          Restablecer contraseña
        </Button>
      </form>
    </div>
  );
}
