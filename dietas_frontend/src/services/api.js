import { API_URL } from "../constantes";

/**
 * Igual que fetch pero envía cookies (sesión Flask). Obligatorio para /api/login, /api/me, etc.
 * Sin credentials: "include" el navegador no manda la cookie aunque exista.
 */
export function apiFetch(input, init = {}) {
  return fetch(input, { credentials: "include", ...init });
}

export function apiUrl(path, params = {}) {
  const combined = path.startsWith("http") ? path : `${API_URL}${path}`;
  // API_URL vacío → URL relativa (/api/...): resuelve contra el origen de la página (proxy CRA en dev).
  const u = combined.startsWith("http")
    ? new URL(combined)
    : new URL(
        combined,
        typeof window !== "undefined" ? window.location.origin : "http://localhost:3000",
      );
  Object.entries(params).forEach(([k, v]) => {
    if (v != null && v !== "") u.searchParams.set(k, String(v));
  });
  return u.toString();
}

export async function fetchJson(url, options = {}) {
  const res = await apiFetch(url, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  return res.json();
}
