import { useState, useEffect } from "react";
import { API_URL } from "../../constantes";
import { apiFetch } from "../../services/api";

const STATUSES = [
  { value: "followed_exact", label: "Dieta seguida correctamente" },
  { value: "followed_other_day", label: "Seguí la dieta pero con comidas de otro día" },
  { value: "not_followed", label: "No seguí la dieta" },
];

const emptyMeal = () => ({
  name: "",
  calories: "",
  protein: "",
  fat: "",
  carbs: "",
  notes: "",
});

export default function DayCheckinModal({ date, userId, onClose, onSaved }) {
  const [status, setStatus] = useState("followed_exact");
  const [weekdayUsed, setWeekdayUsed] = useState("");
  const [meals, setMeals] = useState([emptyMeal()]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

  const dateTitle = date.toLocaleDateString("es", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    apiFetch(`${API_URL}/api/checkins/${dateStr}?user_id=${userId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.ok === false) {
          setStatus("followed_exact");
          setWeekdayUsed("");
          setMeals([emptyMeal()]);
          return;
        }
        setStatus(data.status || "followed_exact");
        setWeekdayUsed(data.weekday_used || "");
        const logs = data.meal_logs || [];
        if (logs.length) {
          setMeals(
            logs.map((m) => ({
              name: m.name || "",
              calories: m.calories != null ? String(m.calories) : "",
              protein: m.protein != null ? String(m.protein) : "",
              fat: m.fat != null ? String(m.fat) : "",
              carbs: m.carbs != null ? String(m.carbs) : "",
              notes: m.notes || "",
            }))
          );
        } else {
          setMeals([emptyMeal()]);
        }
      })
      .catch(() => {
        setMeals([emptyMeal()]);
      })
      .finally(() => setLoading(false));
  }, [dateStr, userId]);

  const addMeal = () => {
    setMeals((prev) => [...prev, emptyMeal()]);
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
              .map((m, idx) => ({
                name: m.name.trim(),
                calories: m.calories !== "" ? parseFloat(m.calories) : 0,
                protein: m.protein !== "" ? parseFloat(m.protein) : 0,
                fat: m.fat !== "" ? parseFloat(m.fat) : 0,
                carbs: m.carbs !== "" ? parseFloat(m.carbs) : 0,
                notes: (m.notes || "").trim(),
                meal_order: idx,
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
            {loading ? (
              <p className="text-muted">Cargando…</p>
            ) : (
              <>
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
                      <span>COMIDAS REGISTRADAS</span>
                    </div>
                    <p className="text-muted checkin-help-text">
                      Nombre y macros (kcal, proteína, grasa, carbos); notas opcionales.
                    </p>
                    {meals.map((m, i) => (
                      <div key={i} className="meal-log-row">
                        <input
                          placeholder="Nombre"
                          value={m.name}
                          onChange={(e) => updateMeal(i, "name", e.target.value)}
                        />
                        <div className="meal-log-row-macros">
                          <input
                            type="number"
                            step="any"
                            placeholder="kcal"
                            value={m.calories}
                            onChange={(e) => updateMeal(i, "calories", e.target.value)}
                          />
                          <input
                            type="number"
                            step="any"
                            placeholder="P (g)"
                            value={m.protein}
                            onChange={(e) => updateMeal(i, "protein", e.target.value)}
                          />
                          <input
                            type="number"
                            step="any"
                            placeholder="G (g)"
                            value={m.fat}
                            onChange={(e) => updateMeal(i, "fat", e.target.value)}
                          />
                          <input
                            type="number"
                            step="any"
                            placeholder="HC (g)"
                            value={m.carbs}
                            onChange={(e) => updateMeal(i, "carbs", e.target.value)}
                          />
                        </div>
                        <input
                          placeholder="Notas (opcional)"
                          value={m.notes}
                          onChange={(e) => updateMeal(i, "notes", e.target.value)}
                        />
                      </div>
                    ))}
                    <button type="button" className="meal-btn-text-primary btn-add-meal" onClick={addMeal}>
                      + Añadir comida
                    </button>
                  </section>
                )}
              </>
            )}
          </div>

          <footer className="meal-modal-footer">
            <div className="meal-footer-actions">
              <button type="button" className="meal-btn-cancel" onClick={onClose}>
                Cancelar
              </button>
              <button type="submit" className="meal-btn-submit" disabled={saving || loading}>
                {saving ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  );
}
