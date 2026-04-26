from datetime import date as date_type

from flask import Blueprint, jsonify, request

from extensions import db
from models import DietDayStatusEntry, MealLogEntry, CheckinStatus, WeekDay
from utils import get_user_id_from_request

bp = Blueprint("tracking", __name__, url_prefix="/api")


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


def _float_field(raw, default=0.0):
    if raw is None or raw == "":
        return default
    try:
        return float(raw)
    except (TypeError, ValueError):
        return default


def _meal_logs_for_day(uid, dt):
    return db.session.execute(
        db.select(MealLogEntry)
        .where(MealLogEntry.user_id == uid, MealLogEntry.date == dt)
        .order_by(MealLogEntry.meal_order, MealLogEntry.id)
    ).scalars().all()


def _replace_meal_logs_for_day(uid, dt, payload):
    for row in db.session.execute(
        db.select(MealLogEntry).where(
            MealLogEntry.user_id == uid,
            MealLogEntry.date == dt,
        )
    ).scalars().all():
        db.session.delete(row)
    order = 0
    for log in payload or []:
        name = (log.get("name") or "").strip()
        if not name:
            continue
        qty = _float_field(log.get("quantity"), default=1.0)
        if qty <= 0:
            qty = 1.0
        unit = (log.get("unit") or "porción").strip()[:10] or "porción"
        cal = _float_field(log.get("calories"))
        if cal == 0.0:
            cal = _float_field(log.get("calories_approx"))
        tid = log.get("meal_template_id")
        if tid is not None and tid != "":
            try:
                tid = int(tid)
            except (TypeError, ValueError):
                tid = None
        else:
            tid = None
        mo = log.get("meal_order")
        try:
            meal_order = int(mo) if mo is not None and mo != "" else order
        except (TypeError, ValueError):
            meal_order = order
        db.session.add(
            MealLogEntry(
                user_id=uid,
                date=dt,
                name=name,
                quantity=qty,
                unit=unit,
                calories=cal,
                protein=_float_field(log.get("protein")),
                fat=_float_field(log.get("fat")),
                carbs=_float_field(log.get("carbs")),
                meal_template_id=tid,
                meal_order=meal_order,
                notes=(log.get("notes") or "").strip()[:500],
            )
        )
        order += 1


@bp.route("/checkins")
def list_checkins():
    uid, err = _get_uid()
    if err:
        return err
    from_str = request.args.get("from")
    to_str = request.args.get("to")
    from_d = _parse_date(from_str)
    to_d = _parse_date(to_str)
    stmt = db.select(DietDayStatusEntry).where(DietDayStatusEntry.user_id == uid)
    if from_d:
        stmt = stmt.where(DietDayStatusEntry.date >= from_d)
    if to_d:
        stmt = stmt.where(DietDayStatusEntry.date <= to_d)
    checkins = db.session.execute(stmt).scalars().all()
    out = []
    for c in checkins:
        d = c.to_dict()
        d["meal_logs"] = [m.to_dict() for m in _meal_logs_for_day(uid, c.date)]
        out.append(d)
    return jsonify(out)


@bp.route("/checkins", methods=["POST"])
def create_checkin():
    uid, err = _get_uid()
    if err:
        return err
    data = request.get_json() or {}
    date_s = data.get("date")
    dt = _parse_date(date_s)
    if not dt:
        return jsonify({"ok": False, "error": "date (YYYY-MM-DD) es obligatorio."}), 400
    status_s = (data.get("status") or "").strip()
    try:
        status = CheckinStatus(status_s)
    except ValueError:
        return jsonify({"ok": False, "error": "status inválido."}), 400
    existing = db.session.execute(
        db.select(DietDayStatusEntry).where(
            DietDayStatusEntry.user_id == uid,
            DietDayStatusEntry.date == dt,
        )
    ).scalar_one_or_none()
    if existing:
        existing.status = status
        existing.diet_plan_id = data.get("diet_plan_id") or None
        wdu = data.get("weekday_used")
        existing.weekday_used = WeekDay(wdu) if wdu else None
        existing.notes = (data.get("notes") or "").strip()
        _replace_meal_logs_for_day(uid, dt, data.get("meal_logs"))
        db.session.commit()
        out = existing.to_dict()
        out["meal_logs"] = [m.to_dict() for m in _meal_logs_for_day(uid, dt)]
        return jsonify(out)
    entry = DietDayStatusEntry(
        user_id=uid,
        date=dt,
        status=status,
        diet_plan_id=data.get("diet_plan_id") or None,
        weekday_used=WeekDay(data["weekday_used"]) if data.get("weekday_used") else None,
        notes=(data.get("notes") or "").strip(),
    )
    db.session.add(entry)
    db.session.flush()
    _replace_meal_logs_for_day(uid, dt, data.get("meal_logs"))
    db.session.commit()
    out = entry.to_dict()
    out["meal_logs"] = [m.to_dict() for m in _meal_logs_for_day(uid, dt)]
    return jsonify(out), 201


@bp.route("/checkins/<date_str>")
def get_checkin(date_str):
    uid, err = _get_uid()
    if err:
        return err
    dt = _parse_date(date_str)
    if not dt:
        return jsonify({"ok": False, "error": "Fecha inválida."}), 400
    c = db.session.execute(
        db.select(DietDayStatusEntry).where(
            DietDayStatusEntry.user_id == uid,
            DietDayStatusEntry.date == dt,
        )
    ).scalar_one_or_none()
    if not c:
        return jsonify({"ok": False, "error": "No hay registro para esa fecha."}), 404
    out = c.to_dict()
    out["meal_logs"] = [m.to_dict() for m in _meal_logs_for_day(uid, dt)]
    return jsonify(out)


@bp.route("/checkins/<date_str>", methods=["PUT"])
def update_checkin(date_str):
    uid, err = _get_uid()
    if err:
        return err
    dt = _parse_date(date_str)
    if not dt:
        return jsonify({"ok": False, "error": "Fecha inválida."}), 400
    data = request.get_json() or {}
    status_s = (data.get("status") or "").strip()
    try:
        status = CheckinStatus(status_s)
    except ValueError:
        return jsonify({"ok": False, "error": "status inválido."}), 400
    c = db.session.execute(
        db.select(DietDayStatusEntry).where(
            DietDayStatusEntry.user_id == uid,
            DietDayStatusEntry.date == dt,
        )
    ).scalar_one_or_none()
    if not c:
        return jsonify({"ok": False, "error": "No hay registro para esa fecha."}), 404
    c.status = status
    c.diet_plan_id = data.get("diet_plan_id") or None
    wdu = data.get("weekday_used")
    c.weekday_used = WeekDay(wdu) if wdu else None
    c.notes = (data.get("notes") or "").strip()
    _replace_meal_logs_for_day(uid, dt, data.get("meal_logs"))
    db.session.commit()
    out = c.to_dict()
    out["meal_logs"] = [m.to_dict() for m in _meal_logs_for_day(uid, dt)]
    return jsonify(out)
