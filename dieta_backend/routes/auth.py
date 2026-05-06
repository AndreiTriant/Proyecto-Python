from flask import Blueprint, jsonify, request, session
from werkzeug.security import generate_password_hash, check_password_hash

from config import (
    EMAIL_MAX_LEN,
    PASSWORD_MAX_LEN,
    PASSWORD_MIN_LEN,
    USUARIO_MAX_LEN,
)
from extensions import db
import models
from utils import validar_email

bp = Blueprint("auth", __name__, url_prefix="/api")


@bp.route("/registro", methods=["POST"])
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
    # Iniciar sesión en cookie HttpOnly (misma política que login). permanent + PERMANENT_SESSION_LIFETIME en app.
    session.clear()
    session["user_id"] = nuevo.id
    session.permanent = True
    return jsonify({"ok": True, "usuario": nuevo.to_dict()}), 201


@bp.route("/login", methods=["POST"])
def login():
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

    # Cookie de sesión firmada (HttpOnly se configura en app); user_id no sale en el cuerpo como secreto.
    session.clear()
    session["user_id"] = user.id
    session.permanent = True
    return jsonify({"ok": True, "usuario": user.to_dict()})


@bp.route("/logout", methods=["POST"])
def logout():
    """Cierra sesión y borra la cookie de sesión."""
    session.clear()
    return jsonify({"ok": True})


@bp.route("/me", methods=["GET"])
def me():
    """Usuario autenticado por cookie de sesión (sin token en localStorage)."""
    uid = session.get("user_id")
    if uid is None:
        return jsonify({"ok": False, "error": "No autenticado."}), 401
    try:
        uid = int(uid)
    except (TypeError, ValueError):
        session.clear()
        return jsonify({"ok": False, "error": "No autenticado."}), 401
    user = db.session.get(models.Usuario, uid)
    if not user:
        session.clear()
        return jsonify({"ok": False, "error": "No autenticado."}), 401
    return jsonify({"ok": True, "usuario": user.to_dict()})


@bp.route("/account", methods=["DELETE"])
def delete_account():
    """
    Borra la cuenta autenticada (por cookie de sesión) y todos sus datos asociados.
    """
    uid = session.get("user_id")
    if uid is None:
        return jsonify({"ok": False, "error": "No autenticado."}), 401
    try:
        uid = int(uid)
    except (TypeError, ValueError):
        session.clear()
        return jsonify({"ok": False, "error": "No autenticado."}), 401

    user = db.session.get(models.Usuario, uid)
    if not user:
        session.clear()
        return jsonify({"ok": False, "error": "No autenticado."}), 401

    # Borrado manual para evitar problemas de FK (SQLite sin ON DELETE CASCADE por defecto).
    plan_ids_subq = db.select(models.DietPlan.id).where(models.DietPlan.user_id == uid)
    day_ids_subq = db.select(models.DietDay.id).where(models.DietDay.diet_plan_id.in_(plan_ids_subq))
    template_ids_subq = db.select(models.MealTemplate.id).where(models.MealTemplate.user_id == uid)

    try:
        # Tracking / progreso
        db.session.execute(
            db.delete(models.MealLogEntry).where(models.MealLogEntry.user_id == uid)
        )
        db.session.execute(
            db.delete(models.DietDayStatusEntry).where(models.DietDayStatusEntry.user_id == uid)
        )
        db.session.execute(
            db.delete(models.WeightEntry).where(models.WeightEntry.user_id == uid)
        )

        # Dietas (primero asignaciones, luego días, luego planes)
        db.session.execute(
            db.delete(models.DietDayMeal).where(models.DietDayMeal.diet_day_id.in_(day_ids_subq))
        )
        db.session.execute(
            db.delete(models.DietDay).where(models.DietDay.id.in_(day_ids_subq))
        )
        db.session.execute(
            db.delete(models.DietPlan).where(models.DietPlan.user_id == uid)
        )

        # Comidas (primero componentes)
        db.session.execute(
            db.delete(models.MealComponent).where(
                models.MealComponent.meal_template_id.in_(template_ids_subq)
            )
        )
        db.session.execute(
            db.delete(models.MealTemplate).where(models.MealTemplate.user_id == uid)
        )

        # Usuario
        db.session.delete(user)
        db.session.commit()
    except Exception as exc:
        db.session.rollback()
        return jsonify({"ok": False, "error": f"No se pudo borrar la cuenta: {exc}"}), 500

    session.clear()
    return jsonify({"ok": True})
