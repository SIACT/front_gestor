import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/client';
import { Card } from '../components/ui/Card';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import { PageLoader } from '../components/ui/PageLoader';

function formatCOP(value) {
  return Number(value).toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  });
}

export function CrearInscripcion() {
  const navigate = useNavigate();
  const [categorias, setCategorias] = useState([]);
  const [tiposAsistente, setTiposAsistente] = useState([]);
  const [idCategoria, setIdCategoria] = useState('');
  const [idTipoAsistente, setIdTipoAsistente] = useState('');
  const [loadingData, setLoadingData] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [yaInscrito, setYaInscrito] = useState(false);

  useEffect(() => {
    apiFetch('/inscripciones')
      .then((inscripciones) => {
        if ((inscripciones ?? []).length > 0) {
          setYaInscrito(true);
          return null;
        }
        return Promise.all([apiFetch('/categorias'), apiFetch('/tipos-asistente?activo=true')]);
      })
      .then((resultado) => {
        if (!resultado) return;
        const [cats, tipos] = resultado;
        setCategorias(cats ?? []);
        setTiposAsistente(tipos ?? []);
        if (cats?.length) setIdCategoria(String(cats[0].id_categoria));
        if (tipos?.length) setIdTipoAsistente(String(tipos[0].id_tipo_asistente));
      })
      .catch((err) => setLoadError(err.message))
      .finally(() => setLoadingData(false));
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

  if (loadingData) return <PageLoader />;
  if (yaInscrito) return <Navigate to="/inscripciones" replace />;

  return (
    <div className="mx-auto w-full max-w-lg px-6 py-12">
      <h1 className="font-sans text-2xl font-bold text-text-primary">Nueva inscripción</h1>
      <p className="mt-1 text-sm text-text-muted">
        Elige tu categoría y tipo de asistente para el congreso.
      </p>

      <Card className="mt-6">
        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          {loadError && <Alert variant="error">{loadError}</Alert>}
          {error && <Alert variant="error">{error}</Alert>}

          <Select
            id="crear-categoria"
            label="Categoría"
            value={idCategoria}
            onChange={(e) => setIdCategoria(e.target.value)}
            required
          >
            {categorias.map((c) => (
              <option key={c.id_categoria} value={c.id_categoria}>
                {c.nombre}
              </option>
            ))}
          </Select>

          <Select
            id="crear-tipo-asistente"
            label="Tipo de asistente"
            value={idTipoAsistente}
            onChange={(e) => setIdTipoAsistente(e.target.value)}
            required
          >
            {tiposAsistente.map((t) => (
              <option key={t.id_tipo_asistente} value={t.id_tipo_asistente}>
                {t.tipo} — {formatCOP(t.costo_base)}
              </option>
            ))}
          </Select>

          <Button
            type="submit"
            variant="primary"
            loading={submitting}
            disabled={!idCategoria || !idTipoAsistente}
          >
            Crear inscripción
          </Button>
        </form>
      </Card>
    </div>
  );
}
