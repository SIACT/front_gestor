import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthLayout } from './layouts/AuthLayout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { MisInscripciones } from './pages/MisInscripciones';
import { CrearInscripcion } from './pages/CrearInscripcion';
import { DetalleInscripcion } from './pages/DetalleInscripcion';
import { AdminUsuarios } from './pages/AdminUsuarios';

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
          </Route>
          <Route
            path="/inscripciones"
            element={
              <ProtectedRoute>
                <MisInscripciones />
              </ProtectedRoute>
            }
          />
          <Route
            path="/inscripciones/nueva"
            element={
              <ProtectedRoute>
                <CrearInscripcion />
              </ProtectedRoute>
            }
          />
          <Route
            path="/inscripciones/:id"
            element={
              <ProtectedRoute>
                <DetalleInscripcion />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/usuarios"
            element={
              <ProtectedRoute>
                <AdminUsuarios />
              </ProtectedRoute>
            }
            
          />
          
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
