import { useState } from "react";
import { API_URL } from "../../constantes";

const STATUSES = [
  { value: "followed_exact", label: "Dieta seguida correctamente" },
  { value: "followed_other_day", label: "Seguí la dieta pero con comidas de otro día" },
  { value: "not_followed", label: "No seguí la dieta" },
];

export default function DayCheckinModal({ date, userId, onClose, onSaved }) {
  const [status, setStatus] = useState("followed_exact");
  const [weekdayUsed, setWeekdayUsed] = useState("");
  const [meals, setMeals] = useState([{ name: "", calories_approx: "" }]);
  const [saving, setSaving] = useState(false);

  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

  const addMeal = () => {
    setMeals((prev) => [...prev, { name: "", calories_approx: "" }]);
  };

  const updateMeal = (i, field, value) => {
    setMeals((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    const body = {
      date: dateStr,
      status,
      diet_plan_id: null,
      weekday_used: weekdayUsed || null,
      meal_logs:
        status === "not_followed"
          ? meals
              .filter((m) => m.name.trim())
              .map((m) => ({
                name: m.name.trim(),
                calories_approx: m.calories_approx ? parseFloat(m.calories_approx) : null,
              }))
          : [],
    };
    fetch(`${API_URL}/api/checkins?user_id=${userId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.ok !== false) onSaved();
        else alert(data.error || "Error al guardar");
      })
      .catch(() => alert("Error de conexión"))
      .finally(() => setSaving(false));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>Registrar día · {dateStr}</h3>
        <form onSubmit={handleSubmit}>
          <div>
            <label>Estado</label>
            {STATUSES.map((s) => (
              <label key={s.value}>
                <input
                  type="radio"
                  name="status"
                  value={s.value}
                  checked={status === s.value}
                  onChange={() => setStatus(s.value)}
                />
                {s.label}
              </label>
            ))}
          </div>
          {status === "followed_other_day" && (
            <div>
              <label>Día de la dieta usado</label>
              <select
                value={weekdayUsed}
                onChange={(e) => setWeekdayUsed(e.target.value)}
              >
                <option value="">—</option>
                <option value="lunes">Lunes</option>
                <option value="martes">Martes</option>
                <option value="miercoles">Miércoles</option>
                <option value="jueves">Jueves</option>
                <option value="viernes">Viernes</option>
                <option value="sabado">Sábado</option>
                <option value="domingo">Domingo</option>
              </select>
            </div>
          )}
          {status === "not_followed" && (
            <div>
              <label>Comidas consumidas (aproximado)</label>
              {meals.map((m, i) => (
                <div key={i} className="meal-log-row">
                  <input
                    placeholder="Nombre"
                    value={m.name}
                    onChange={(e) => updateMeal(i, "name", e.target.value)}
                  />
                  <input
                    type="number"
                    placeholder="Calorías"
                    value={m.calories_approx}
                    onChange={(e) => updateMeal(i, "calories_approx", e.target.value)}
                  />
                </div>
              ))}
              <button type="button" onClick={addMeal}>
                Añadir comida
              </button>
            </div>
          )}
          <div className="modal-actions">
            <button type="button" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" disabled={saving}>
              {saving ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
