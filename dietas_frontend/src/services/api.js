import { API_URL } from "../constantes";

export function apiUrl(path, params = {}) {
  const u = new URL(path.startsWith("http") ? path : `${API_URL}${path}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v != null && v !== "") u.searchParams.set(k, String(v));
  });
  return u.toString();
}

export async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  return res.json();
}
