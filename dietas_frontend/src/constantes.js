// Límites (deben coincidir con el backend)
export const USUARIO_MAX_LEN = 50;
export const EMAIL_MAX_LEN = 120;
export const PASSWORD_MIN_LEN = 8;
export const PASSWORD_MAX_LEN = 128;

/**
 * URL base del API.
 *
 * Desarrollo recomendado: dejar vacío (sin REACT_APP_API_URL en .env). Las URLs son relativas
 * (/api/...) y el "proxy" de package.json reenvía a Flask: el navegador ve un solo origen
 * (localhost:3000) y la cookie de sesión HttpOnly se envía bien con SameSite=Lax.
 *
 * Si defines REACT_APP_API_URL=http://127.0.0.1:8080, el front llama al API en otro origen
 * (localhost:3000 → 127.0.0.1:8080): muchos navegadores no mandan la cookie de sesión en ese
 * caso con Lax; la sesión puede fallar. Para ese modo haría falta HTTPS, SameSite=None, etc.
 *
 * Producción: REACT_APP_API_URL=https://tu-api.example.com (HTTPS + CORS y cookies acordes en Flask).
 */
export const API_URL = (process.env.REACT_APP_API_URL || "").replace(/\/$/, "");

export function validarEmail(email) {
  if (!email || typeof email !== "string") return false;
  const e = email.trim();
  if (e.length > EMAIL_MAX_LEN) return false;
  return /^[^@]+@[^@]+\.[^@]+$/.test(e);
}
