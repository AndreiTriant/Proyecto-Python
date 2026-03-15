import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/AppLayout.css";

export default function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const nav = [
    { path: "/dashboard", label: "Inicio" },
    { path: "/dietas", label: "Dietas" },
    { path: "/comidas", label: "Comidas" },
    { path: "/progreso", label: "Progreso" },
  ];

  return (
    <div className="app-layout">
      <aside className="app-sidebar">
        <div className="sidebar-header">
          <span className="sidebar-brand">Dieta MVP</span>
        </div>
        <nav className="sidebar-nav">
          {nav.map(({ path, label }) => (
            <Link
              key={path}
              to={path}
              className={location.pathname === path ? "active" : ""}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span className="user-name">{user?.usuario || user?.email}</span>
          <button type="button" onClick={logout} className="btn-logout">
            Salir
          </button>
        </div>
      </aside>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
