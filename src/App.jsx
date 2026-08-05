import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';
import { AuthLayout } from './layouts/AuthLayout';
import { DashboardLayout } from './layouts/DashboardLayout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { OlvideContrasena } from './pages/OlvideContrasena';
import { RestablecerContrasena } from './pages/RestablecerContrasena';
import { MisInscripciones } from './pages/MisInscripciones';
import { CrearInscripcion } from './pages/CrearInscripcion';
import { DetalleInscripcion } from './pages/DetalleInscripcion';
import { Perfil } from './pages/Perfil';
import { Usuarios } from './pages/admin/Usuarios';
import { TiposAsistente } from './pages/admin/TiposAsistente';
import { Categorias } from './pages/admin/Categorias';
import { Descuentos } from './pages/admin/Descuentos';
import { InscripcionesAdmin } from './pages/admin/InscripcionesAdmin';
import { InscripcionAdminDetalle } from './pages/admin/InscripcionAdminDetalle';

function Home() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen">Cargando...</div>;
  return <Navigate to={user ? '/inscripciones' : '/login'} replace />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/olvide-contrasena" element={<OlvideContrasena />} />
            <Route path="/reset-password" element={<RestablecerContrasena />} />
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/inscripciones" element={<MisInscripciones />} />
              <Route path="/inscripciones/nueva" element={<CrearInscripcion />} />
              <Route path="/inscripciones/:id" element={<DetalleInscripcion />} />
              <Route path="/perfil" element={<Perfil />} />
              <Route element={<AdminRoute />}>
                <Route path="/admin/usuarios" element={<Usuarios />} />
                <Route path="/admin/tipos-asistente" element={<TiposAsistente />} />
                <Route path="/admin/categorias" element={<Categorias />} />
                <Route path="/admin/descuentos" element={<Descuentos />} />
                <Route path="/admin/inscripciones" element={<InscripcionesAdmin />} />
                <Route path="/admin/inscripciones/:id" element={<InscripcionAdminDetalle />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
