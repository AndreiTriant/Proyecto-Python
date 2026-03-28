"""
Aplicación Flask. Crea app, vincula db (extensions) con init_app, registra modelos y blueprints.
Sesión: cookie firmada HttpOnly (Flask session); el front debe enviar credentials en fetch/CORS.
"""
from datetime import timedelta
from pathlib import Path

from flask import Flask
from flask_cors import CORS

from config import (
    FLASK_SECRET_KEY,
    SESSION_COOKIE_SAMESITE,
    SESSION_COOKIE_SECURE,
    SESSION_LIFETIME_DAYS,
)
from extensions import db, migrate
from routes import auth_bp, diets_bp, meals_bp, tracking_bp, progress_bp

app = Flask(__name__)
# Clave para firmar la cookie de sesión; en producción usar FLASK_SECRET_KEY en el entorno.
app.config["SECRET_KEY"] = FLASK_SECRET_KEY or "dev-change-in-production"
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SECURE"] = SESSION_COOKIE_SECURE
# Lax: cookies no se envían en requests cross-site "complejos"; por eso en dev conviene proxy + URLs relativas.
# Cross-site real (front y API en dominios distintos) en HTTPS suele requerir SameSite=None + Secure (ver config.py / README).
app.config["SESSION_COOKIE_SAMESITE"] = SESSION_COOKIE_SAMESITE
app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(days=SESSION_LIFETIME_DAYS)

# Orígenes explícitos: con supports_credentials no se puede usar "*".
# Si el front usa solo el proxy (mismo origen en la práctica), igual hace falta para preflight u orígenes distintos.
CORS_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"]
# True: Access-Control-Allow-Credentials y el cliente puede usar fetch(..., { credentials: "include" }).
CORS(
    app,
    origins=CORS_ORIGINS,
    supports_credentials=True,
    allow_headers=["Content-Type"],
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
)


# Base de datos
BASE_DIR = Path(__file__).resolve().parent
instance_dir = BASE_DIR / "instance"
instance_dir.mkdir(exist_ok=True)
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///" + str(instance_dir / "app.db")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db.init_app(app)
migrate.init_app(app, db)

# Importar modelos después de init_app
import models  # noqa: E402

# Blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(diets_bp)
app.register_blueprint(meals_bp)
app.register_blueprint(tracking_bp)
app.register_blueprint(progress_bp)


# Rutas legacy / mínimas
@app.route("/")
def home():
    return "Backend DIETA_MVP funcionando."


@app.route("/api/usuarios")
def listar_usuarios():
    from flask import jsonify
    usuarios = db.session.execute(db.select(models.Usuario)).scalars().all()
    return jsonify([u.to_dict() for u in usuarios])


@app.route("/api/food_items")
def listar_food_items():
    from flask import jsonify
    from models import FoodItem
    items = db.session.execute(db.select(FoodItem)).scalars().all()
    return jsonify([i.to_dict() for i in items])


if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=8080, use_reloader=False)
