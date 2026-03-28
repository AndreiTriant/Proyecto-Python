import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { API_URL } from "../constantes";
import { apiFetch } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  /** Restaura usuario desde la cookie de sesión (GET /api/me). */
  const refreshUser = useCallback(async () => {
    try {
      const res = await apiFetch(`${API_URL}/api/me`);
      const data = await res.json();
      if (data.ok && data.usuario) {
        setUser(data.usuario);
        return data.usuario;
      }
    } catch (_) {}
    setUser(null);
    return null;
  }, []);

  useEffect(() => {
    // Sesión real = cookie HttpOnly del servidor; no guardamos usuario en localStorage (evita XSS leyendo token).
    // Borramos clave antigua por si quedó de una versión previa del MVP.
    try {
      localStorage.removeItem("dieta_user");
    } catch (_) {}
    let cancelled = false;
    (async () => {
      await refreshUser();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshUser]);

  const login = useCallback(async (email, password) => {
    const res = await apiFetch(`${API_URL}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    });
    const data = await res.json();
    if (data.ok && data.usuario) {
      setUser(data.usuario);
      return { ok: true, usuario: data.usuario };
    }
    return { ok: false, error: data.error || "Error al iniciar sesión." };
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiFetch(`${API_URL}/api/logout`, { method: "POST" });
    } catch (_) {}
    setUser(null);
  }, []);

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
