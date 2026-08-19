import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiFetch } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/auth/me')
      .then((data) => setUser(data?.usuario ?? null))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (correo, contrasena) => {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ correo, contrasena }),
    });
    setUser(data?.usuario ?? null);
    return data;
  }, []);

  const register = useCallback(async (datos) => {
    return apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify(datos),
    });
  }, []);

  const logout = useCallback(async () => {
    await apiFetch('/auth/logout', { method: 'POST' });
    setUser(null);
  }, []);

  const actualizarUsuario = useCallback((datosNuevos) => {
    setUser((prev) => ({ ...prev, ...datosNuevos }));
  }, []);

  const value = { user, login, register, logout, loading, actualizarUsuario };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
