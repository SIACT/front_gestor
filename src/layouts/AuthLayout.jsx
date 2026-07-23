import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo } from '../components/ui/Logo';

const PANEL_SPRING = { type: 'spring', stiffness: 300, damping: 30 };

const SYMBOLS = [
  { char: '∞', className: '-left-8 top-12 text-[11rem]' },
  { char: 'Σ', className: 'right-0 top-1/3 text-[9rem]' },
  { char: 'π', className: 'left-1/4 bottom-28 text-[10rem]' },
  { char: '∂', className: '-right-10 bottom-0 text-[8rem]' },
];

export function AuthLayout() {
  const location = useLocation();
  const isRegister = location.pathname === '/register';
  const brandOrder = isRegister ? 2 : 1;
  const formOrder = isRegister ? 1 : 2;

  return (
    <div className="flex min-h-screen w-full overflow-hidden bg-background">
      <motion.div
        layout
        transition={PANEL_SPRING}
        style={{ order: brandOrder }}
        className="relative hidden flex-2 flex-col justify-between overflow-hidden p-15 lg:flex"
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 z-0 bg-cover bg-center"
          style={{
            backgroundImage:
              'url(https://sapiens.udenar.edu.co:3026/cdn/images/imagenes_login/1.jpg)',
              //cambiar esta URL por la de la imagen que se quiera poner de fondo para futuros eventos
          }}
        />

        <div
          aria-hidden="true"
          className="absolute inset-0 z-[1]"
          style={{
            backgroundImage:
              'linear-gradient(180deg, rgba(10,15,11,0.4) 0%, rgba(10,15,11,0.85) 70%, var(--color-background) 100%)',
          }}
        />

        {SYMBOLS.map((symbol) => (
          <span
            key={symbol.char}
            aria-hidden="true"
            className={`pointer-events-none absolute z-10 select-none text-accent/20 ${symbol.className}`}
          >
            {symbol.char}
          </span>
        ))}

        <div className="relative flex items-center justify-between gap-50">
        <Logo variant="altenua" className="relative z-10 h-14 w-auto" />
        <Logo variant="udenar" className="relative z-10 h-14 w-auto" />
        </div>

        <p className="relative z-10 font-display text-6xl leading-none text-text-primary justify-center flex">
          ALTENCOA<span className="font-sans text-accent">11-2026</span>
        </p>

        <p className="relative z-10 text-xs uppercase tracking-wide text-text-muted justify-center flex">
          OCT 5-9, 2026 · SAN JUAN DE PASTO
        </p>
      </motion.div>

      <motion.div
        layout
        transition={PANEL_SPRING}
        style={{ order: formOrder }}
        className="flex flex-1 items-center bg-background px-6 sm:px-12 lg:px-16"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="w-full"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
