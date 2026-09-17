import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';
import { CongresoAdminRoute } from './components/CongresoAdminRoute';
import { NotAdminRoute } from './components/NotAdminRoute';
import { AuthLayout } from './layouts/AuthLayout';
import { GlobalLayout } from './layouts/GlobalLayout';
import { DashboardLayout } from './layouts/DashboardLayout';
import { CongresoLayout } from './layouts/CongresoLayout';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { OlvideContrasena } from './pages/OlvideContrasena';
import { RestablecerContrasena } from './pages/RestablecerContrasena';
import { CongresoOverview } from './pages/CongresoOverview';
import { MisInscripciones } from './pages/MisInscripciones';
import { CrearInscripcion } from './pages/CrearInscripcion';
import { DetalleInscripcion } from './pages/DetalleInscripcion';
import { Perfil } from './pages/Perfil';
import { MisPonencias } from './pages/MisPonencias';
import { Agenda } from './pages/Agenda';
import { DetallePonencia } from './pages/DetallePonencia';
import { Usuarios } from './pages/admin/Usuarios';
import { TiposAsistente } from './pages/admin/TiposAsistente';
import { Categorias } from './pages/admin/Categorias';
import { Descuentos } from './pages/admin/Descuentos';
import { InscripcionesAdmin } from './pages/admin/InscripcionesAdmin';
import { InscripcionAdminDetalle } from './pages/admin/InscripcionAdminDetalle';
import { PonenciasAdmin } from './pages/admin/PonenciasAdmin';
import { PonenciaAdminDetalle } from './pages/admin/PonenciaAdminDetalle';
import { AreasEstudio } from './pages/admin/AreasEstudio';
import { Instituciones } from './pages/admin/Instituciones';
import { TiposParticipacion } from './pages/admin/TiposParticipacion';
import { MensajesPredeterminados } from './pages/admin/MensajesPredeterminados';
import { EstadisticasCongreso } from './pages/admin/EstadisticasCongreso';
import { Salones } from './pages/admin/Salones';
import { Horarios } from './pages/admin/Horarios';
import { CalendarioAdmin } from './pages/admin/CalendarioAdmin';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/olvide-contrasena" element={<OlvideContrasena />} />
            <Route path="/reset-password" element={<RestablecerContrasena />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            {/* GLOBAL — no depende de ningún congreso */}
            <Route element={<GlobalLayout />}>
              {/* Selector de congreso: aterrizaje tras login */}
              <Route path="/" element={<Home />} />
              <Route path="/perfil" element={<Perfil />} />
              <Route element={<AdminRoute />}>
                <Route path="/admin/usuarios" element={<Usuarios />} />
                <Route path="/admin/instituciones" element={<Instituciones />} />
              </Route>
            </Route>

            {/* POR CONGRESO */}
            <Route path="/congresos/:id_congreso" element={<CongresoLayout />}>
              <Route element={<DashboardLayout />}>
                {/* Landing del congreso: visible a todos los roles, incluidos ambos tipos de Admin */}
                <Route index element={<CongresoOverview />} />
                <Route path="agenda" element={<Agenda />} />
                <Route element={<NotAdminRoute />}>
                  <Route path="inscripciones" element={<MisInscripciones />} />
                  <Route path="inscripciones/nueva" element={<CrearInscripcion />} />
                  <Route path="inscripciones/:id" element={<DetalleInscripcion />} />
                  <Route path="ponencias" element={<MisPonencias />} />
                  <Route path="ponencias/:id" element={<DetallePonencia />} />
                </Route>
                <Route element={<CongresoAdminRoute />}>
                  <Route path="admin/categorias" element={<Categorias />} />
                  <Route path="admin/tipos-asistente" element={<TiposAsistente />} />
                  <Route path="admin/descuentos" element={<Descuentos />} />
                  <Route path="admin/areas-estudio" element={<AreasEstudio />} />
                  <Route path="admin/tipos-participacion" element={<TiposParticipacion />} />
                  <Route path="admin/mensajes-predeterminados" element={<MensajesPredeterminados />} />
                  <Route path="admin/salones" element={<Salones />} />
                  <Route path="admin/inscripciones" element={<InscripcionesAdmin />} />
                  <Route path="admin/inscripciones/:id" element={<InscripcionAdminDetalle />} />
                  <Route path="admin/ponencias" element={<PonenciasAdmin />} />
                  <Route path="admin/ponencias/:id" element={<PonenciaAdminDetalle />} />
                  <Route path="admin/horarios" element={<Horarios />} />
                  <Route path="admin/calendario" element={<CalendarioAdmin />} />
                  <Route path="admin/estadisticas" element={<EstadisticasCongreso />} />
                </Route>
              </Route>
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
