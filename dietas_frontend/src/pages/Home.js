import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Home() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>Cargando…</div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="landing">
      <h1>Dieta MVP</h1>
      <p>Gestiona tus dietas semanales y tu seguimiento nutricional.</p>
      <p>
        <Link to="/registro">Registro</Link> · <Link to="/login">Login</Link>
      </p>
    </div>
  );
}
