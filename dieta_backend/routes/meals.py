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


def _serialize_meal(template, include_components=True):
    out = template.to_dict()
    components = list(template.components)
    out["components_count"] = len(components)
    if include_components:
        out["components"] = [component.to_dict() for component in components]
    return out


def _recalculate_template_from_components(template):
    template.calories = sum(component.calories or 0 for component in template.components)
    template.protein = sum(component.protein or 0 for component in template.components)
    template.fat = sum(component.fat or 0 for component in template.components)
    template.carbs = sum(component.carbs or 0 for component in template.components)


@bp.route("/meals")
def list_meals():
    uid, err = _get_uid()
    if err:
        return err
    query = (request.args.get("q") or "").strip()
    include_components = (request.args.get("include_components") or "1").lower() not in {
        "0",
        "false",
        "no",
    }
    stmt = db.select(MealTemplate).where(MealTemplate.user_id == uid)
    if query:
        stmt = stmt.where(MealTemplate.name.ilike(f"%{query}%"))
    templates = db.session.execute(
        stmt.order_by(MealTemplate.name.asc(), MealTemplate.created_at.desc())
    ).scalars().all()
    return jsonify([_serialize_meal(template, include_components=include_components) for template in templates])


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
    return jsonify(_serialize_meal(t)), 201


@bp.route("/meals/<int:meal_id>")
def get_meal(meal_id):
    uid, err = _get_uid()
    if err:
        return err
    t = db.session.get(MealTemplate, meal_id)
    if not t or t.user_id != uid:
        return jsonify({"ok": False, "error": "Comida no encontrada."}), 404
    return jsonify(_serialize_meal(t))


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
    return jsonify(_serialize_meal(t))


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
    _recalculate_template_from_components(t)
    db.session.commit()
    return jsonify(_serialize_meal(t))


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
    if data.get("recalculate", False):
        db.session.flush()
        _recalculate_template_from_components(t)
    db.session.commit()
    return jsonify({"component": c.to_dict(), "meal": _serialize_meal(t)}), 201


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
    if data.get("recalculate", False):
        _recalculate_template_from_components(c.meal_template)
    db.session.commit()
    return jsonify({"component": c.to_dict(), "meal": _serialize_meal(c.meal_template)})


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
    meal_template = c.meal_template
    db.session.delete(c)
    db.session.flush()
    if request.args.get("recalculate", "0").lower() in {"1", "true", "yes"}:
        _recalculate_template_from_components(meal_template)
    db.session.commit()
    return jsonify({"ok": True, "meal": _serialize_meal(meal_template)}), 200
