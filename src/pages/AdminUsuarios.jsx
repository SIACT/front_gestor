import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api/client';
import { capitalizar } from '../utils/formato';

const ROLES = [
  { id_rol: 1, nombre: 'Admin' },
  { id_rol: 2, nombre: 'Ponente' },
  { id_rol: 3, nombre: 'Estudiante' },
];

export function AdminUsuarios() {
  const { user } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.id_rol !== 1) return;
    apiFetch('/usuarios')
      .then((data) => setUsuarios(data ?? []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [user]);

  if (user?.id_rol !== 1) {
    return <Navigate to="/inscripciones" replace />;
  }

  async function handleRolChange(idUsuario, idRol) {
    setError('');
    try {
      await apiFetch(`/usuarios/${idUsuario}/rol`, {
        method: 'PATCH',
        body: JSON.stringify({ id_rol: Number(idRol) }),
      });
      setUsuarios((prev) =>
        prev.map((u) => (u.id_usuario === idUsuario ? { ...u, id_rol: Number(idRol) } : u)),
      );
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <div className="loading-screen">Cargando...</div>;

  return (
    <div className="page-center">
      <div className="card" style={{ maxWidth: '800px' }}>
        <h1>Administración de usuarios</h1>
        {error && <p className="alert alert-error">{error}</p>}
        <table className="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Correo</th>
              <th>Rol actual</th>
              <th>Cambiar rol</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id_usuario}>
                <td>{capitalizar(u.nombre)} {capitalizar(u.apellido)}</td>
                <td>{u.correo}</td>
                <td>{u.rol?.nombre ?? u.id_rol}</td>
                <td>
                  <select
                    value={u.id_rol}
                    onChange={(e) => handleRolChange(u.id_usuario, e.target.value)}
                  >
                    {ROLES.map((r) => (
                      <option key={r.id_rol} value={r.id_rol}>
                        {r.nombre}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
