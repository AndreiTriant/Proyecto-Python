import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./components/AppLayout";
import Home from "./pages/Home";
import Login from "./features/auth/Login";
import Registro from "./features/auth/Registro";
import Dashboard from "./pages/Dashboard";
import Dietas from "./pages/Dietas";
import DietaNueva from "./pages/DietaNueva";
import DietaEditar from "./pages/DietaEditar";
import Comidas from "./pages/Comidas";
import ComidaNueva from "./pages/ComidaNueva";
import ComidaEditar from "./pages/ComidaEditar";
import Progreso from "./pages/Progreso";
import "./styles/global.css";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Registro />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="dietas" element={<Dietas />} />
            <Route path="dietas/nueva" element={<DietaNueva />} />
            <Route path="dietas/:id" element={<DietaEditar />} />
            <Route path="comidas" element={<Comidas />} />
            <Route path="comidas/nueva" element={<ComidaNueva />} />
            <Route path="comidas/:id" element={<ComidaEditar />} />
            <Route path="progreso" element={<Progreso />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
