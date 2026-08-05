import { useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import { Spinner } from './Spinner';

const CUSTOM_OPTION = 'Otra (especificar)';

function extractOptionValue(option) {
  if (typeof option === 'string') return option;
  return option?.name ?? option?.label ?? option?.value ?? String(option);
}

export function SearchSelect({
  value,
  onChange,
  onSearch,
  renderOption,
  placeholder,
  label,
  allowCustom = false,
  error,
  id,
}) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [customMode, setCustomMode] = useState(false);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const skipSearchRef = useRef(false);

  useEffect(() => {
    if (skipSearchRef.current) {
      skipSearchRef.current = false;
      return;
    }
    if (customMode) return;

    const trimmed = (value ?? '').trim();
    if (trimmed.length < 2) {
      setOptions([]);
      setOpen(false);
      setSearchError('');
      return;
    }

    setLoading(true);
    setSearchError('');
    const timeoutId = setTimeout(async () => {
      try {
        const results = await onSearch(trimmed);
        setOptions(results ?? []);
        setOpen(true);
        setHighlightedIndex(-1);
      } catch {
        setSearchError('No se pudo buscar universidades, intenta escribir el nombre manualmente');
        setOptions([]);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, customMode]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleInputChange(e) {
    const text = e.target.value;
    onChange(text);
    if (customMode && text.length === 0) {
      setCustomMode(false);
    }
  }

  function selectOption(option) {
    skipSearchRef.current = true;
    setCustomMode(false);
    onChange(extractOptionValue(option));
    setOpen(false);
    setOptions([]);
    setHighlightedIndex(-1);
  }

  function selectCustom() {
    skipSearchRef.current = true;
    setCustomMode(true);
    setOpen(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  }

  function handleKeyDown(e) {
    const totalOptions = options.length + (allowCustom ? 1 : 0);

    if (!open) {
      if (e.key === 'ArrowDown' && totalOptions > 0) {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, totalOptions - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (highlightedIndex === -1) return;
      e.preventDefault();
      if (highlightedIndex < options.length) {
        selectOption(options[highlightedIndex]);
      } else {
        selectCustom();
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  const showDropdown = open && !customMode;

  return (
    <div className="flex flex-col gap-1.5 text-left" ref={containerRef}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-medium uppercase tracking-wide text-text-muted"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={showDropdown}
          aria-autocomplete="list"
          autoComplete="off"
          placeholder={placeholder}
          value={value ?? ''}
          onChange={handleInputChange}
          onFocus={() => {
            if (!customMode && options.length > 0) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          aria-invalid={Boolean(error)}
          className={clsx(
            'w-full rounded-lg border bg-surface px-3 py-1.5 pr-9 text-sm text-text-primary',
            'placeholder:text-text-placeholder',
            'transition-colors focus:outline-none focus:ring-2 focus:ring-accent/50',
            error ? 'border-error-text focus:ring-error-text/50' : 'border-border focus:border-accent',
          )}
        />
        {loading && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">
            <Spinner className="size-4" />
          </span>
        )}

        <AnimatePresence>
          {showDropdown && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-border bg-surface shadow-lg"
            >
              {searchError && <p className="px-3 py-2 text-sm text-error-text">{searchError}</p>}

              {!searchError && options.length === 0 && (
                <p className="px-3 py-2 text-sm text-text-muted">Sin resultados</p>
              )}

              {options.length > 0 && (
                <ul className="max-h-56 overflow-y-auto py-1">
                  {options.map((option, index) => (
                    <li key={index}>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => selectOption(option)}
                        onMouseEnter={() => setHighlightedIndex(index)}
                        className={clsx(
                          'block w-full px-3 py-2 text-left text-sm text-text-primary',
                          index === highlightedIndex ? 'bg-accent/10' : 'hover:bg-background',
                        )}
                      >
                        {renderOption(option)}
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {allowCustom && (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={selectCustom}
                  onMouseEnter={() => setHighlightedIndex(options.length)}
                  className={clsx(
                    'block w-full border-t border-border px-3 py-2 text-left text-sm font-medium text-accent',
                    options.length === highlightedIndex ? 'bg-accent/10' : 'hover:bg-background',
                  )}
                >
                  {CUSTOM_OPTION}
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {error && <p className="text-sm text-error-text">{error}</p>}
    </div>
  );
}
