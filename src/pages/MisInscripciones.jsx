import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api/client';

export function MisInscripciones() {
  const [inscripciones, setInscripciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/inscripciones')
      .then((data) => setInscripciones(data ?? []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-screen">Cargando...</div>;

  return (
    <div className="page-center">
      <div className="card" style={{ maxWidth: '640px' }}>
        <div className="header-row">
          <h1>Mis inscripciones</h1>
          <Link to="/inscripciones/nueva">
            <button type="button">+ Nueva inscripción</button>
          </Link>
        </div>
        {error && <p className="alert alert-error">{error}</p>}
        {inscripciones.length === 0 && !error && <p>Aún no tienes inscripciones.</p>}
        <ul className="list">
          {inscripciones.map((i) => (
            <li key={i.id_inscripcion} className="list-item">
              <Link to={`/inscripciones/${i.id_inscripcion}`}>
                Inscripción #{i.id_inscripcion} — {i.estado_inscripcion} — ${i.costo_final}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
