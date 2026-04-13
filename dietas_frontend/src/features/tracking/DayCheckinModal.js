import { useState } from "react";
import { API_URL } from "../../constantes";
import { apiFetch } from "../../services/api";

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

  const dateTitle = date.toLocaleDateString("es", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

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
    apiFetch(`${API_URL}/api/checkins?user_id=${userId}`, {
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
      <div
        className="modal-content modal-checkin-shell"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkin-modal-title"
      >
        <form onSubmit={handleSubmit}>
          <header className="meal-modal-header">
            <div>
              <span className="meal-modal-subtitle">REGISTRO DEL DÍA</span>
              <h2 id="checkin-modal-title">{dateTitle}</h2>
            </div>
            <button type="button" className="meal-modal-close" aria-label="Cerrar" onClick={onClose}>
              ✕
            </button>
          </header>

          <div className="meal-modal-body">
            <section className="checkin-modal-section">
              <div className="meal-section-title">
                <span aria-hidden>📋</span>
                <span>ESTADO</span>
              </div>
              <div className="checkin-radio-list">
                {STATUSES.map((s) => (
                  <label key={s.value} className="checkin-radio-row">
                    <input
                      type="radio"
                      name="status"
                      value={s.value}
                      checked={status === s.value}
                      onChange={() => setStatus(s.value)}
                    />
                    <span>{s.label}</span>
                  </label>
                ))}
              </div>
            </section>

            {status === "followed_other_day" && (
              <section className="checkin-modal-section">
                <div className="meal-form-group">
                  <label htmlFor="checkin-weekday-used">Día de la dieta usado</label>
                  <select
                    id="checkin-weekday-used"
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
              </section>
            )}

            {status === "not_followed" && (
              <section className="checkin-modal-section checkin-meals-block">
                <div className="meal-section-title">
                  <span aria-hidden>🍽️</span>
                  <span>COMIDAS (APROX.)</span>
                </div>
                <p className="text-muted checkin-help-text">
                  Opcional: anota qué comiste y una estimación de calorías.
                </p>
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
                <button type="button" className="meal-btn-text-primary btn-add-meal" onClick={addMeal}>
                  + Añadir comida
                </button>
              </section>
            )}
          </div>

          <footer className="meal-modal-footer">
            <div className="meal-footer-actions">
              <button type="button" className="meal-btn-cancel" onClick={onClose}>
                Cancelar
              </button>
              <button type="submit" className="meal-btn-submit" disabled={saving}>
                {saving ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  );
}
