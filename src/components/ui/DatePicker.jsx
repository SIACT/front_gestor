import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { Input } from './Input';

const WEEKDAY_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MONTH_LABELS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

// 'YYYY-MM-DD' representa un día calendario sin huso horario asociado.
// new Date('YYYY-MM-DD') lo interpreta como medianoche UTC, lo que en husos
// negativos (ej. America/Bogota, UTC-5) lo muestra un día atrás. Construir
// el Date con (año, mes, día) evita esa conversión y lo mantiene en hora local.
function parseLocalDate(value) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function toDateKey(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatDateKey(value) {
  return parseLocalDate(value).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function getCalendarDays(viewDate) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthLastDay = new Date(year, month, 0).getDate();

  // getDay(): 0=domingo..6=sábado → se convierte a semana que inicia en lunes (0=lunes..6=domingo)
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;

  const cells = [];

  for (let i = firstWeekday - 1; i >= 0; i--) {
    cells.push({ date: new Date(year, month - 1, prevMonthLastDay - i), inCurrentMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), inCurrentMonth: true });
  }
  while (cells.length % 7 !== 0) {
    const next = new Date(cells[cells.length - 1].date);
    next.setDate(next.getDate() + 1);
    cells.push({ date: next, inCurrentMonth: false });
  }

  return cells;
}

export function DatePicker({ value, onChange, label, placeholder = 'Selecciona una fecha' }) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => (value ? parseLocalDate(value) : new Date()));
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const days = getCalendarDays(viewDate);
  const todayKey = toDateKey(new Date());

  function handleSelectDay(date) {
    onChange(toDateKey(date));
    setOpen(false);
  }

  function handleClear() {
    onChange(null);
    setOpen(false);
  }

  function goToPrevMonth() {
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }

  function goToNextMonth() {
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }

  return (
    <div className="flex flex-col gap-1.5 text-left" ref={containerRef}>
      {label && (
        <label className="text-xs font-medium uppercase tracking-wide text-text-muted">
          {label}
        </label>
      )}
      <div className="relative">
        <Input
          readOnly
          icon={<Calendar className="size-4" />}
          placeholder={placeholder}
          value={value ? formatDateKey(value) : ''}
          onClick={() => setOpen((o) => !o)}
          className="cursor-pointer"
        />

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute z-10 mt-1 w-72 rounded-lg border border-border bg-surface p-3 shadow-lg"
            >
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={goToPrevMonth}
                  aria-label="Mes anterior"
                  className="flex size-7 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-background hover:text-text-primary"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <span className="text-sm font-medium text-text-primary">
                  {MONTH_LABELS[viewDate.getMonth()]} {viewDate.getFullYear()}
                </span>
                <button
                  type="button"
                  onClick={goToNextMonth}
                  aria-label="Mes siguiente"
                  className="flex size-7 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-background hover:text-text-primary"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>

              <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs text-text-muted">
                {WEEKDAY_LABELS.map((w, i) => (
                  <span key={i}>{w}</span>
                ))}
              </div>

              <div className="mt-1 grid grid-cols-7 gap-1">
                {days.map(({ date, inCurrentMonth }) => {
                  const key = toDateKey(date);
                  const isSelected = value === key;
                  const isToday = todayKey === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={!inCurrentMonth}
                      onClick={() => handleSelectDay(date)}
                      className={clsx(
                        'flex size-8 items-center justify-center rounded-md text-sm transition-colors',
                        !inCurrentMonth && 'cursor-default text-text-placeholder',
                        inCurrentMonth && !isSelected && 'text-text-primary hover:bg-background',
                        isSelected && 'bg-accent text-background',
                        isToday && !isSelected && 'border border-accent',
                      )}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={handleClear}
                className="mt-3 w-full rounded-md border border-border px-3 py-1.5 text-sm text-text-muted transition-colors hover:border-accent hover:text-accent"
              >
                Limpiar
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
