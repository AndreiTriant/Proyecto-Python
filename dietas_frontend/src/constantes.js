// Límites (deben coincidir con el backend)
export const USUARIO_MAX_LEN = 50;
export const EMAIL_MAX_LEN = 120;
export const PASSWORD_MIN_LEN = 8;
export const PASSWORD_MAX_LEN = 128;

export const API_URL = "http://127.0.0.1:8080";

export function validarEmail(email) {
  if (!email || typeof email !== "string") return false;
  const e = email.trim();
  if (e.length > EMAIL_MAX_LEN) return false;
  return /^[^@]+@[^@]+\.[^@]+$/.test(e);
}
