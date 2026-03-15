from datetime import date as date_type, datetime

from flask import Blueprint, jsonify, request

from extensions import db
from models import DailyCheckin, DailyCheckinMealLog, CheckinStatus, WeekDay
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


@bp.route("/checkins")
def list_checkins():
    uid, err = _get_uid()
    if err:
        return err
    from_str = request.args.get("from")
    to_str = request.args.get("to")
    from_d = _parse_date(from_str)
    to_d = _parse_date(to_str)
    stmt = db.select(DailyCheckin).where(DailyCheckin.user_id == uid)
    if from_d:
        stmt = stmt.where(DailyCheckin.date >= from_d)
    if to_d:
        stmt = stmt.where(DailyCheckin.date <= to_d)
    checkins = db.session.execute(stmt).scalars().all()
    out = []
    for c in checkins:
        d = c.to_dict()
        d["meal_logs"] = [m.to_dict() for m in c.meal_logs]
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
        db.select(DailyCheckin).where(
            DailyCheckin.user_id == uid,
            DailyCheckin.date == dt,
        )
    ).scalar_one_or_none()
    if existing:
        existing.status = status
        existing.diet_plan_id = data.get("diet_plan_id") or None
        wdu = data.get("weekday_used")
        existing.weekday_used = WeekDay(wdu) if wdu else None
        existing.notes = (data.get("notes") or "").strip()
        for log in existing.meal_logs:
            db.session.delete(log)
        for log in (data.get("meal_logs") or []):
            name = (log.get("name") or "").strip()
            if name:
                db.session.add(
                    DailyCheckinMealLog(
                        daily_checkin_id=existing.id,
                        name=name,
                        calories_approx=log.get("calories_approx"),
                    )
                )
        db.session.commit()
        out = existing.to_dict()
        out["meal_logs"] = [m.to_dict() for m in existing.meal_logs]
        return jsonify(out)
    checkin = DailyCheckin(
        user_id=uid,
        date=dt,
        status=status,
        diet_plan_id=data.get("diet_plan_id") or None,
        weekday_used=WeekDay(data["weekday_used"]) if data.get("weekday_used") else None,
        notes=(data.get("notes") or "").strip(),
    )
    db.session.add(checkin)
    db.session.flush()
    for log in (data.get("meal_logs") or []):
        name = (log.get("name") or "").strip()
        if name:
            db.session.add(
                DailyCheckinMealLog(
                    daily_checkin_id=checkin.id,
                    name=name,
                    calories_approx=log.get("calories_approx"),
                )
            )
    db.session.commit()
    out = checkin.to_dict()
    out["meal_logs"] = [m.to_dict() for m in checkin.meal_logs]
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
        db.select(DailyCheckin).where(
            DailyCheckin.user_id == uid,
            DailyCheckin.date == dt,
        )
    ).scalar_one_or_none()
    if not c:
        return jsonify({"ok": False, "error": "No hay registro para esa fecha."}), 404
    out = c.to_dict()
    out["meal_logs"] = [m.to_dict() for m in c.meal_logs]
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
        db.select(DailyCheckin).where(
            DailyCheckin.user_id == uid,
            DailyCheckin.date == dt,
        )
    ).scalar_one_or_none()
    if not c:
        return jsonify({"ok": False, "error": "No hay registro para esa fecha."}), 404
    c.status = status
    c.diet_plan_id = data.get("diet_plan_id") or None
    wdu = data.get("weekday_used")
    c.weekday_used = WeekDay(wdu) if wdu else None
    c.notes = (data.get("notes") or "").strip()
    for log in c.meal_logs:
        db.session.delete(log)
    for log in (data.get("meal_logs") or []):
        name = (log.get("name") or "").strip()
        if name:
            db.session.add(
                DailyCheckinMealLog(
                    daily_checkin_id=c.id,
                    name=name,
                    calories_approx=log.get("calories_approx"),
                )
            )
    db.session.commit()
    out = c.to_dict()
    out["meal_logs"] = [m.to_dict() for m in c.meal_logs]
    return jsonify(out)
