import os
from dotenv import load_dotenv

load_dotenv()

# Límites de longitud (una sola fuente de verdad; sin depender de app ni models)
USUARIO_MAX_LEN = 50
EMAIL_MAX_LEN = 120
PASSWORD_MIN_LEN = 8
PASSWORD_MAX_LEN = 128

# Sesión Flask: cookie firmada (no JWT en cliente), HttpOnly activado en app.py.
# Producción: definir FLASK_SECRET_KEY (valor largo y aleatorio) y HTTPS.
FLASK_SECRET_KEY = os.environ.get("FLASK_SECRET_KEY", "")
# true solo con HTTPS; si lo activas en http:// local la cookie puede no guardarse en el navegador.
SESSION_COOKIE_SECURE = os.environ.get("FLASK_SESSION_COOKIE_SECURE", "").lower() in (
    "1",
    "true",
    "yes",
)
# Por defecto Lax (recomendado con proxy del front o mismo dominio). None + Secure para API en otro dominio (HTTPS).
SESSION_COOKIE_SAMESITE = os.environ.get("FLASK_SESSION_COOKIE_SAMESITE", "Lax")
# Cookie de sesión permanente (~6 meses). Sobrescribible con FLASK_SESSION_LIFETIME_DAYS.
SESSION_LIFETIME_DAYS = int(os.environ.get("FLASK_SESSION_LIFETIME_DAYS", "183"))

# --- IA (LM Studio / OpenAI-compatible) ---
# Para LM Studio: suele exponer un endpoint compatible OpenAI en http://127.0.0.1:1234/v1
AI_PROVIDER = os.environ.get("AI_PROVIDER", "lmstudio").strip().lower() or "lmstudio"
LM_STUDIO_BASE_URL = os.environ.get("LM_STUDIO_BASE_URL", "http://127.0.0.1:1234/v1").strip()
LM_STUDIO_MODEL = os.environ.get("LM_STUDIO_MODEL", "").strip()
