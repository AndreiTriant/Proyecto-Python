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
    out = plan.to_dict()
    out["days"] = []
    for d in sorted(plan.diet_days, key=lambda x: list(WeekDay).index(x.weekday)):
        day_dict = d.to_dict()
        day_dict["meals"] = [
            {
                **dm.to_dict(),
                "meal_template": dm.meal_template.to_dict() if dm.meal_template else None,
            }
            for dm in d.diet_day_meals
        ]
        out["days"].append(day_dict)
    return jsonify(out)


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
    diet_day = db.session.execute(
        db.select(DietDay).where(
            DietDay.diet_plan_id == plan_id,
            DietDay.weekday == wd,
        )
    ).scalar_one_or_none()
    if not diet_day:
        diet_day = DietDay(diet_plan_id=plan_id, weekday=wd)
        db.session.add(diet_day)
        db.session.flush()
    data = request.get_json() or {}
    meal_template_id = data.get("meal_template_id")
    if not meal_template_id:
        return jsonify({"ok": False, "error": "meal_template_id es obligatorio."}), 400
    mt = db.session.get(MealTemplate, int(meal_template_id))
    if not mt or mt.user_id != uid:
        return jsonify({"ok": False, "error": "Comida no encontrada."}), 404
    order = data.get("order", len(diet_day.diet_day_meals))
    label = (data.get("label") or "").strip()
    dm = DietDayMeal(
        diet_day_id=diet_day.id,
        meal_template_id=mt.id,
        order=order,
        label=label,
    )
    db.session.add(dm)
    db.session.commit()
    return jsonify(dm.to_dict()), 201


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
                    label=dm.label or "",
                )
            )
    db.session.commit()
    return jsonify(new_plan.to_dict()), 201
