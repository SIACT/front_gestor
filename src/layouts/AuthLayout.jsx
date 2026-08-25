import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const TEMAS = [
  'Álgebra',
  'Teoría de Números',
  'Combinatoria',
  'Aplicaciones',
  'Geometría algebraica',
  'Área invitada: Análisis de datos y sistemas complejos',
];

export function AuthLayout() {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-background">
      <img
        src="https://res.cloudinary.com/dspprxtpr/image/upload/v1787582772/altencoa_poster_ampliado_ujll9w.webp"
        alt="Afiche del congreso ALTENCOA11 2026"
        //cambiar esta URL por la de la imagen que se quiera poner de fondo para futuros eventos
        className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover opacity-45 blur-[3px]"
      />
      <div className="absolute inset-0 bg-background/55" />

      <button
        type="button"
        onClick={toggleTheme}
        aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
        className="absolute right-6 top-6 z-20 flex size-8 items-center justify-center rounded-md bg-surface/80 text-text-muted backdrop-blur transition-colors hover:bg-surface hover:text-text-primary"
      >
        {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
      </button>

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col-reverse gap-10 px-5 py-8 lg:flex-row lg:items-center lg:gap-16 lg:py-10">
        <div className="flex max-w-md flex-col gap-4 text-center lg:flex-1 lg:text-left">
          <span className="font-sans text-3xl uppercase tracking-wide text-accent">
            ALTENCOA11-2026
          </span>

          <h1 className="font-sans text-3xl font-bold leading-tight --c-text-primary md:text-5xl">
            XI Encuentro de Álgebra, Teoría de Números y Combinatoria
          </h1>

          <p className="text-sm text-text-muted md:text-base">
            Universidad de Nariño · 5 al 9 de octubre de 2026 · San Juan de Pasto, Colombia
          </p>

          <ul className="flex flex-col gap-1 text-sm text-text-muted">
            {TEMAS.map((tema) => (
              <li key={tema} className="flex items-center justify-center gap-2 lg:justify-start">
                <span aria-hidden="true">*</span>
                {tema}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex w-full justify-center lg:flex-1 lg:justify-end">
          <div className="w-full rounded-2xl border border-border bg-surface p-6 shadow-lg shadow-black/40 sm:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </main>
  );
}
