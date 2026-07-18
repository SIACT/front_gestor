import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/client';

export function CrearInscripcion() {
  const navigate = useNavigate();
  const [categorias, setCategorias] = useState([]);
  const [tiposAsistente, setTiposAsistente] = useState([]);
  const [idCategoria, setIdCategoria] = useState('');
  const [idTipoAsistente, setIdTipoAsistente] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([apiFetch('/categorias'), apiFetch('/tipos-asistente')])
      .then(([cats, tipos]) => {
        setCategorias(cats ?? []);
        setTiposAsistente(tipos ?? []);
        if (cats?.length) setIdCategoria(String(cats[0].id_categoria));
        if (tipos?.length) setIdTipoAsistente(String(tipos[0].id_tipo_asistente));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const inscripcion = await apiFetch('/inscripciones', {
        method: 'POST',
        body: JSON.stringify({
          id_categoria: Number(idCategoria),
          id_tipo_asistente: Number(idTipoAsistente),
        }),
      });
      navigate(`/inscripciones/${inscripcion.id_inscripcion}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="loading-screen">Cargando...</div>;

  return (
    <div className="page-center">
      <form className="card form" onSubmit={handleSubmit}>
        <h1>Nueva inscripción</h1>
        {error && <p className="alert alert-error">{error}</p>}
        <label>
          Categoría
          <select value={idCategoria} onChange={(e) => setIdCategoria(e.target.value)} required>
            {categorias.map((c) => (
              <option key={c.id_categoria} value={c.id_categoria}>
                {c.nombre}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tipo de asistente
          <select value={idTipoAsistente} onChange={(e) => setIdTipoAsistente(e.target.value)} required>
            {tiposAsistente.map((t) => (
              <option key={t.id_tipo_asistente} value={t.id_tipo_asistente}>
                {t.tipo} (${t.costo_base})
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={submitting}>
          {submitting ? 'Creando...' : 'Crear inscripción'}
        </button>
      </form>
    </div>
  );
}
