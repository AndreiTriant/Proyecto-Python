from flask import Blueprint, jsonify, request

from extensions import db
from models import MealTemplate, MealComponent
from utils import get_user_id_from_request

bp = Blueprint("meals", __name__, url_prefix="/api")


def _get_uid():
    uid = get_user_id_from_request()
    if uid is None:
        return None, (jsonify({"ok": False, "error": "user_id es obligatorio."}), 400)
    return uid, None


@bp.route("/meals")
def list_meals():
    uid, err = _get_uid()
    if err:
        return err
    templates = db.session.execute(
        db.select(MealTemplate).where(MealTemplate.user_id == uid)
    ).scalars().all()
    return jsonify([t.to_dict() for t in templates])


@bp.route("/meals", methods=["POST"])
def create_meal():
    uid, err = _get_uid()
    if err:
        return err
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"ok": False, "error": "El nombre es obligatorio."}), 400
    t = MealTemplate(
        user_id=uid,
        name=name,
        meal_type=(data.get("meal_type") or "").strip(),
        notes=(data.get("notes") or "").strip(),
        calories=float(data.get("calories") or 0),
        protein=float(data.get("protein") or 0),
        fat=float(data.get("fat") or 0),
        carbs=float(data.get("carbs") or 0),
    )
    db.session.add(t)
    db.session.commit()
    return jsonify(t.to_dict()), 201


@bp.route("/meals/<int:meal_id>")
def get_meal(meal_id):
    uid, err = _get_uid()
    if err:
        return err
    t = db.session.get(MealTemplate, meal_id)
    if not t or t.user_id != uid:
        return jsonify({"ok": False, "error": "Comida no encontrada."}), 404
    out = t.to_dict()
    out["components"] = [c.to_dict() for c in t.components]
    return jsonify(out)


@bp.route("/meals/<int:meal_id>", methods=["PUT"])
def update_meal(meal_id):
    uid, err = _get_uid()
    if err:
        return err
    t = db.session.get(MealTemplate, meal_id)
    if not t or t.user_id != uid:
        return jsonify({"ok": False, "error": "Comida no encontrada."}), 404
    data = request.get_json() or {}
    if "name" in data:
        t.name = (data.get("name") or "").strip() or t.name
    if "meal_type" in data:
        t.meal_type = (data.get("meal_type") or "").strip()
    if "notes" in data:
        t.notes = (data.get("notes") or "").strip()
    if "calories" in data:
        t.calories = float(data.get("calories", 0))
    if "protein" in data:
        t.protein = float(data.get("protein", 0))
    if "fat" in data:
        t.fat = float(data.get("fat", 0))
    if "carbs" in data:
        t.carbs = float(data.get("carbs", 0))
    db.session.commit()
    return jsonify(t.to_dict())


@bp.route("/meals/<int:meal_id>", methods=["DELETE"])
def delete_meal(meal_id):
    uid, err = _get_uid()
    if err:
        return err
    t = db.session.get(MealTemplate, meal_id)
    if not t or t.user_id != uid:
        return jsonify({"ok": False, "error": "Comida no encontrada."}), 404
    db.session.delete(t)
    db.session.commit()
    return jsonify({"ok": True}), 200


@bp.route("/meals/<int:meal_id>/recalculate-nutrition", methods=["POST"])
def recalculate_nutrition(meal_id):
    uid, err = _get_uid()
    if err:
        return err
    t = db.session.get(MealTemplate, meal_id)
    if not t or t.user_id != uid:
        return jsonify({"ok": False, "error": "Comida no encontrada."}), 404
    t.calories = sum(c.calories or 0 for c in t.components)
    t.protein = sum(c.protein or 0 for c in t.components)
    t.fat = sum(c.fat or 0 for c in t.components)
    t.carbs = sum(c.carbs or 0 for c in t.components)
    db.session.commit()
    return jsonify(t.to_dict())


@bp.route("/meals/<int:meal_id>/components", methods=["POST"])
def add_component(meal_id):
    uid, err = _get_uid()
    if err:
        return err
    t = db.session.get(MealTemplate, meal_id)
    if not t or t.user_id != uid:
        return jsonify({"ok": False, "error": "Comida no encontrada."}), 404
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"ok": False, "error": "El nombre del componente es obligatorio."}), 400
    c = MealComponent(
        meal_template_id=t.id,
        name=name,
        quantity=float(data.get("quantity") or 0),
        unit=(data.get("unit") or "g").strip(),
        calories=float(data.get("calories") or 0),
        protein=float(data.get("protein") or 0),
        fat=float(data.get("fat") or 0),
        carbs=float(data.get("carbs") or 0),
    )
    db.session.add(c)
    db.session.commit()
    return jsonify(c.to_dict()), 201


@bp.route("/meal-components/<int:comp_id>", methods=["PUT"])
def update_component(comp_id):
    uid, err = _get_uid()
    if err:
        return err
    c = db.session.get(MealComponent, comp_id)
    if not c:
        return jsonify({"ok": False, "error": "Componente no encontrado."}), 404
    if c.meal_template.user_id != uid:
        return jsonify({"ok": False, "error": "No autorizado."}), 403
    data = request.get_json() or {}
    if "name" in data:
        c.name = (data.get("name") or "").strip() or c.name
    if "quantity" in data:
        c.quantity = float(data.get("quantity", 0))
    if "unit" in data:
        c.unit = (data.get("unit") or "g").strip()
    if "calories" in data:
        c.calories = float(data.get("calories", 0))
    if "protein" in data:
        c.protein = float(data.get("protein", 0))
    if "fat" in data:
        c.fat = float(data.get("fat", 0))
    if "carbs" in data:
        c.carbs = float(data.get("carbs", 0))
    db.session.commit()
    return jsonify(c.to_dict())


@bp.route("/meal-components/<int:comp_id>", methods=["DELETE"])
def delete_component(comp_id):
    uid, err = _get_uid()
    if err:
        return err
    c = db.session.get(MealComponent, comp_id)
    if not c:
        return jsonify({"ok": False, "error": "Componente no encontrado."}), 404
    if c.meal_template.user_id != uid:
        return jsonify({"ok": False, "error": "No autorizado."}), 403
    db.session.delete(c)
    db.session.commit()
    return jsonify({"ok": True}), 200
