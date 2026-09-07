import { Link, Outlet } from 'react-router-dom';
import { CongresoProvider, useCongreso } from '../context/CongresoContext';
import { Alert } from '../components/ui/Alert';
import { PageLoader } from '../components/ui/PageLoader';

function CongresoLayoutInner() {
  const { loading, error } = useCongreso();

  if (loading) return <PageLoader />;

  if (error) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-background p-6">
        <Alert variant="error">Este congreso no existe o no está disponible.</Alert>
        <Link to="/" className="text-sm text-text-muted transition-colors hover:text-text-primary">
          ← Volver a Congresos
        </Link>
      </div>
    );
  }

  return <Outlet />;
}

export function CongresoLayout() {
  return (
    <CongresoProvider>
      <CongresoLayoutInner />
    </CongresoProvider>
  );
}
