import { Link, Outlet } from 'react-router-dom';
import { CongresoProvider, useCongreso } from '../context/CongresoContext';
import { Alert } from '../components/ui/Alert';
import { PageLoader } from '../components/ui/PageLoader';

function CongresoLayoutContent() {
  const { congreso, loading, error } = useCongreso();

  if (loading) return <PageLoader />;

  if (error) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
        <Alert variant="error">Este congreso no existe o no está disponible.</Alert>
        <Link to="/" className="text-sm text-text-muted transition-colors hover:text-text-primary">
          ← Volver a Congresos
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-background">
      <header className="border-b border-border px-6 py-4">
        <Link
          to="/"
          className="text-sm text-text-muted transition-colors hover:text-text-primary"
        >
          ← Volver a Congresos
        </Link>
        <h1 className="mt-2 font-sans text-xl font-semibold text-text-primary">
          {congreso?.nombre}
        </h1>
      </header>

      {congreso?.activo === false && (
        <div className="px-6 pt-4">
          <Alert variant="warning">Este congreso no está activo actualmente.</Alert>
        </div>
      )}

      <div className="px-6 py-6">
        <Outlet />
      </div>
    </div>
  );
}

export function CongresoLayout() {
  return (
    <CongresoProvider>
      <CongresoLayoutContent />
    </CongresoProvider>
  );
}
