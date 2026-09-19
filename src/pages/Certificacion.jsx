import { Logo } from '../components/ui/Logo';

export function Certificacion() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <Logo variant="altenua" className="h-16 w-auto" />
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-2xl text-text-primary">Certificación</h1>
        <p className="max-w-md text-text-muted">
          Próximamente podrás generar y descargar tu certificado de participación desde aquí.
        </p>
      </div>
    </div>
  );
}
