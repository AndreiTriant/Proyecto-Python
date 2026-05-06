import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/AppLayout.css";
import { useEffect, useRef, useState } from "react";
import { API_URL } from "../constantes";
import { apiFetch } from "../services/api";

export default function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const menuRef = useRef(null);

  const nav = [
    { path: "/dashboard", label: "Inicio" },
    { path: "/dietas", label: "Dietas" },
    { path: "/comidas", label: "Comidas" },
    { path: "/progreso", label: "Progreso" },
  ];

  useEffect(() => {
    const onDocClick = (e) => {
      if (!accountMenuOpen) return;
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setAccountMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [accountMenuOpen]);

  const requestDeleteAccount = async () => {
    if (deletingAccount) return;
    const displayName = user?.usuario || user?.email || "tu cuenta";
    const ok = window.confirm(
      `Vas a borrar ${displayName} y todos sus datos (dietas, comidas y seguimiento).\n\nEsta acción NO se puede deshacer.\n\n¿Quieres continuar?`
    );
    if (!ok) return;

    const ok2 = window.confirm("Último paso: confirma que quieres borrar tu cuenta definitivamente.");
    if (!ok2) return;

    try {
      setDeletingAccount(true);
      const res = await apiFetch(`${API_URL}/api/account`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error || "No se pudo borrar la cuenta.");
      }
      await logout();
      window.location.href = "/";
    } catch (err) {
      window.alert(err.message || "No se pudo borrar la cuenta.");
    } finally {
      setDeletingAccount(false);
      setAccountMenuOpen(false);
    }
  };

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
          <div className="account-footer-row">
            <span className="user-name" title={user?.usuario || user?.email}>
              {user?.usuario || user?.email}
            </span>
            <div className="account-menu" ref={menuRef}>
            <button
              type="button"
              className="account-settings-button"
              onClick={() => setAccountMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={accountMenuOpen}
              title="Configuración"
            >
              ⚙
            </button>
            {accountMenuOpen ? (
              <div className="account-menu-popover" role="menu">
                <button
                  type="button"
                  className="account-menu-item account-menu-item-danger"
                  onClick={requestDeleteAccount}
                  disabled={deletingAccount}
                  role="menuitem"
                >
                  {deletingAccount ? "Borrando cuenta…" : "Borrar cuenta"}
                </button>
              </div>
            ) : null}
            </div>
          </div>
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
