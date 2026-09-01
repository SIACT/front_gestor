import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiFetch } from '../api/client';
import { useAuth } from './AuthContext';
import { ROLES, ROL_PARTICIPACION } from '../utils/roles';

const CongresoContext = createContext(null);

// GET /inscripciones soporta id_congreso como query param server-side, y para un
// usuario no-Admin siempre está auto-scoped a sus propias inscripciones. La regla
// de negocio es 1 inscripción por usuario por congreso, así que a lo sumo hay 1 resultado.
async function buscarMiInscripcionEnCongreso(idCongreso) {
  const inscripciones = await apiFetch(`/inscripciones?id_congreso=${idCongreso}`);
  return (inscripciones ?? [])[0] ?? null;
}

// GET /congresos/:id/admins ya exige "Admin Global o Admin de ESE congreso": su
// éxito o su 403 sirven como chequeo de permiso sin necesitar un endpoint aparte.
// Un 403 aquí es un resultado esperado (no administra este congreso), no una falla.
async function chequearPermisoAdminCongreso(idCongreso) {
  try {
    const admins = await apiFetch(`/congresos/${idCongreso}/admins`);
    return { puede: true, admins: admins ?? [] };
  } catch (err) {
    if (err.code === 'FORBIDDEN') return { puede: false, admins: null };
    throw err;
  }
}

export function CongresoProvider({ children }) {
  const { id_congreso } = useParams();
  const { user } = useAuth();
  const esAdminGlobal = user?.id_rol === ROLES.ADMIN;
  const esAdminDeCongreso = user?.id_rol === ROLES.ADMIN_CONGRESO;
  const esAdminEnCualquierContexto = esAdminGlobal || esAdminDeCongreso;

  const [congreso, setCongreso] = useState(null);
  const [misInscripcion, setMisInscripcion] = useState(null);
  const [puedeAdministrarCongreso, setPuedeAdministrarCongreso] = useState(false);
  const [adminsDelCongreso, setAdminsDelCongreso] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const cargarMisInscripcion = useCallback(() => {
    if (esAdminEnCualquierContexto) return Promise.resolve();
    return buscarMiInscripcionEnCongreso(id_congreso).then(setMisInscripcion);
  }, [id_congreso, esAdminEnCualquierContexto]);

  const cargarPermisoAdmin = useCallback(() => {
    if (esAdminGlobal) {
      setPuedeAdministrarCongreso(true);
      setAdminsDelCongreso(null);
      return Promise.resolve();
    }
    if (esAdminDeCongreso) {
      return chequearPermisoAdminCongreso(id_congreso).then(({ puede, admins }) => {
        setPuedeAdministrarCongreso(puede);
        setAdminsDelCongreso(admins);
      });
    }
    setPuedeAdministrarCongreso(false);
    setAdminsDelCongreso(null);
    return Promise.resolve();
  }, [id_congreso, esAdminGlobal, esAdminDeCongreso]);

  const cargarCongreso = useCallback(() => {
    return apiFetch(`/congresos/${id_congreso}`).then(setCongreso);
  }, [id_congreso]);

  useEffect(() => {
    setLoading(true);
    setError('');
    Promise.all([cargarCongreso(), cargarPermisoAdmin(), cargarMisInscripcion()])
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [cargarCongreso, cargarPermisoAdmin, cargarMisInscripcion]);

  // Se elige al inscribirse a ESTE congreso específico (Inscripcion.id_rol_participacion),
  // puede ser distinto en cada congreso — no confundir con el rol de la cuenta (user.id_rol).
  const esExpositorEnEsteCongreso = misInscripcion?.id_rol_participacion === ROL_PARTICIPACION.EXPOSITOR;

  const value = {
    congreso,
    misInscripcion,
    esExpositorEnEsteCongreso,
    puedeAdministrarCongreso,
    esAdminGlobal,
    adminsDelCongreso,
    loading,
    error,
    refrescarCongreso: cargarCongreso,
    refrescarMisInscripcion: cargarMisInscripcion,
    setAdminsDelCongreso,
  };

  return <CongresoContext.Provider value={value}>{children}</CongresoContext.Provider>;
}

export function useCongreso() {
  const ctx = useContext(CongresoContext);
  if (!ctx) throw new Error('useCongreso debe usarse dentro de CongresoProvider');
  return ctx;
}
