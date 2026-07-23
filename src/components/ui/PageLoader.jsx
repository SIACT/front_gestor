import { Spinner } from './Spinner';

export function PageLoader() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background">
      <Spinner className="size-8 text-accent" />
    </div>
  );
}
