"""
Aplicación Flask. Crea app, vincula db (extensions) con init_app, registra modelos y rutas.
Orden: app → db.init_app(app) → import models → create_all().
"""
import re
from pathlib import Path

from flask import Flask, jsonify, request
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash

from config import (
    EMAIL_MAX_LEN,
    PASSWORD_MAX_LEN,
    PASSWORD_MIN_LEN,
    USUARIO_MAX_LEN,
)
from extensions import db

app = Flask(__name__)
app.config["SECRET_KEY"] = "dev-change-in-production"
CORS(app, origins=["http://localhost:3000", "http://127.0.0.1:3000"], supports_credentials=False)

ALLOWED_ORIGINS = ("http://localhost:3000", "http://127.0.0.1:3000")


@app.after_request
def add_cors_headers(response):
    """Añade CORS a todas las respuestas (incluidas las de error)."""
    origin = request.environ.get("HTTP_ORIGIN", "http://localhost:3000")
    if origin not in ALLOWED_ORIGINS:
        origin = "http://localhost:3000"
    response.headers["Access-Control-Allow-Origin"] = origin
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    return response


# Base de datos
BASE_DIR = Path(__file__).resolve().parent
instance_dir = BASE_DIR / "instance"
instance_dir.mkdir(exist_ok=True)
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///" + str(instance_dir / "app.db")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db.init_app(app)

# Importar modelos después de init_app para que se registren con esta app
import models  # noqa: E402

with app.app_context():
    db.create_all()

# Constantes y utilidades
EMAIL_REGEX = re.compile(r"^[^@]+@[^@]+\.[^@]+$")
Autor = "Andrei"


def validar_email(email):
    """Comprueba que el correo tenga @ y formato válido."""
    if not email or not isinstance(email, str):
        return False
    email = email.strip()
    if len(email) > EMAIL_MAX_LEN:
        return False
    return bool(EMAIL_REGEX.match(email))


# --- Rutas ---


@app.route("/")
def home():
    return "Backend DIETA_MVP funcionando."


@app.route("/api/autor")
def autor():
    return jsonify({"Autor": Autor})


@app.route("/api/usuarios")
def listar_usuarios():
    """Lista usuarios (sin exponer password_hash)."""
    usuarios = db.session.execute(db.select(models.Usuario)).scalars().all()
    return jsonify([u.to_dict() for u in usuarios])


@app.route("/api/registro", methods=["POST"])
def registro():
    """
    Registro de usuario. Body JSON: usuario, email, contraseña.
    Validaciones: longitudes, email válido, email no duplicado.
    Contraseña hasheada. Queries parametrizadas vía SQLAlchemy.
    """
    data = request.get_json() or {}
    usuario = (data.get("usuario") or "").strip()
    email = (data.get("email") or "").strip().lower()
    contraseña = data.get("contraseña") or ""

    if len(usuario) > USUARIO_MAX_LEN:
        return (
            jsonify({"ok": False, "error": f"Usuario no puede superar {USUARIO_MAX_LEN} caracteres."}),
            400,
        )
    if len(usuario) == 0:
        return jsonify({"ok": False, "error": "El usuario es obligatorio."}), 400
    if len(contraseña) < PASSWORD_MIN_LEN:
        return (
            jsonify({"ok": False, "error": f"La contraseña debe tener al menos {PASSWORD_MIN_LEN} caracteres."}),
            400,
        )
    if len(contraseña) > PASSWORD_MAX_LEN:
        return (
            jsonify({"ok": False, "error": f"La contraseña no puede superar {PASSWORD_MAX_LEN} caracteres."}),
            400,
        )
    if not validar_email(email):
        return jsonify({"ok": False, "error": "El correo no es válido (debe contener @ y dominio)."}), 400

    existente = db.session.execute(
        db.select(models.Usuario).where(models.Usuario.email == email)
    ).scalar_one_or_none()
    if existente:
        return jsonify({"ok": False, "error": "Ya existe una cuenta con ese correo."}), 409

    password_hash = generate_password_hash(contraseña, method="pbkdf2:sha256")
    nuevo = models.Usuario(usuario=usuario, email=email, password_hash=password_hash)
    db.session.add(nuevo)
    db.session.commit()
    return jsonify({"ok": True, "usuario": nuevo.to_dict()}), 201


@app.route("/api/login", methods=["POST"])
def login():
    """
    Login por email y contraseña. Body JSON: email, contraseña.
    Comparación segura con check_password_hash. Queries parametrizadas.
    """
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    contraseña = data.get("contraseña") or ""

    if not email:
        return jsonify({"ok": False, "error": "El correo es obligatorio."}), 400
    if not contraseña:
        return jsonify({"ok": False, "error": "La contraseña es obligatoria."}), 400

    user = db.session.execute(
        db.select(models.Usuario).where(models.Usuario.email == email)
    ).scalar_one_or_none()
    if not user:
        return jsonify({"ok": False, "error": "Correo o contraseña incorrectos."}), 401
    if not check_password_hash(user.password_hash, contraseña):
        return jsonify({"ok": False, "error": "Correo o contraseña incorrectos."}), 401

    return jsonify({"ok": True, "usuario": user.to_dict()})


if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=8080, use_reloader=False)
