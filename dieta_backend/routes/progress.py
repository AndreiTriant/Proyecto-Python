from datetime import date as date_type, timedelta

from flask import Blueprint, jsonify, request

from extensions import db
from models import WeightEntry, DietDayStatusEntry, DietPlan
from utils import get_user_id_from_request

bp = Blueprint("progress", __name__, url_prefix="/api")


def _get_uid():
    uid = get_user_id_from_request()
    if uid is None:
        return None, (jsonify({"ok": False, "error": "user_id es obligatorio."}), 400)
    return uid, None


def _parse_date(s):
    if not s:
        return None
    try:
        y, m, d = map(int, str(s).strip().split("-"))
        return date_type(y, m, d)
    except (ValueError, TypeError):
        return None


@bp.route("/weights")
def list_weights():
    uid, err = _get_uid()
    if err:
        return err
    from_str = request.args.get("from")
    to_str = request.args.get("to")
    from_d = _parse_date(from_str)
    to_d = _parse_date(to_str)
    stmt = db.select(WeightEntry).where(WeightEntry.user_id == uid)
    if from_d:
        stmt = stmt.where(WeightEntry.date >= from_d)
    if to_d:
        stmt = stmt.where(WeightEntry.date <= to_d)
    stmt = stmt.order_by(WeightEntry.date.desc())
    entries = db.session.execute(stmt).scalars().all()
    return jsonify([e.to_dict() for e in entries])


@bp.route("/weights", methods=["POST"])
def create_weight():
    uid, err = _get_uid()
    if err:
        return err
    data = request.get_json() or {}
    date_s = data.get("date")
    dt = _parse_date(date_s)
    if not dt:
        return jsonify({"ok": False, "error": "date (YYYY-MM-DD) es obligatorio."}), 400
    try:
        weight_kg = float(data.get("weight_kg"))
    except (TypeError, ValueError):
        return jsonify({"ok": False, "error": "weight_kg es obligatorio y debe ser un número."}), 400
    note = (data.get("note") or "").strip()
    entry = WeightEntry(user_id=uid, date=dt, weight_kg=weight_kg, note=note or None)
    db.session.add(entry)
    db.session.commit()
    return jsonify(entry.to_dict()), 201


@bp.route("/weights/<int:entry_id>", methods=["PUT"])
def update_weight(entry_id):
    uid, err = _get_uid()
    if err:
        return err
    entry = db.session.get(WeightEntry, entry_id)
    if not entry or entry.user_id != uid:
        return jsonify({"ok": False, "error": "Registro no encontrado."}), 404
    data = request.get_json() or {}
    if "weight_kg" in data:
        entry.weight_kg = float(data["weight_kg"])
    if "note" in data:
        entry.note = (data.get("note") or "").strip() or None
    db.session.commit()
    return jsonify(entry.to_dict())


@bp.route("/weights/<int:entry_id>", methods=["DELETE"])
def delete_weight(entry_id):
    uid, err = _get_uid()
    if err:
        return err
    entry = db.session.get(WeightEntry, entry_id)
    if not entry or entry.user_id != uid:
        return jsonify({"ok": False, "error": "Registro no encontrado."}), 404
    db.session.delete(entry)
    db.session.commit()
    return jsonify({"ok": True}), 200


@bp.route("/progress/overview")
def progress_overview():
    uid, err = _get_uid()
    if err:
        return err
    from_str = request.args.get("from")
    to_str = request.args.get("to")
    from_d = _parse_date(from_str)
    to_d = _parse_date(to_str)
    if not from_d:
        to_d = to_d or date_type.today()
        from_d = to_d - timedelta(days=30)
    if not to_d:
        to_d = date_type.today()
    checkins = db.session.execute(
        db.select(DietDayStatusEntry).where(
            DietDayStatusEntry.user_id == uid,
            DietDayStatusEntry.date >= from_d,
            DietDayStatusEntry.date <= to_d,
        )
    ).scalars().all()
    weights = db.session.execute(
        db.select(WeightEntry).where(
            WeightEntry.user_id == uid,
            WeightEntry.date >= from_d,
            WeightEntry.date <= to_d,
        ).order_by(WeightEntry.date.asc())
    ).scalars().all()
    return jsonify({
        "checkins": [c.to_dict() for c in checkins],
        "weights": [w.to_dict() for w in weights],
        "days": [],
    })


@bp.route("/dashboard")
def dashboard():
    uid, err = _get_uid()
    if err:
        return err
    month = request.args.get("month")
    if month:
        try:
            y, m = map(int, month.split("-"))
            from_d = date_type(y, m, 1)
            if m == 12:
                to_d = date_type(y, 12, 31)
            else:
                to_d = date_type(y, m + 1, 1) - timedelta(days=1)
        except (ValueError, TypeError):
            from_d = date_type.today().replace(day=1)
            to_d = date_type.today()
    else:
        from_d = date_type.today().replace(day=1)
        to_d = date_type.today()
    active_diet = db.session.execute(
        db.select(DietPlan).where(
            DietPlan.user_id == uid,
            DietPlan.is_active == True,
        )
    ).scalar_one_or_none()
    checkins = db.session.execute(
        db.select(DietDayStatusEntry).where(
            DietDayStatusEntry.user_id == uid,
            DietDayStatusEntry.date >= from_d,
            DietDayStatusEntry.date <= to_d,
        )
    ).scalars().all()
    weights = db.session.execute(
        db.select(WeightEntry).where(
            WeightEntry.user_id == uid,
            WeightEntry.date >= from_d,
            WeightEntry.date <= to_d,
        )
    ).scalars().all()
    return jsonify({
        "active_diet": active_diet.to_dict() if active_diet else None,
        "checkins": [c.to_dict() for c in checkins],
        "weights": [w.to_dict() for w in weights],
    })
