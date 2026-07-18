const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export async function apiFetch(path, options = {}) {
  const isFormData = options.body instanceof FormData;

  const headers = { ...options.headers };
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include', // ENVÍA LAS COOKIES httpOnly — esto es obligatorio, no opcional
    headers,
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(body?.error?.message || 'Error en la petición');
  }

  return body?.data;
}

export { API_URL };
