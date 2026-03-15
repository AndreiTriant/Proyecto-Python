import { useState, useEffect } from "react";
import { API_URL } from "../../constantes";

const WEEKDAYS = [
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
  "domingo",
];

export default function WeeklyDietEditor({ diet, userId, onUpdate }) {
  const [days, setDays] = useState(diet?.days || []);
  const [meals, setMeals] = useState([]);

  useEffect(() => {
    setDays(diet?.days || []);
  }, [diet]);

  useEffect(() => {
    if (!userId) return;
    fetch(`${API_URL}/api/meals?user_id=${userId}`)
      .then((res) => res.json())
      .then((data) => setMeals(Array.isArray(data) ? data : []))
      .catch(() => setMeals([]));
  }, [userId]);

  const addMealToDay = (dayId, mealTemplateId, label) => {
    const day = days.find((d) => d.id === dayId);
    if (!day) return;
    const order = (day.meals || []).length;
    fetch(`${API_URL}/api/diets/${diet.id}/days/${day.weekday}/meals?user_id=${userId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        meal_template_id: mealTemplateId,
        order,
        label: label || "",
      }),
    })
      .then((res) => res.json())
      .then(() => onUpdate && onUpdate())
      .catch(() => {});
  };

  if (!diet?.id) return null;

  return (
    <div className="weekly-diet-editor">
      <div className="diet-days-grid">
        {(days.length ? days : WEEKDAYS.map((w) => ({ id: null, weekday: w, meals: [] }))).map(
          (d) => (
            <div key={d.id || d.weekday} className="diet-day-column">
              <h3>{d.weekday ? d.weekday.charAt(0).toUpperCase() + d.weekday.slice(1) : ""}</h3>
              <ul className="day-meals">
                {(d.meals || []).map((m) => (
                  <li key={m.id}>
                    {m.meal_template?.name || "Comida"} {m.label ? `(${m.label})` : ""}
                  </li>
                ))}
              </ul>
              <select
                className="add-meal-select"
                defaultValue=""
                onChange={(e) => {
                  const v = e.target.value;
                  if (v && d.id) {
                    addMealToDay(d.id, parseInt(v, 10), "");
                    e.target.value = "";
                  }
                }}
              >
                <option value="">Añadir comida</option>
                {meals.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          )
        )}
      </div>
    </div>
  );
}
