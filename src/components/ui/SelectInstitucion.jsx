import { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';
import { SearchSelect } from './SearchSelect';

export function SelectInstitucion({ label, value, onChange, error, id }) {
  const [instituciones, setInstituciones] = useState([]);

  useEffect(() => {
    apiFetch('/instituciones?activo=true')
      .then((data) => setInstituciones(data ?? []))
      .catch(() => setInstituciones([]));
  }, []);

  async function buscarInstituciones(query) {
    const texto = query.toLowerCase();
    return instituciones
      .filter((inst) => inst.nombre.toLowerCase().includes(texto))
      .map((inst) => inst.nombre)
      .slice(0, 15);
  }

  return (
    <SearchSelect
      id={id}
      label={label}
      placeholder="Busca tu institución..."
      value={value}
      onChange={onChange}
      onSearch={buscarInstituciones}
      renderOption={(nombre) => nombre}
      allowCustom
      error={error}
    />
  );
}
