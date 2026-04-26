import json

from flask import Blueprint, jsonify, request

from config import AI_PROVIDER, LM_STUDIO_BASE_URL, LM_STUDIO_MODEL
from utils import require_user_id

bp = Blueprint("ai", __name__, url_prefix="/api/ai")


def _float_or_none(value):
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _coerce_macros(obj):
    def num(key):
        try:
            return float(obj.get(key) or 0)
        except (TypeError, ValueError):
            return 0.0

    return {
        "calories": max(0.0, num("calories")),
        "protein": max(0.0, num("protein")),
        "fat": max(0.0, num("fat")),
        "carbs": max(0.0, num("carbs")),
    }


def _extract_first_json_object(text):
    """
    Extrae el primer objeto JSON {...} de un texto (por ejemplo si viene envuelto en ```json).
    """
    if not text:
        raise json.JSONDecodeError("Empty", "", 0)
    s = str(text).strip()
    start = s.find("{")
    if start < 0:
        raise json.JSONDecodeError("No JSON object start", s, 0)
    depth = 0
    in_str = False
    escape = False
    for i in range(start, len(s)):
        ch = s[i]
        if in_str:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == '"':
                in_str = False
        else:
            if ch == '"':
                in_str = True
            elif ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    return s[start : i + 1]
    raise json.JSONDecodeError("Unterminated JSON object", s, start)


def _lmstudio_estimate_meal_nutrition(*, meal_name, quantity=None, unit=None):
    """
    Llama a LM Studio usando su endpoint /api/v1/chat (schema: { model, input }).
    Devuelve dict con calories/protein/fat/carbs.
    """
    import httpx

    if not LM_STUDIO_MODEL:
        raise ValueError("Falta LM_STUDIO_MODEL en el entorno.")

    qty_text = ""
    if quantity is not None and unit:
        qty_text = f"\nCantidad declarada: {quantity:g} {unit}."
    elif quantity is not None:
        qty_text = f"\nCantidad declarada: {quantity:g}."

    system = (
        "Eres un nutricionista. Devuelve SOLO un JSON válido (sin markdown) "
        "con estimación aproximada de macros para el plato indicado."
    )
    user = (
        f"Plato: {meal_name.strip()}."
        f"{qty_text}\n\n"
        "Devuelve exactamente este JSON:\n"
        "{\n"
        '  "calories": number,\n'
        '  "protein": number,\n'
        '  "fat": number,\n'
        '  "carbs": number,\n'
        '  "assumptions": string\n'
        "}\n\n"
        "Reglas:\n"
        "- Usa kcal y gramos.\n"
        "- Si faltan detalles, asume una ración estándar.\n"
        "- No inventes ingredientes raros; sé conservador.\n"
    )

    base = (LM_STUDIO_BASE_URL or "").rstrip("/")
    url = f"{base}/chat"
    prompt = f"{system}\n\n{user}"
    payload = {"model": LM_STUDIO_MODEL, "input": prompt}

    with httpx.Client(timeout=60.0) as client:
        resp = client.post(url, json=payload)
        resp.raise_for_status()
        raw = resp.json()

    # LM Studio devuelve { output: [ { type: "message", content: "..." }, ... ] }
    content = None
    if isinstance(raw, dict):
        out = raw.get("output")
        if isinstance(out, list) and out:
            first = out[0] if isinstance(out[0], dict) else None
            content = first.get("content") if first else None
    if not content:
        raise ValueError("Respuesta inesperada del servidor de LM Studio.")

    content = str(content).strip()
    json_text = _extract_first_json_object(content)
    data = json.loads(json_text)
    return _coerce_macros(data), (data.get("assumptions") or "").strip()


@bp.route("/estimate-meal-nutrition", methods=["POST"])
def estimate_meal_nutrition():
    _uid, err = require_user_id()
    if err:
        return err

    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"ok": False, "error": "El nombre de la comida es obligatorio."}), 400

    quantity = _float_or_none(data.get("quantity"))
    unit = (data.get("unit") or "").strip()[:10] or None

    provider = AI_PROVIDER
    if provider != "lmstudio":
        return (
            jsonify(
                {
                    "ok": False,
                    "error": f'AI_PROVIDER "{provider}" no está soportado en este endpoint todavía.',
                }
            ),
            400,
        )

    try:
        macros, assumptions = _lmstudio_estimate_meal_nutrition(
            meal_name=name, quantity=quantity, unit=unit
        )
    except json.JSONDecodeError:
        return (
            jsonify(
                {
                    "ok": False,
                    "error": "La IA devolvió un formato inválido. Prueba de nuevo o cambia de modelo.",
                }
            ),
            502,
        )
    except Exception as exc:
        return jsonify({"ok": False, "error": str(exc)}), 502

    return jsonify(
        {
            "ok": True,
            "nutrition": {
                **macros,
                "assumptions": assumptions,
                "provider": "lmstudio",
                "model": LM_STUDIO_MODEL,
            },
        }
    )

