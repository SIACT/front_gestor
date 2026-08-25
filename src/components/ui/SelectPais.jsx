import { useState } from 'react';
import { Select } from './Select';
import { Input } from './Input';

export const PAISES = [
  'Colombia',
  'México',
  'Argentina',
  'Chile',
  'Perú',
  'Ecuador',
  'Venezuela',
  'Bolivia',
  'Paraguay',
  'Uruguay',
  'Panamá',
  'Costa Rica',
  'Guatemala',
  'Honduras',
  'El Salvador',
  'Nicaragua',
  'República Dominicana',
  'Cuba',
  'Puerto Rico',
  'España',
];

export function SelectPais({ id, label = 'País', value, onChange, error, required }) {
  const [modoOtro, setModoOtro] = useState(() => value !== '' && !PAISES.includes(value));

  function handleSelectChange(e) {
    const seleccion = e.target.value;
    if (seleccion === 'otro') {
      setModoOtro(true);
      if (PAISES.includes(value)) onChange('');
      return;
    }
    setModoOtro(false);
    onChange(seleccion);
  }

  return (
    <div className="flex flex-col gap-3">
      <Select
        id={id}
        label={label}
        value={modoOtro ? 'otro' : value}
        onChange={handleSelectChange}
        required={required}
      >
        <option value="" disabled>
          Selecciona un país
        </option>
        {PAISES.map((pais) => (
          <option key={pais} value={pais}>
            {pais}
          </option>
        ))}
        <option value="otro">Otro</option>
      </Select>

      {modoOtro && (
        <Input
          label="Especifica tu país"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          error={error}
          required={required}
        />
      )}
    </div>
  );
}
