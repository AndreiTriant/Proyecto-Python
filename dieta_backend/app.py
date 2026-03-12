"""
Aplicación Flask. Crea app, vincula db (extensions) con init_app, registra modelos y rutas.
Orden: app → db.init_app(app) → import models.
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
from extensions import db, migrate

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
migrate.init_app(app, db)

from models import (
    Usuario,
    FoodItem,
    Meal,
    MealFood,
    DietPlan,
    DietPlanMeal,
)

# Importar modelos después de init_app para que se registren con esta app
import models  # noqa: E402

# Constantes y utilidades
EMAIL_REGEX = re.compile(r"^[^@]+@[^@]+\.[^@]+$")

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

@app.route("/api/usuarios")
def listar_usuarios():
    """Lista usuarios (sin exponer password_hash)."""
    usuarios = db.session.execute(db.select(models.Usuario)).scalars().all()
    return jsonify([u.to_dict() for u in usuarios])


@app.route("/api/registro", methods=["POST"])
def registro():
    data = request.get_json() or {}
    usuario = (data.get("usuario") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if len(usuario) > USUARIO_MAX_LEN:
        return (
            jsonify({"ok": False, "error": f"Usuario no puede superar {USUARIO_MAX_LEN} caracteres."}),
            400,
        )
    if len(usuario) == 0:
        return jsonify({"ok": False, "error": "El usuario es obligatorio."}), 400
    if len(password) < PASSWORD_MIN_LEN:
        return (
            jsonify({"ok": False, "error": f"La contraseña debe tener al menos {PASSWORD_MIN_LEN} caracteres."}),
            400,
        )
    if len(password) > PASSWORD_MAX_LEN:
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

    password_hash = generate_password_hash(password, method="pbkdf2:sha256")
    nuevo = models.Usuario(usuario=usuario, email=email, password_hash=password_hash)
    db.session.add(nuevo)
    db.session.commit()
    return jsonify({"ok": True, "usuario": nuevo.to_dict()}), 201


@app.route("/api/login", methods=["POST"])
def login():
    """
    Login por email y contraseña. Body JSON: email, password.
    Comparación segura con check_password_hash. Queries parametrizadas.
    """
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email:
        return jsonify({"ok": False, "error": "El correo es obligatorio."}), 400
    if not password:
        return jsonify({"ok": False, "error": "La contraseña es obligatoria."}), 400

    user = db.session.execute(
        db.select(models.Usuario).where(models.Usuario.email == email)
    ).scalar_one_or_none()
    if not user:
        return jsonify({"ok": False, "error": "Correo o contraseña incorrectos."}), 401
    if not check_password_hash(user.password_hash, password):
        return jsonify({"ok": False, "error": "Correo o contraseña incorrectos."}), 401

    return jsonify({"ok": True, "usuario": user.to_dict()})


def _get_user_id_from_request() -> int | None:
    """
    Obtiene el user_id de la petición.

    Estrategia sencilla para desarrollo: primero mira query param ?user_id=,
    y como alternativa, un header X-User-Id. Esto NO es seguridad real,
    solo sirve para filtrar datos por usuario en el MVP.
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


@app.route("/api/food_items")
def listar_food_items():
    """Devuelve todos los FoodItem disponibles."""
    items = db.session.execute(db.select(FoodItem)).scalars().all()
    return jsonify([i.to_dict() for i in items])


@app.route("/api/meals")
def listar_meals():
    """
    Lista comidas de un usuario.

    Requiere user_id (query param o header X-User-Id).
    Opcionalmente acepta ?date=YYYY-MM-DD para filtrar por un día concreto.
    """
    user_id = _get_user_id_from_request()
    if not user_id:
        return jsonify({"ok": False, "error": "user_id es obligatorio para listar meals."}), 400

    stmt = db.select(Meal).where(Meal.user_id == user_id)

    date_str = request.args.get("date")
    if date_str:
        from datetime import date as _date

        try:
            year, month, day = map(int, date_str.split("-"))
            target_date = _date(year, month, day)
            stmt = stmt.where(Meal.date == target_date)
        except ValueError:
            return jsonify({"ok": False, "error": "date debe tener formato YYYY-MM-DD."}), 400

    meals = db.session.execute(stmt).scalars().all()
    return jsonify([m.to_dict() for m in meals])


@app.route("/api/meals/<int:meal_id>")
def detalle_meal(meal_id: int):
    """
    Devuelve el detalle de una comida, incluyendo sus FoodItems asociados.
    """
    meal = db.session.get(Meal, meal_id)
    if not meal:
        return jsonify({"ok": False, "error": "Meal no encontrada."}), 404

    meal_dict = meal.to_dict()
    meal_dict["foods"] = [
        {
            "meal_food_id": mf.id,
            "meals_number": mf.meals_number,
            "food_item": mf.food_item.to_dict() if mf.food_item else None,
        }
        for mf in meal.meal_foods
    ]
    return jsonify(meal_dict)


@app.route("/api/diet_plans")
def listar_diet_plans():
    """
    Lista planes de dieta de un usuario.

    Requiere user_id (query param o header X-User-Id).
    """
    user_id = _get_user_id_from_request()
    if not user_id:
        return jsonify({"ok": False, "error": "user_id es obligatorio para listar planes de dieta."}), 400

    plans = db.session.execute(
        db.select(DietPlan).where(DietPlan.user_id == user_id)
    ).scalars().all()
    return jsonify([p.to_dict() for p in plans])


@app.route("/api/diet_plans/<int:plan_id>")
def detalle_diet_plan(plan_id: int):
    """
    Devuelve el detalle de un plan de dieta, incluyendo las comidas por día.
    """
    plan = db.session.get(DietPlan, plan_id)
    if not plan:
        return jsonify({"ok": False, "error": "Plan de dieta no encontrado."}), 404

    plan_dict = plan.to_dict()
    plan_dict["meals_by_day"] = [
        {
            "diet_plan_meal_id": dpm.id,
            "day": dpm.day.value,
            "quantity": dpm.quantity,
            "meal": dpm.meal.to_dict() if dpm.meal else None,
        }
        for dpm in plan.diet_plan_meals
    ]
    return jsonify(plan_dict)


if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=8080, use_reloader=False)
