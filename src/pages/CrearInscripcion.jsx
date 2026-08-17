import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { apiFetch } from '../api/client';
import { formatCOP } from '../utils/formato';
import { Card } from '../components/ui/Card';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import { Modal } from '../components/ui/Modal';
import { PageLoader } from '../components/ui/PageLoader';
import { Spinner } from '../components/ui/Spinner';

export function CrearInscripcion() {
  const navigate = useNavigate();
  const [categorias, setCategorias] = useState([]);
  const [tiposAsistente, setTiposAsistente] = useState([]);
  const [idCategoria, setIdCategoria] = useState('');
  const [idTipoAsistente, setIdTipoAsistente] = useState('');
  const [loadingData, setLoadingData] = useState(true);
  const [loadingTipos, setLoadingTipos] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [yaInscrito, setYaInscrito] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    apiFetch('/inscripciones')
      .then((inscripciones) => {
        if ((inscripciones ?? []).length > 0) {
          setYaInscrito(true);
          return null;
        }
        return apiFetch('/categorias');
      })
      .then((cats) => {
        if (!cats) return;
        setCategorias(cats ?? []);
      })
      .catch((err) => setLoadError(err.message))
      .finally(() => setLoadingData(false));
  }, []);

  useEffect(() => {
    if (!idCategoria) {
      setTiposAsistente([]);
      return;
    }

    setIdTipoAsistente('');
    setTiposAsistente([]);
    setLoadingTipos(true);

    apiFetch(`/tipos-asistente?activo=true&id_categoria=${idCategoria}`)
      .then((tipos) => setTiposAsistente(tipos ?? []))
      .catch((err) => setLoadError(err.message))
      .finally(() => setLoadingTipos(false));
  }, [idCategoria]);

  const categoriaSeleccionada = categorias.find(
    (c) => String(c.id_categoria) === idCategoria,
  );
  const tipoSeleccionado = tiposAsistente.find(
    (t) => String(t.id_tipo_asistente) === idTipoAsistente,
  );

  function handleAbrirConfirmacion(e) {
    e.preventDefault();
    setError('');
    setConfirmOpen(true);
  }

  async function handleConfirmarInscripcion() {
    setError('');
    setSubmitting(true);
    try {
      const inscripcion = await apiFetch('/inscripciones', {
        method: 'POST',
        body: JSON.stringify({
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
    <div className="mx-auto w-full max-w-5xl px-6 py-12">
      <h1 className="font-sans text-2xl font-bold text-text-primary">Nueva inscripción</h1>
      <p className="mt-1 text-sm text-text-muted">
        Elige tu categoría y tipo de asistente para el congreso.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <form className="flex flex-col gap-5" onSubmit={handleAbrirConfirmacion}>
            {loadError && <Alert variant="error">{loadError}</Alert>}

            <Select
              id="crear-categoria"
              label="Categoría"
              value={idCategoria}
              onChange={(e) => setIdCategoria(e.target.value)}
              required
            >
              <option value="" disabled>
                Elige una categoría
              </option>
              {categorias.map((c) => (
                <option key={c.id_categoria} value={c.id_categoria}>
                  {c.nombre}
                </option>
              ))}
            </Select>

            <div className="flex flex-col gap-1.5 text-left">
              <div className="flex items-center gap-2">
                <label
                  htmlFor="crear-tipo-asistente"
                  className="text-xs font-medium uppercase tracking-wide text-text-muted"
                >
                  Tipo de asistente
                </label>
                {loadingTipos && <Spinner className="size-3.5 text-accent" />}
              </div>
              <Select
                id="crear-tipo-asistente"
                value={idTipoAsistente}
                onChange={(e) => setIdTipoAsistente(e.target.value)}
                disabled={!idCategoria || loadingTipos}
                required
              >
                <option value="" disabled>
                  {idCategoria ? 'Elige un tipo de asistente' : 'Primero elige una categoría'}
                </option>
                {tiposAsistente.map((t) => (
                  <option key={t.id_tipo_asistente} value={t.id_tipo_asistente}>
                    {t.tipo} — {formatCOP(t.costo_base)}
                  </option>
                ))}
              </Select>
            </div>

            <Button
              type="submit"
              variant="primary"
              disabled={!idCategoria || !idTipoAsistente}
            >
              Crear inscripción
            </Button>
          </form>
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="text-sm font-medium uppercase tracking-wide text-text-muted">
            Categorías disponibles
          </h2>
          <div className="mt-4">
            {categorias.map((c, index) => (
              <div
                key={c.id_categoria}
                className={clsx(
                  index < categorias.length - 1 && 'border-b border-border pb-3 mb-3',
                )}
              >
                <div
                  className={clsx(
                    String(c.id_categoria) === idCategoria && 'bg-accent/10 rounded-lg p-2 -mx-2',
                  )}
                >
                  <p className="font-medium text-text-primary">{c.nombre}</p>
                  {c.descripcion && (
                    <p className="mt-1 text-sm text-text-muted">{c.descripcion}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Confirma tu inscripción"
      >
        <div className="flex flex-col gap-4">
          {error && <Alert variant="error">{error}</Alert>}

          <p className="text-sm text-text-primary">
            Estás a punto de inscribirte con los siguientes datos:
          </p>

          <dl className="flex flex-col gap-3 rounded-lg border border-border p-4">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-text-muted">
                Categoría
              </dt>
              <dd className="mt-1 text-sm text-text-primary">{categoriaSeleccionada?.nombre}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-text-muted">
                Tipo de asistente
              </dt>
              <dd className="mt-1 text-sm text-text-primary">{tipoSeleccionado?.tipo}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-text-muted">
                Costo
              </dt>
              <dd className="mt-1 text-sm text-text-primary">
                {tipoSeleccionado ? formatCOP(tipoSeleccionado.costo_base) : ''}
              </dd>
            </div>
          </dl>

          <p className="text-xs text-text-muted">
            Verifica que la categoría corresponda a tu perfil (estudiante, ponente, externo, etc.)
            antes de continuar. Este costo es el valor base, antes de descuentos automáticos si
            aplican.
          </p>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="primary"
              loading={submitting}
              onClick={handleConfirmarInscripcion}
            >
              Confirmar e inscribirme
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
