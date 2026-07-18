import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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
  const [submitting, setSubmitting] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await register({
        ...form,
        id_rol: Number(form.id_rol),
        cedula: form.cedula || undefined,
        institucion: form.institucion || undefined,
      });
      navigate('/login', { state: { mensaje: 'Cuenta creada, inicia sesión' } });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-center">
      <form className="card form" onSubmit={handleSubmit}>
        <h1>Crear cuenta</h1>
        {error && <p className="alert alert-error">{error}</p>}
        <label>
          Nombre
          <input name="nombre" value={form.nombre} onChange={handleChange} required />
        </label>
        <label>
          Apellido
          <input name="apellido" value={form.apellido} onChange={handleChange} required />
        </label>
        <label>
          Correo
          <input type="email" name="correo" value={form.correo} onChange={handleChange} required />
        </label>
        <label>
          Contraseña
          <input
            type="password"
            name="contrasena"
            value={form.contrasena}
            onChange={handleChange}
            minLength={8}
            required
          />
        </label>
        <label>
          Cédula (opcional)
          <input name="cedula" value={form.cedula} onChange={handleChange} />
        </label>
        <label>
          Institución (opcional)
          <input name="institucion" value={form.institucion} onChange={handleChange} />
        </label>
        <label>
          Rol
          <select name="id_rol" value={form.id_rol} onChange={handleChange}>
            <option value="3">Estudiante</option>
            <option value="2">Ponente</option>
          </select>
        </label>
        <button type="submit" disabled={submitting}>
          {submitting ? 'Creando...' : 'Crear cuenta'}
        </button>
        <p>
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
        </p>
      </form>
    </div>
  );
}
