"""
Aplicación Flask. Crea app, vincula db (extensions) con init_app, registra modelos y blueprints.
"""
from pathlib import Path

from flask import Flask, request
from flask_cors import CORS

from extensions import db, migrate
from routes import auth_bp, diets_bp, meals_bp, tracking_bp, progress_bp

app = Flask(__name__)
app.config["SECRET_KEY"] = "dev-change-in-production"
CORS(app, origins=["http://localhost:3000", "http://127.0.0.1:3000"], supports_credentials=False)

ALLOWED_ORIGINS = ("http://localhost:3000", "http://127.0.0.1:3000")


@app.after_request
def add_cors_headers(response):
    origin = request.environ.get("HTTP_ORIGIN", "http://localhost:3000")
    if origin not in ALLOWED_ORIGINS:
        origin = "http://localhost:3000"
    response.headers["Access-Control-Allow-Origin"] = origin
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    return response


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
