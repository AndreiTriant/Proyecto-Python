import { useState, useEffect } from "react";
import { API_URL } from "../../constantes";

export default function MealEditor({ meal, userId, onSaved, onCancel }) {
  const isNew = !meal?.id;
  const [name, setName] = useState(meal?.name || "");
  const [mealType, setMealType] = useState(meal?.meal_type || "");
  const [notes, setNotes] = useState(meal?.notes || "");
  const [calories, setCalories] = useState(meal?.calories ?? 0);
  const [protein, setProtein] = useState(meal?.protein ?? 0);
  const [fat, setFat] = useState(meal?.fat ?? 0);
  const [carbs, setCarbs] = useState(meal?.carbs ?? 0);
  const [components, setComponents] = useState(meal?.components || []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (meal) {
      setName(meal.name || "");
      setMealType(meal.meal_type || "");
      setNotes(meal.notes || "");
      setCalories(meal.calories ?? 0);
      setProtein(meal.protein ?? 0);
      setFat(meal.fat ?? 0);
      setCarbs(meal.carbs ?? 0);
      setComponents(meal.components || []);
    }
  }, [meal]);

  const save = (e) => {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    setError("");
    const url = isNew ? `${API_URL}/api/meals` : `${API_URL}/api/meals/${meal.id}`;
    const body = {
      name: name.trim(),
      meal_type: mealType.trim(),
      notes: notes.trim(),
      calories: Number(calories) || 0,
      protein: Number(protein) || 0,
      fat: Number(fat) || 0,
      carbs: Number(carbs) || 0,
    };
    const method = isNew ? "POST" : "PUT";
    fetch(`${url}?user_id=${userId}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          return;
        }
        if (isNew && data.id) onSaved(data.id);
        else onSaved();
      })
      .catch(() => setError("Error de conexión"))
      .finally(() => setSaving(false));
  };

  const recalculateApi = () => {
    if (!meal?.id || !userId) return;
    fetch(`${API_URL}/api/meals/${meal.id}/recalculate-nutrition?user_id=${userId}`, {
      method: "POST",
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.calories != null) setCalories(data.calories);
        if (data.protein != null) setProtein(data.protein);
        if (data.fat != null) setFat(data.fat);
        if (data.carbs != null) setCarbs(data.carbs);
      });
  };

  return (
    <div className="meal-editor card">
      <form onSubmit={save}>
        <label>
          Nombre
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          Tipo (opcional)
          <input
            value={mealType}
            onChange={(e) => setMealType(e.target.value)}
            placeholder="desayuno, comida, cena, snack"
          />
        </label>
        <label>
          Notas
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </label>
        <div className="nutrition-row">
          <label>
            Calorías
            <input
              type="number"
              step="0.1"
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
            />
          </label>
          <label>
            Proteínas (g)
            <input
              type="number"
              step="0.1"
              value={protein}
              onChange={(e) => setProtein(e.target.value)}
            />
          </label>
          <label>
            Grasas (g)
            <input type="number" step="0.1" value={fat} onChange={(e) => setFat(e.target.value)} />
          </label>
          <label>
            Carbohidratos (g)
            <input type="number" step="0.1" value={carbs} onChange={(e) => setCarbs(e.target.value)} />
          </label>
        </div>
        {!isNew && components.length > 0 && (
          <button type="button" className="btn-sm" onClick={recalculateApi}>
            Actualizar nutrición desde componentes
          </button>
        )}
        {error && <p className="error-msg">{error}</p>}
        <div className="form-actions">
          <button type="button" onClick={onCancel}>
            Cancelar
          </button>
          <button type="submit" disabled={saving}>
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </form>
      {!isNew && (
        <section className="components-section">
          <h4>Componentes</h4>
          <ul>
            {components.map((c) => (
              <li key={c.id}>
                {c.name}: {c.quantity} {c.unit} · {c.calories ?? 0} kcal
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
