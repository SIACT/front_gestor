import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api/client';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';

export function OlvideContrasena() {
  const [correo, setCorreo] = useState('');
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const data = await apiFetch('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ correo }),
      });
      setMensaje(data?.message ?? 'Si el correo está registrado, recibirás un enlace de recuperación.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <h1 className="font-sans text-3xl font-bold text-text-primary">Recupera tu acceso</h1>
      <p className="mt-2 text-sm text-text-muted">
        Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
      </p>

      <div className="mt-8">
        {mensaje ? (
          <Alert variant="success">{mensaje}</Alert>
        ) : (
          <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
            {error && <Alert variant="error">{error}</Alert>}

            <Input
              id="olvide-correo"
              type="email"
              label="Correo electrónico"
              autoComplete="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              required
            />

            <Button type="submit" variant="primary" loading={submitting} className="w-full">
              Enviar enlace
            </Button>
          </form>
        )}
      </div>

      <Link
        to="/login"
        className="mt-6 inline-block text-sm text-text-muted transition-colors hover:text-text-primary"
      >
        ← Volver a iniciar sesión
      </Link>
    </div>
  );
}
