import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { API_URL } from "../constantes";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadStoredUser = useCallback(() => {
    try {
      const raw = localStorage.getItem("dieta_user");
      if (raw) {
        const u = JSON.parse(raw);
        setUser(u);
        return u;
      }
    } catch (_) {}
    setUser(null);
    return null;
  }, []);

  useEffect(() => {
    loadStoredUser();
    setLoading(false);
  }, [loadStoredUser]);

  const login = useCallback(async (email, password) => {
    const res = await fetch(`${API_URL}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    });
    const data = await res.json();
    if (data.ok && data.usuario) {
      setUser(data.usuario);
      localStorage.setItem("dieta_user", JSON.stringify(data.usuario));
      return { ok: true, usuario: data.usuario };
    }
    return { ok: false, error: data.error || "Error al iniciar sesión." };
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("dieta_user");
  }, []);

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
    refreshUser: loadStoredUser,
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
