"""Utilidades compartidas para rutas."""
import re
from flask import request

from config import EMAIL_MAX_LEN


EMAIL_REGEX = re.compile(r"^[^@]+@[^@]+\.[^@]+$")


def validar_email(email):
    if not email or not isinstance(email, str):
        return False
    email = email.strip()
    if len(email) > EMAIL_MAX_LEN:
        return False
    return bool(EMAIL_REGEX.match(email))


def get_user_id_from_request():
    """
    Obtiene el user_id de la petición.
    Query param ?user_id= o header X-User-Id. Para MVP sin auth real.
    """
    user_id = request.args.get("user_id")
    if user_id is not None:
        try:
            return int(user_id)
        except ValueError:
            return None
    header_val = request.headers.get("X-User-Id")
    if header_val is not None:
        try:
            return int(header_val)
        except ValueError:
            return None
    return None


def require_user_id():
    """Devuelve (user_id, error_response). Si error_response no es None, debe devolverse."""
    from flask import jsonify
    uid = get_user_id_from_request()
    if uid is None:
        return None, (jsonify({"ok": False, "error": "user_id es obligatorio."}), 400)
    return uid, None
