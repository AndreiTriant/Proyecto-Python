import { useEffect, useMemo, useState } from "react";
import { API_URL } from "../../constantes";
import "./meal-editor.css";

const EMPTY_COMPONENT = {
  name: "",
  quantity: "100",
  unit: "g",
  calories: "0",
  protein: "0",
  fat: "0",
  carbs: "0",
};

function toNumericValue(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function createDraftComponent(component = {}) {
  return {
    id: component.id || null,
    tempId: component.id ? `existing-${component.id}` : `draft-${Date.now()}-${Math.random()}`,
    name: component.name || "",
    quantity: String(component.quantity ?? 0),
    unit: component.unit || "g",
    calories: String(component.calories ?? 0),
    protein: String(component.protein ?? 0),
    fat: String(component.fat ?? 0),
    carbs: String(component.carbs ?? 0),
  };
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok || data?.error) {
    throw new Error(data?.error || "No se pudo completar la petición.");
  }
  return data;
}

export default function MealEditor({
  meal,
  userId,
  onSaved,
  onCancel,
  saveButtonLabel = "Guardar",
  compact = false,
}) {
  const isNew = !meal?.id;
  const [name, setName] = useState(meal?.name || "");
  const [mealType, setMealType] = useState(meal?.meal_type || "");
  const [notes, setNotes] = useState(meal?.notes || "");
  const [calories, setCalories] = useState(String(meal?.calories ?? 0));
  const [protein, setProtein] = useState(String(meal?.protein ?? 0));
  const [fat, setFat] = useState(String(meal?.fat ?? 0));
  const [carbs, setCarbs] = useState(String(meal?.carbs ?? 0));
  const [components, setComponents] = useState((meal?.components || []).map(createDraftComponent));
  const [removedComponentIds, setRemovedComponentIds] = useState([]);
  const [componentDraft, setComponentDraft] = useState({ ...EMPTY_COMPONENT });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    setName(meal?.name || "");
    setMealType(meal?.meal_type || "");
    setNotes(meal?.notes || "");
    setCalories(String(meal?.calories ?? 0));
    setProtein(String(meal?.protein ?? 0));
    setFat(String(meal?.fat ?? 0));
    setCarbs(String(meal?.carbs ?? 0));
    setComponents((meal?.components || []).map(createDraftComponent));
    setRemovedComponentIds([]);
    setComponentDraft({ ...EMPTY_COMPONENT });
    setError("");
    setSuccess("");
  }, [meal]);

  const componentTotals = useMemo(
    () =>
      components.reduce(
        (totals, component) => ({
          calories: totals.calories + toNumericValue(component.calories),
          protein: totals.protein + toNumericValue(component.protein),
          fat: totals.fat + toNumericValue(component.fat),
          carbs: totals.carbs + toNumericValue(component.carbs),
        }),
        { calories: 0, protein: 0, fat: 0, carbs: 0 }
      ),
    [components]
  );

  const updateComponentDraftField = (field, value) => {
    setComponentDraft((prev) => ({ ...prev, [field]: value }));
  };

  const resetDraft = () => {
    setComponentDraft({ ...EMPTY_COMPONENT });
  };

  const addComponentDraft = () => {
    if (!componentDraft.name.trim()) {
      setError("El nombre del alimento es obligatorio.");
      return;
    }
    setComponents((prev) => [...prev, createDraftComponent(componentDraft)]);
    setError("");
    setSuccess("");
    resetDraft();
  };

  const updateComponent = (tempId, field, value) => {
    setComponents((prev) =>
      prev.map((component) =>
        component.tempId === tempId ? { ...component, [field]: value } : component
      )
    );
  };

  const removeComponent = (tempId) => {
    setComponents((prev) => {
      const componentToDelete = prev.find((component) => component.tempId === tempId);
      if (componentToDelete?.id) {
        setRemovedComponentIds((ids) => [...ids, componentToDelete.id]);
      }
      return prev.filter((component) => component.tempId !== tempId);
    });
  };

  const applyComponentTotals = () => {
    setCalories(String(componentTotals.calories));
    setProtein(String(componentTotals.protein));
    setFat(String(componentTotals.fat));
    setCarbs(String(componentTotals.carbs));
    setSuccess("Valores nutricionales recalculados desde los alimentos.");
  };

  const syncComponents = async (mealId) => {
    for (const componentId of removedComponentIds) {
      await requestJson(`${API_URL}/api/meal-components/${componentId}?user_id=${userId}`, {
        method: "DELETE",
      });
    }

    for (const component of components) {
      const payload = {
        name: component.name.trim(),
        quantity: toNumericValue(component.quantity),
        unit: component.unit.trim() || "g",
        calories: toNumericValue(component.calories),
        protein: toNumericValue(component.protein),
        fat: toNumericValue(component.fat),
        carbs: toNumericValue(component.carbs),
      };

      if (component.id) {
        await requestJson(`${API_URL}/api/meal-components/${component.id}?user_id=${userId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await requestJson(`${API_URL}/api/meals/${mealId}/components?user_id=${userId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
    }
  };

  const save = async (event) => {
    event.preventDefault();
    if (!userId) return;
    if (!name.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        name: name.trim(),
        meal_type: mealType.trim(),
        notes: notes.trim(),
        calories: toNumericValue(calories),
        protein: toNumericValue(protein),
        fat: toNumericValue(fat),
        carbs: toNumericValue(carbs),
      };

      const template = await requestJson(
        `${API_URL}/api/meals${isNew ? "" : `/${meal.id}`}?user_id=${userId}`,
        {
          method: isNew ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      await syncComponents(template.id);

      const freshMeal = await requestJson(`${API_URL}/api/meals/${template.id}?user_id=${userId}`);
      setComponents((freshMeal.components || []).map(createDraftComponent));
      setRemovedComponentIds([]);
      setSuccess("Comida guardada correctamente.");
      if (onSaved) onSaved(freshMeal);
    } catch (saveError) {
      setError(saveError.message || "Error al guardar la comida.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`meal-editor card ${compact ? "meal-editor-compact" : ""}`}>
      <form onSubmit={save}>
        <div className="meal-editor-hero">
          <div>
            <p className="meal-editor-kicker">Comida reutilizable</p>
            <h2>{isNew ? "Crear nueva comida" : "Editar comida"}</h2>
            <p className="text-muted">
              Define la comida principal y, si quieres, añade los alimentos que la componen.
            </p>
          </div>
        </div>

        <div className="meal-editor-grid">
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
        </div>

        <label>
          Notas
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={compact ? 2 : 3}
            placeholder="Ejemplo: ideal para post entreno o cena ligera"
          />
        </label>

        <section className="meal-editor-section">
          <div className="section-heading">
            <div>
              <h3>Nutrición principal</h3>
              <p className="text-muted">
                Puedes editarla manualmente o recalcularla a partir de los alimentos.
              </p>
            </div>
            {components.length > 0 && (
              <button type="button" className="btn-sm" onClick={applyComponentTotals}>
                Recalcular desde alimentos
              </button>
            )}
          </div>

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
        </section>

        <section className="meal-editor-section">
          <div className="section-heading">
            <div>
              <h3>Alimentos que componen la comida</h3>
              <p className="text-muted">
                Añade ingredientes como arroz, pollo o verdura con sus propios valores nutricionales.
              </p>
            </div>
            <div className="component-totals">
              <span>{componentTotals.calories.toFixed(1)} kcal</span>
              <span>P {componentTotals.protein.toFixed(1)}</span>
              <span>G {componentTotals.fat.toFixed(1)}</span>
              <span>C {componentTotals.carbs.toFixed(1)}</span>
            </div>
          </div>

          <div className="component-draft card-muted">
            <div className="component-draft-grid">
              <label>
                Alimento
                <input
                  value={componentDraft.name}
                  onChange={(e) => updateComponentDraftField("name", e.target.value)}
                  placeholder="Pollo"
                />
              </label>
              <label>
                Cantidad
                <input
                  type="number"
                  step="0.1"
                  value={componentDraft.quantity}
                  onChange={(e) => updateComponentDraftField("quantity", e.target.value)}
                />
              </label>
              <label>
                Unidad
                <input
                  value={componentDraft.unit}
                  onChange={(e) => updateComponentDraftField("unit", e.target.value)}
                  placeholder="g"
                />
              </label>
              <label>
                Calorías
                <input
                  type="number"
                  step="0.1"
                  value={componentDraft.calories}
                  onChange={(e) => updateComponentDraftField("calories", e.target.value)}
                />
              </label>
              <label>
                Proteínas
                <input
                  type="number"
                  step="0.1"
                  value={componentDraft.protein}
                  onChange={(e) => updateComponentDraftField("protein", e.target.value)}
                />
              </label>
              <label>
                Grasas
                <input
                  type="number"
                  step="0.1"
                  value={componentDraft.fat}
                  onChange={(e) => updateComponentDraftField("fat", e.target.value)}
                />
              </label>
              <label>
                Carbohidratos
                <input
                  type="number"
                  step="0.1"
                  value={componentDraft.carbs}
                  onChange={(e) => updateComponentDraftField("carbs", e.target.value)}
                />
              </label>
            </div>
            <div className="component-draft-actions">
              <button type="button" className="btn-primary" onClick={addComponentDraft}>
                Añadir alimento
              </button>
              <button type="button" className="btn-sm" onClick={resetDraft}>
                Limpiar
              </button>
            </div>
          </div>

          {components.length === 0 ? (
            <div className="card card-muted">
              <p>Todavía no has añadido alimentos a esta comida.</p>
            </div>
          ) : (
            <div className="component-list">
              {components.map((component) => (
                <article key={component.tempId} className="component-card">
                  <div className="component-card-head">
                    <strong>{component.name || "Alimento sin nombre"}</strong>
                    <button type="button" className="btn-sm" onClick={() => removeComponent(component.tempId)}>
                      Eliminar
                    </button>
                  </div>
                  <div className="component-draft-grid">
                    <label>
                      Nombre
                      <input
                        value={component.name}
                        onChange={(e) => updateComponent(component.tempId, "name", e.target.value)}
                      />
                    </label>
                    <label>
                      Cantidad
                      <input
                        type="number"
                        step="0.1"
                        value={component.quantity}
                        onChange={(e) => updateComponent(component.tempId, "quantity", e.target.value)}
                      />
                    </label>
                    <label>
                      Unidad
                      <input
                        value={component.unit}
                        onChange={(e) => updateComponent(component.tempId, "unit", e.target.value)}
                      />
                    </label>
                    <label>
                      Calorías
                      <input
                        type="number"
                        step="0.1"
                        value={component.calories}
                        onChange={(e) => updateComponent(component.tempId, "calories", e.target.value)}
                      />
                    </label>
                    <label>
                      Proteínas
                      <input
                        type="number"
                        step="0.1"
                        value={component.protein}
                        onChange={(e) => updateComponent(component.tempId, "protein", e.target.value)}
                      />
                    </label>
                    <label>
                      Grasas
                      <input
                        type="number"
                        step="0.1"
                        value={component.fat}
                        onChange={(e) => updateComponent(component.tempId, "fat", e.target.value)}
                      />
                    </label>
                    <label>
                      Carbohidratos
                      <input
                        type="number"
                        step="0.1"
                        value={component.carbs}
                        onChange={(e) => updateComponent(component.tempId, "carbs", e.target.value)}
                      />
                    </label>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {error && <p className="error-msg">{error}</p>}
        {success && <p className="success-msg">{success}</p>}

        <div className="form-actions">
          <button type="button" onClick={onCancel}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Guardando..." : saveButtonLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
