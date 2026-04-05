from datetime import date as date_type
from flask import Blueprint, jsonify, request

from extensions import db
from models import DietPlan, DietDay, DietDayMeal, MealTemplate, WeekDay
from utils import get_user_id_from_request

bp = Blueprint("diets", __name__, url_prefix="/api/diets")


def _get_uid():
    uid = get_user_id_from_request()
    if uid is None:
        return None, (jsonify({"ok": False, "error": "user_id es obligatorio."}), 400)
    return uid, None


def _serialize_meal_template(template):
    out = template.to_dict()
    out["components"] = [component.to_dict() for component in template.components]
    return out


def _serialize_day_meal(day_meal):
    return {
        **day_meal.to_dict(),
        "meal_template": _serialize_meal_template(day_meal.meal_template)
        if day_meal.meal_template
        else None,
    }


def _serialize_diet(plan):
    out = plan.to_dict()
    out["days"] = []
    for day in sorted(plan.diet_days, key=lambda item: list(WeekDay).index(item.weekday)):
        day_dict = day.to_dict()
        day_dict["meals"] = [_serialize_day_meal(day_meal) for day_meal in day.diet_day_meals]
        out["days"].append(day_dict)
    return out


def _get_diet_day(plan_id, weekday):
    return db.session.execute(
        db.select(DietDay).where(
            DietDay.diet_plan_id == plan_id,
            DietDay.weekday == weekday,
        )
    ).scalar_one_or_none()


def _ensure_diet_day(plan_id, weekday):
    diet_day = _get_diet_day(plan_id, weekday)
    if diet_day:
        return diet_day
    diet_day = DietDay(diet_plan_id=plan_id, weekday=weekday)
    db.session.add(diet_day)
    db.session.flush()
    return diet_day


def _normalize_day_orders(diet_day):
    ordered_meals = sorted(
        diet_day.diet_day_meals,
        key=lambda item: ((item.order if item.order is not None else 0), item.id or 0),
    )
    for index, day_meal in enumerate(ordered_meals):
        day_meal.order = index
    return ordered_meals


@bp.route("")
def list_diets():
    uid, err = _get_uid()
    if err:
        return err
    plans = db.session.execute(db.select(DietPlan).where(DietPlan.user_id == uid)).scalars().all()
    return jsonify([p.to_dict() for p in plans])


@bp.route("", methods=["POST"])
def create_diet():
    uid, err = _get_uid()
    if err:
        return err
    data = request.get_json() or {}
    name = (data.get("name") or "Mi dieta").strip() or "Mi dieta"
    plan = DietPlan(user_id=uid, name=name, is_active=False)
    db.session.add(plan)
    db.session.flush()
    for wd in WeekDay:
        day = DietDay(diet_plan_id=plan.id, weekday=wd)
        db.session.add(day)
    db.session.commit()
    return jsonify(plan.to_dict()), 201


@bp.route("/<int:plan_id>")
def get_diet(plan_id):
    uid, err = _get_uid()
    if err:
        return err
    plan = db.session.get(DietPlan, plan_id)
    if not plan or plan.user_id != uid:
        return jsonify({"ok": False, "error": "Plan no encontrado."}), 404
    return jsonify(_serialize_diet(plan))


@bp.route("/<int:plan_id>", methods=["PUT"])
def update_diet(plan_id):
    uid, err = _get_uid()
    if err:
        return err
    plan = db.session.get(DietPlan, plan_id)
    if not plan or plan.user_id != uid:
        return jsonify({"ok": False, "error": "Plan no encontrado."}), 404
    data = request.get_json() or {}
    if "name" in data:
        plan.name = (data.get("name") or "").strip() or plan.name
    db.session.commit()
    return jsonify(plan.to_dict())


@bp.route("/<int:plan_id>", methods=["DELETE"])
def delete_diet(plan_id):
    uid, err = _get_uid()
    if err:
        return err
    plan = db.session.get(DietPlan, plan_id)
    if not plan or plan.user_id != uid:
        return jsonify({"ok": False, "error": "Plan no encontrado."}), 404
    db.session.delete(plan)
    db.session.commit()
    return jsonify({"ok": True}), 200


@bp.route("/<int:plan_id>/activate", methods=["POST"])
def activate_diet(plan_id):
    uid, err = _get_uid()
    if err:
        return err
    plan = db.session.get(DietPlan, plan_id)
    if not plan or plan.user_id != uid:
        return jsonify({"ok": False, "error": "Plan no encontrado."}), 404
    for p in db.session.execute(db.select(DietPlan).where(DietPlan.user_id == uid)).scalars().all():
        p.is_active = False
    plan.is_active = True
    db.session.commit()
    return jsonify(plan.to_dict())


@bp.route("/<int:plan_id>/days/<weekday>/meals", methods=["POST"])
def add_meal_to_day(plan_id, weekday):
    uid, err = _get_uid()
    if err:
        return err
    plan = db.session.get(DietPlan, plan_id)
    if not plan or plan.user_id != uid:
        return jsonify({"ok": False, "error": "Plan no encontrado."}), 404
    try:
        wd = WeekDay(weekday)
    except ValueError:
        return jsonify({"ok": False, "error": "Día de la semana inválido."}), 400
    diet_day = _ensure_diet_day(plan_id, wd)
    data = request.get_json() or {}
    meal_template_id = data.get("meal_template_id")
    if not meal_template_id:
        return jsonify({"ok": False, "error": "meal_template_id es obligatorio."}), 400
    mt = db.session.get(MealTemplate, int(meal_template_id))
    if not mt or mt.user_id != uid:
        return jsonify({"ok": False, "error": "Comida no encontrada."}), 404
    requested_order = data.get("order")
    current_count = len(diet_day.diet_day_meals)
    if requested_order is None:
        order = current_count
    else:
        order = max(0, min(int(requested_order), current_count))
        for existing in diet_day.diet_day_meals:
            if (existing.order or 0) >= order:
                existing.order = (existing.order or 0) + 1
    dm = DietDayMeal(
        diet_day_id=diet_day.id,
        meal_template_id=mt.id,
        order=order,
    )
    db.session.add(dm)
    db.session.flush()
    _normalize_day_orders(diet_day)
    db.session.commit()
    return jsonify(_serialize_day_meal(dm)), 201


@bp.route("/<int:plan_id>/days/<weekday>/meals/<int:day_meal_id>", methods=["PUT"])
def update_day_meal(plan_id, weekday, day_meal_id):
    uid, err = _get_uid()
    if err:
        return err
    plan = db.session.get(DietPlan, plan_id)
    if not plan or plan.user_id != uid:
        return jsonify({"ok": False, "error": "Plan no encontrado."}), 404
    try:
        wd = WeekDay(weekday)
    except ValueError:
        return jsonify({"ok": False, "error": "Día de la semana inválido."}), 400
    day_meal = db.session.get(DietDayMeal, day_meal_id)
    if not day_meal or day_meal.diet_day.diet_plan_id != plan_id or day_meal.diet_day.weekday != wd:
        return jsonify({"ok": False, "error": "Comida del día no encontrada."}), 404
    if day_meal.meal_template.user_id != uid:
        return jsonify({"ok": False, "error": "No autorizado."}), 403
    data = request.get_json() or {}
    if "meal_template_id" in data:
        meal_template = db.session.get(MealTemplate, int(data.get("meal_template_id")))
        if not meal_template or meal_template.user_id != uid:
            return jsonify({"ok": False, "error": "Comida no encontrada."}), 404
        day_meal.meal_template_id = meal_template.id
    if "order" in data:
        diet_day = day_meal.diet_day
        ordered_meals = [item for item in diet_day.diet_day_meals if item.id != day_meal.id]
        requested_order = max(0, min(int(data.get("order")), len(ordered_meals)))
        ordered_meals.insert(requested_order, day_meal)
        for index, item in enumerate(ordered_meals):
            item.order = index
    else:
        _normalize_day_orders(day_meal.diet_day)
    db.session.commit()
    return jsonify(_serialize_day_meal(day_meal))


@bp.route("/<int:plan_id>/days/<weekday>/meals/<int:day_meal_id>", methods=["DELETE"])
def delete_day_meal(plan_id, weekday, day_meal_id):
    uid, err = _get_uid()
    if err:
        return err
    plan = db.session.get(DietPlan, plan_id)
    if not plan or plan.user_id != uid:
        return jsonify({"ok": False, "error": "Plan no encontrado."}), 404
    try:
        wd = WeekDay(weekday)
    except ValueError:
        return jsonify({"ok": False, "error": "Día de la semana inválido."}), 400
    day_meal = db.session.get(DietDayMeal, day_meal_id)
    if not day_meal or day_meal.diet_day.diet_plan_id != plan_id or day_meal.diet_day.weekday != wd:
        return jsonify({"ok": False, "error": "Comida del día no encontrada."}), 404
    if day_meal.meal_template.user_id != uid:
        return jsonify({"ok": False, "error": "No autorizado."}), 403
    diet_day = day_meal.diet_day
    db.session.delete(day_meal)
    db.session.flush()
    _normalize_day_orders(diet_day)
    db.session.commit()
    return jsonify({"ok": True})


@bp.route("/<int:plan_id>/days/<weekday>/reorder", methods=["POST"])
def reorder_day_meals(plan_id, weekday):
    uid, err = _get_uid()
    if err:
        return err
    plan = db.session.get(DietPlan, plan_id)
    if not plan or plan.user_id != uid:
        return jsonify({"ok": False, "error": "Plan no encontrado."}), 404
    try:
        wd = WeekDay(weekday)
    except ValueError:
        return jsonify({"ok": False, "error": "Día de la semana inválido."}), 400
    diet_day = _get_diet_day(plan_id, wd)
    if not diet_day:
        return jsonify({"ok": False, "error": "Día no encontrado."}), 404
    data = request.get_json() or {}
    meal_ids = data.get("meal_ids")
    if not isinstance(meal_ids, list):
        return jsonify({"ok": False, "error": "meal_ids debe ser una lista."}), 400
    current_ids = [day_meal.id for day_meal in diet_day.diet_day_meals]
    if sorted(meal_ids) != sorted(current_ids):
        return jsonify(
            {"ok": False, "error": "meal_ids debe contener exactamente las comidas del día."}
        ), 400
    meal_map = {day_meal.id: day_meal for day_meal in diet_day.diet_day_meals}
    for index, meal_id in enumerate(meal_ids):
        meal_map[meal_id].order = index
    db.session.commit()
    return jsonify(
        {
            "ok": True,
            "day": {
                **diet_day.to_dict(),
                "meals": [_serialize_day_meal(day_meal) for day_meal in diet_day.diet_day_meals],
            },
        }
    )


@bp.route("/<int:plan_id>/days/<weekday>/copy", methods=["POST"])
def copy_day_meals(plan_id, weekday):
    uid, err = _get_uid()
    if err:
        return err
    plan = db.session.get(DietPlan, plan_id)
    if not plan or plan.user_id != uid:
        return jsonify({"ok": False, "error": "Plan no encontrado."}), 404
    try:
        source_weekday = WeekDay(weekday)
    except ValueError:
        return jsonify({"ok": False, "error": "Día origen inválido."}), 400
    data = request.get_json() or {}
    target_weekday_value = data.get("target_weekday")
    if not target_weekday_value:
        return jsonify({"ok": False, "error": "target_weekday es obligatorio."}), 400
    try:
        target_weekday = WeekDay(target_weekday_value)
    except ValueError:
        return jsonify({"ok": False, "error": "Día destino inválido."}), 400
    source_day = _ensure_diet_day(plan_id, source_weekday)
    target_day = _ensure_diet_day(plan_id, target_weekday)
    replace_target = data.get("replace", True)
    if replace_target:
        for existing in list(target_day.diet_day_meals):
            db.session.delete(existing)
        db.session.flush()
    ordered_source_meals = sorted(
        source_day.diet_day_meals,
        key=lambda item: ((item.order if item.order is not None else 0), item.id or 0),
    )
    for index, day_meal in enumerate(ordered_source_meals):
        db.session.add(
            DietDayMeal(
                diet_day_id=target_day.id,
                meal_template_id=day_meal.meal_template_id,
                order=index,
            )
        )
    db.session.flush()
    _normalize_day_orders(target_day)
    db.session.commit()
    return jsonify(
        {
            "ok": True,
            "source_weekday": source_weekday.value,
            "target_weekday": target_weekday.value,
            "day": {
                **target_day.to_dict(),
                "meals": [_serialize_day_meal(day_meal) for day_meal in target_day.diet_day_meals],
            },
        }
    )


@bp.route("/<int:plan_id>/duplicate", methods=["POST"])
def duplicate_diet(plan_id):
    uid, err = _get_uid()
    if err:
        return err
    plan = db.session.get(DietPlan, plan_id)
    if not plan or plan.user_id != uid:
        return jsonify({"ok": False, "error": "Plan no encontrado."}), 404
    new_plan = DietPlan(user_id=uid, name=(plan.name or "") + " (copia)", is_active=False)
    db.session.add(new_plan)
    db.session.flush()
    for d in plan.diet_days:
        new_day = DietDay(diet_plan_id=new_plan.id, weekday=d.weekday)
        db.session.add(new_day)
        db.session.flush()
        for dm in d.diet_day_meals:
            db.session.add(
                DietDayMeal(
                    diet_day_id=new_day.id,
                    meal_template_id=dm.meal_template_id,
                    order=dm.order,
                )
            )
    db.session.commit()
    return jsonify(new_plan.to_dict()), 201
