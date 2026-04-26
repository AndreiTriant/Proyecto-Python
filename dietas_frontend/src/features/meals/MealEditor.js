import { useEffect, useMemo, useState } from "react";
import { API_URL } from "../../constantes";
import { apiFetch } from "../../services/api";
import "./meal-editor.css";

const EMPTY_COMPONENT = {
  name: "",
  quantity: "100",
  unit: "g",
  calories: "",
  protein: "",
  fat: "",
  carbs: "",
};

const OPTIONAL_COMPONENT_FIELDS = [
  { key: "calories", label: "Calorias", shortLabel: "kcal", inputLabel: "Calorias" },
  { key: "protein", label: "Proteinas", shortLabel: "P", inputLabel: "Proteinas (g)" },
  { key: "fat", label: "Grasas", shortLabel: "G", inputLabel: "Grasas (g)" },
  { key: "carbs", label: "Carbohidratos", shortLabel: "C", inputLabel: "Carbohidratos (g)" },
];

const COMPONENT_UNIT_OPTIONS = ["g", "kg", "mg", "ml", "l", "oz", "lb", "cda"];

const MEAL_TEMPLATE_UNIT_OPTIONS = ["porción", "ración", ...COMPONENT_UNIT_OPTIONS];

function normalizeComponentUnit(unit) {
  const u = (unit || "").trim() || "g";
  return COMPONENT_UNIT_OPTIONS.includes(u) ? u : "g";
}

function normalizeMealTemplateUnit(unit) {
  const u = (unit || "").trim() || "porción";
  return MEAL_TEMPLATE_UNIT_OPTIONS.includes(u) ? u : "porción";
}

function toNumericValue(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function formatDecimal(value) {
  return toNumericValue(value).toFixed(1);
}

function hasMeaningfulNumber(value) {
  if (value === "" || value === null || value === undefined) {
    return false;
  }
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue !== 0;
}

function getEnabledComponentFields(source = []) {
  return OPTIONAL_COMPONENT_FIELDS.filter(({ key }) =>
    source.some((component) => hasMeaningfulNumber(component?.[key]))
  ).map(({ key }) => key);
}

function sanitizeComponentDraft(component) {
  const nextComponent = {
    ...component,
    name: (component.name || "").trim(),
    quantity: String(component.quantity ?? ""),
    unit: normalizeComponentUnit(component.unit),
  };

  OPTIONAL_COMPONENT_FIELDS.forEach(({ key }) => {
    nextComponent[key] = hasMeaningfulNumber(component[key]) ? String(component[key]) : "";
  });

  return nextComponent;
}

function createDraftComponent(component = {}, forcedTempId = null) {
  return {
    id: component.id || null,
    tempId:
      forcedTempId || (component.id ? `existing-${component.id}` : `draft-${Date.now()}-${Math.random()}`),
    name: component.name || "",
    quantity: String(component.quantity ?? 0),
    unit: normalizeComponentUnit(component.unit),
    calories: String(component.calories ?? 0),
    protein: String(component.protein ?? 0),
    fat: String(component.fat ?? 0),
    carbs: String(component.carbs ?? 0),
  };
}

async function requestJson(url, options = {}) {
  const response = await apiFetch(url, options);
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
  modalTitle = "",
  modalSubtitle = "",
  modalInfoText = "",
  modalCloseLabel = null,
}) {
  const isNew = !meal?.id;
  const [name, setName] = useState(meal?.name || "");
  const [notes, setNotes] = useState(meal?.notes || "");
  const [calories, setCalories] = useState(String(meal?.calories ?? 0));
  const [protein, setProtein] = useState(String(meal?.protein ?? 0));
  const [fat, setFat] = useState(String(meal?.fat ?? 0));
  const [carbs, setCarbs] = useState(String(meal?.carbs ?? 0));
  const [mealQuantity, setMealQuantity] = useState(String(meal?.quantity ?? 1));
  const [mealUnit, setMealUnit] = useState(normalizeMealTemplateUnit(meal?.unit));
  const [components, setComponents] = useState((meal?.components || []).map(createDraftComponent));
  const [removedComponentIds, setRemovedComponentIds] = useState([]);
  const [componentDraft, setComponentDraft] = useState({ ...EMPTY_COMPONENT });
  const [enabledComponentFields, setEnabledComponentFields] = useState(
    getEnabledComponentFields(meal?.components || [])
  );
  const [showComponentBuilder, setShowComponentBuilder] = useState(false);
  const [editingComponentTempId, setEditingComponentTempId] = useState("");
  const [saving, setSaving] = useState(false);
  const [estimatingNutrition, setEstimatingNutrition] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    setName(meal?.name || "");
    setNotes(meal?.notes || "");
    setCalories(String(meal?.calories ?? 0));
    setProtein(String(meal?.protein ?? 0));
    setFat(String(meal?.fat ?? 0));
    setCarbs(String(meal?.carbs ?? 0));
    setMealQuantity(String(meal?.quantity ?? 1));
    setMealUnit(normalizeMealTemplateUnit(meal?.unit));
    setComponents((meal?.components || []).map(createDraftComponent));
    setRemovedComponentIds([]);
    setComponentDraft({ ...EMPTY_COMPONENT });
    setEnabledComponentFields(getEnabledComponentFields(meal?.components || []));
    setShowComponentBuilder(false);
    setEditingComponentTempId("");
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
    setEditingComponentTempId("");
  };

  const toggleComponentField = (fieldKey) => {
    setEnabledComponentFields((prev) => {
      if (prev.includes(fieldKey)) {
        setComponentDraft((draft) => ({ ...draft, [fieldKey]: "" }));
        return prev.filter((field) => field !== fieldKey);
      }
      setComponentDraft((draft) => ({
        ...draft,
        [fieldKey]: draft[fieldKey] === "0" ? "" : draft[fieldKey],
      }));
      return [...prev, fieldKey];
    });
  };

  const saveComponentDraft = () => {
    if (!componentDraft.name.trim()) {
      setError("El nombre del alimento es obligatorio.");
      return;
    }
    const nextComponent = createDraftComponent(
      sanitizeComponentDraft(componentDraft),
      editingComponentTempId || null
    );
    setComponents((prev) =>
      editingComponentTempId
        ? prev.map((component) =>
            component.tempId === editingComponentTempId ? nextComponent : component
          )
        : [...prev, nextComponent]
    );
    setError("");
    setSuccess("");
    resetDraft();
  };

  const removeComponent = (tempId) => {
    setComponents((prev) => {
      const componentToDelete = prev.find((component) => component.tempId === tempId);
      if (componentToDelete?.id) {
        setRemovedComponentIds((ids) => [...ids, componentToDelete.id]);
      }
      return prev.filter((component) => component.tempId !== tempId);
    });
    if (editingComponentTempId === tempId) {
      resetDraft();
    }
  };

  const editComponent = (component) => {
    setShowComponentBuilder(true);
    setEditingComponentTempId(component.tempId);
    setComponentDraft({
      name: component.name || "",
      quantity: String(component.quantity ?? 0),
      unit: normalizeComponentUnit(component.unit),
      calories: hasMeaningfulNumber(component.calories) ? String(component.calories) : "",
      protein: hasMeaningfulNumber(component.protein) ? String(component.protein) : "",
      fat: hasMeaningfulNumber(component.fat) ? String(component.fat) : "",
      carbs: hasMeaningfulNumber(component.carbs) ? String(component.carbs) : "",
    });
    setEnabledComponentFields((prev) => {
      const merged = new Set([
        ...prev,
        ...OPTIONAL_COMPONENT_FIELDS.filter(({ key }) => toNumericValue(component[key]) !== 0).map(
          ({ key }) => key
        ),
      ]);
      return [...merged];
    });
  };

  const applyComponentTotals = () => {
    setCalories(String(componentTotals.calories));
    setProtein(String(componentTotals.protein));
    setFat(String(componentTotals.fat));
    setCarbs(String(componentTotals.carbs));
    setSuccess("Valores nutricionales recalculados desde los alimentos.");
  };

  const estimateNutritionWithAI = async () => {
    if (!userId) return;
    if (!name.trim()) {
      setError("El nombre de la comida es obligatorio para usar la IA.");
      return;
    }
    try {
      setEstimatingNutrition(true);
      setError("");
      setSuccess("");

      const q = toNumericValue(mealQuantity);
      const payload = {
        name: name.trim(),
      };
      if (q > 0) {
        payload.quantity = q;
        payload.unit = normalizeMealTemplateUnit(mealUnit);
      }

      const data = await requestJson(
        `${API_URL}/api/ai/estimate-meal-nutrition?user_id=${userId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const n = data?.nutrition || {};
      setCalories(String(n.calories ?? ""));
      setProtein(String(n.protein ?? ""));
      setFat(String(n.fat ?? ""));
      setCarbs(String(n.carbs ?? ""));
      setSuccess("Valores nutricionales estimados con IA.");
    } catch (aiError) {
      setError(aiError.message || "No se pudo estimar la nutrición con IA.");
    } finally {
      setEstimatingNutrition(false);
    }
  };

  const syncComponents = async (mealId) => {
    for (const componentId of removedComponentIds) {
      await requestJson(`${API_URL}/api/meal-components/${componentId}?user_id=${userId}`, {
        method: "DELETE",
      });
    }

    for (const component of components) {
      const sanitizedComponent = sanitizeComponentDraft(component);
      const payload = {
        name: sanitizedComponent.name,
        quantity: toNumericValue(sanitizedComponent.quantity),
        unit: sanitizedComponent.unit,
        calories: toNumericValue(sanitizedComponent.calories),
        protein: toNumericValue(sanitizedComponent.protein),
        fat: toNumericValue(sanitizedComponent.fat),
        carbs: toNumericValue(sanitizedComponent.carbs),
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

      const q = toNumericValue(mealQuantity);
      const payload = {
        name: name.trim(),
        notes: notes.trim(),
        quantity: q > 0 ? q : 1,
        unit: normalizeMealTemplateUnit(mealUnit),
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
      setEnabledComponentFields(getEnabledComponentFields(freshMeal.components || []));
      setRemovedComponentIds([]);
      resetDraft();
      setSuccess("Comida guardada correctamente.");
      if (onSaved) onSaved(freshMeal);
    } catch (saveError) {
      setError(saveError.message || "Error al guardar la comida.");
    } finally {
      setSaving(false);
    }
  };

  const titleHeading =
    modalTitle.trim() || (isNew ? "Crear nueva comida" : "Editar comida");

  const defaultInfoText =
    "Los cambios aplicados a esta plantilla se verán reflejados en todos los días de esta dieta y en tu biblioteca personal.";

  const qtyLabel = `${formatDecimal(mealQuantity)} ${normalizeMealTemplateUnit(mealUnit)}`;
  const totalSummary = `${qtyLabel} · ${toNumericValue(calories).toFixed(0)} kcal | ${toNumericValue(protein).toFixed(0)}P | ${toNumericValue(fat).toFixed(0)}G | ${toNumericValue(carbs).toFixed(0)}C`;

  const toggleComponentBuilder = () => {
    setShowComponentBuilder((prev) => !prev);
    if (showComponentBuilder) resetDraft();
  };

  const componentsBlock = (
    <>
      <div
        className={
          compact ? "meal-section-header-split" : "meal-components-inline-head"
        }
      >
        <div>
          {compact ? (
            <span className="meal-section-title meal-section-title--inline">DESGLOSE DE ALIMENTOS</span>
          ) : (
            <>
              <p className="meal-components-inline-title">
                Si quieres dejar mas detalle, puedes anadir alimentos
              </p>
              <p className="text-muted">
                Guarda solo el desglose que te interese y deja el resto sin completar.
              </p>
            </>
          )}
        </div>
        <button
          type="button"
          className={compact ? "meal-link-muted" : "btn-sm"}
          onClick={toggleComponentBuilder}
        >
          {showComponentBuilder
            ? "Ocultar detalle"
            : components.length
              ? compact
                ? "Editar desglose ›"
                : "Editar desglose"
              : compact
                ? "Editar desglose ›"
                : "Anadir desglose"}
        </button>
      </div>

      {compact && components.length === 0 && !showComponentBuilder && (
        <div className="meal-empty-state">
          <div className="meal-empty-icon" aria-hidden>
            🍽️
          </div>
          <p>No has añadido alimentos individuales todavía.</p>
          <button type="button" className="meal-btn-text-primary" onClick={() => setShowComponentBuilder(true)}>
            Añadir primer ingrediente
          </button>
        </div>
      )}

      {components.length > 0 && (
        <>
          {!compact && (
            <div className="component-totals">
              <span>{componentTotals.calories.toFixed(1)} kcal</span>
              <span>P {componentTotals.protein.toFixed(1)}</span>
              <span>G {componentTotals.fat.toFixed(1)}</span>
              <span>C {componentTotals.carbs.toFixed(1)}</span>
            </div>
          )}
          <div className="component-chip-list">
            {components.map((component) => {
              const tooltipRows = [
                {
                  label: "Cantidad",
                  value: `${formatDecimal(component.quantity)} ${component.unit || "g"}`,
                },
                ...OPTIONAL_COMPONENT_FIELDS.filter(({ key }) => hasMeaningfulNumber(component[key])).map(
                  ({ key, label, shortLabel }) => ({
                    label,
                    value:
                      key === "calories"
                        ? `${formatDecimal(component[key])} ${shortLabel}`
                        : `${formatDecimal(component[key])} g`,
                  })
                ),
              ];

              return (
                <div
                  key={component.tempId}
                  className={`component-chip-wrapper ${
                    editingComponentTempId === component.tempId ? "component-chip-wrapper-active" : ""
                  }`}
                >
                  <button
                    type="button"
                    className="component-chip"
                    onClick={() => editComponent(component)}
                  >
                    {component.name || "Alimento"}
                  </button>
                  <button
                    type="button"
                    className="component-chip-remove"
                    aria-label={`Eliminar ${component.name || "alimento"}`}
                    onClick={() => removeComponent(component.tempId)}
                  >
                    x
                  </button>
                  <div className="component-chip-tooltip">
                    <strong>{component.name || "Alimento"}</strong>
                    <ul>
                      {tooltipRows.map((row) => (
                        <li key={`${component.tempId}-${row.label}`}>
                          <span>{row.label}</span>
                          <span>{row.value}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {showComponentBuilder && (
        <div className="component-builder card-muted">
          <div className="component-builder-head">
            <div>
              <h3>{editingComponentTempId ? "Editar alimento" : "Anadir alimento"}</h3>
              <p className="text-muted">Primero elige que datos quieres guardar para este alimento.</p>
            </div>
            {components.length > 0 && (
              <button type="button" className="btn-sm" onClick={applyComponentTotals}>
                Recalcular nutricion
              </button>
            )}
          </div>

          <div className="component-field-picker">
            {OPTIONAL_COMPONENT_FIELDS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                className={`component-field-toggle ${
                  enabledComponentFields.includes(key) ? "component-field-toggle-active" : ""
                }`}
                onClick={() => toggleComponentField(key)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="component-draft-grid">
            <div className="component-draft-name-qty-row">
              <label className="component-draft-name-field">
                Alimento
                <input
                  value={componentDraft.name}
                  onChange={(e) => updateComponentDraftField("name", e.target.value)}
                  placeholder="Pollo"
                />
              </label>
              <label className="quantity-combined-label component-draft-qty-field">
                Cantidad
                <div className="quantity-field-row">
                  <input
                    className="quantity-input-part"
                    type="number"
                    step="0.1"
                    value={componentDraft.quantity}
                    onChange={(e) => updateComponentDraftField("quantity", e.target.value)}
                  />
                  <select
                    className="quantity-unit-part"
                    aria-label="Unidad de la cantidad"
                    value={componentDraft.unit}
                    onChange={(e) => updateComponentDraftField("unit", e.target.value)}
                  >
                    {COMPONENT_UNIT_OPTIONS.map((unitOption) => (
                      <option key={unitOption} value={unitOption}>
                        {unitOption}
                      </option>
                    ))}
                  </select>
                </div>
              </label>
            </div>
            {OPTIONAL_COMPONENT_FIELDS.filter(({ key }) => enabledComponentFields.includes(key)).map(
              ({ key, inputLabel }) => (
                <label key={key}>
                  {inputLabel}
                  <input
                    type="number"
                    step="0.1"
                    value={componentDraft[key]}
                    onChange={(e) => updateComponentDraftField(key, e.target.value)}
                  />
                </label>
              )
            )}
          </div>

          <div className="component-draft-actions">
            <button type="button" className="btn-primary" onClick={saveComponentDraft}>
              {editingComponentTempId ? "Guardar alimento" : "Anadir alimento"}
            </button>
            <button type="button" className="btn-sm" onClick={resetDraft}>
              Limpiar
            </button>
          </div>
        </div>
      )}
    </>
  );

  if (compact) {
    return (
      <div className="meal-editor meal-editor--modal meal-editor-compact">
        <form onSubmit={save}>
          <header className="meal-modal-header">
            <div>
              {modalSubtitle.trim() ? (
                <span className="meal-modal-subtitle">{modalSubtitle}</span>
              ) : null}
              <h2>{titleHeading}</h2>
            </div>
            <button
              type="button"
              className={`meal-modal-close ${modalCloseLabel ? "meal-modal-close--wide" : ""}`}
              aria-label={modalCloseLabel ? "Volver" : "Cerrar"}
              onClick={onCancel}
            >
              {modalCloseLabel ?? "✕"}
            </button>
          </header>

          <div className="meal-modal-body">
            <div className="meal-info-alert">
              <span className="meal-info-alert-icon" aria-hidden>
                ⓘ
              </span>
              <p>{modalInfoText.trim() || defaultInfoText}</p>
            </div>

            <section className="meal-modal-section">
              <div className="meal-section-title">
                <span aria-hidden>🍴</span>
                <span>DATOS GENERALES</span>
              </div>
              <div className="meal-form-group">
                <label htmlFor="meal-name-input">Nombre de la comida</label>
                <input
                  id="meal-name-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="meal-form-group">
                <label htmlFor="meal-notes-input">Notas adicionales</label>
                <textarea
                  id="meal-notes-input"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  placeholder="Ej.: Ideal para post-entreno o cena ligera…"
                />
              </div>
              <div className="meal-form-group">
                <span className="meal-form-label-text">Cantidad de la comida</span>
                <div className="quantity-field-row">
                  <input
                    id="meal-template-qty-compact"
                    className="quantity-input-part"
                    type="number"
                    step="any"
                    min="0.01"
                    value={mealQuantity}
                    onChange={(e) => setMealQuantity(e.target.value)}
                    aria-label="Cantidad"
                  />
                  <select
                    className="quantity-unit-part"
                    aria-label="Unidad de la comida"
                    value={mealUnit}
                    onChange={(e) => setMealUnit(e.target.value)}
                  >
                    {MEAL_TEMPLATE_UNIT_OPTIONS.map((unitOption) => (
                      <option key={unitOption} value={unitOption}>
                        {unitOption}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            <section className="meal-nutrition-section">
              <div className="meal-nutrition-header">
                <div className="meal-nutrition-title">
                  <span aria-hidden>📓</span>
                  <span>Nutrición principal</span>
                </div>
                <div className="meal-nutrition-actions">
                  <button
                    type="button"
                    className="meal-btn-text-upper"
                    onClick={estimateNutritionWithAI}
                    disabled={estimatingNutrition}
                    title="Estima kcal/macros desde el nombre (y cantidad si la indicas)."
                  >
                    {estimatingNutrition ? "CALCULANDO…" : "CALCULAR CON IA"}
                  </button>
                  {components.length > 0 && (
                    <button type="button" className="meal-btn-text-upper" onClick={applyComponentTotals}>
                      RECALCULAR DESDE ALIMENTOS
                    </button>
                  )}
                </div>
              </div>

              <div className="nutrition-cards">
                <div className="nutri-card cal">
                  <span className="nutri-card-label">🔥 CALORÍAS</span>
                  <input
                    className="nutri-card-input"
                    type="number"
                    step="0.1"
                    value={calories}
                    onChange={(e) => setCalories(e.target.value)}
                    aria-label="Calorías"
                  />
                </div>
                <div className="nutri-card pro">
                  <span className="nutri-card-label">🥩 PROTEÍNAS (G)</span>
                  <input
                    className="nutri-card-input"
                    type="number"
                    step="0.1"
                    value={protein}
                    onChange={(e) => setProtein(e.target.value)}
                    aria-label="Proteínas en gramos"
                  />
                </div>
                <div className="nutri-card fat">
                  <span className="nutri-card-label">🥑 GRASAS (G)</span>
                  <input
                    className="nutri-card-input"
                    type="number"
                    step="0.1"
                    value={fat}
                    onChange={(e) => setFat(e.target.value)}
                    aria-label="Grasas en gramos"
                  />
                </div>
                <div className="nutri-card carb">
                  <span className="nutri-card-label">🌾 CARBOHIDRATOS (G)</span>
                  <input
                    className="nutri-card-input"
                    type="number"
                    step="0.1"
                    value={carbs}
                    onChange={(e) => setCarbs(e.target.value)}
                    aria-label="Carbohidratos en gramos"
                  />
                </div>
              </div>
            </section>

            <section className="meal-modal-section meal-modal-section--breakdown">
              <div className="meal-components-inline meal-components-inline--compact">{componentsBlock}</div>
            </section>

            {error && <p className="error-msg">{error}</p>}
            {success && <p className="success-msg">{success}</p>}
          </div>

          <footer className="meal-modal-footer">
            <div className="meal-footer-totals">
              <span className="meal-total-label">TOTAL ESTIMADO</span>
              <span className="meal-total-value">{totalSummary}</span>
            </div>
            <div className="meal-footer-actions">
              <button type="button" className="meal-btn-cancel" onClick={onCancel}>
                Cancelar
              </button>
              <button type="submit" className="meal-btn-submit" disabled={saving}>
                {saving ? "Guardando…" : saveButtonLabel}
              </button>
            </div>
          </footer>
        </form>
      </div>
    );
  }

  return (
    <div className="meal-editor card">
      <form onSubmit={save}>
        <div className="meal-editor-hero">
          <div>
            <p className="meal-editor-kicker">Comida reutilizable</p>
            <h2>{titleHeading}</h2>
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
        </div>

        <label>
          Notas
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Ejemplo: ideal para post entreno o cena ligera"
          />
        </label>

        <div className="meal-editor-grid meal-editor-grid--meal-qty">
          <label>
            Cantidad de la comida
            <input
              type="number"
              step="any"
              min="0.01"
              value={mealQuantity}
              onChange={(e) => setMealQuantity(e.target.value)}
            />
          </label>
          <label>
            Unidad
            <select value={mealUnit} onChange={(e) => setMealUnit(e.target.value)}>
              {MEAL_TEMPLATE_UNIT_OPTIONS.map((unitOption) => (
                <option key={unitOption} value={unitOption}>
                  {unitOption}
                </option>
              ))}
            </select>
          </label>
        </div>

        <section className="meal-editor-section">
          <div className="section-heading">
            <div>
              <h3>Nutrición principal</h3>
              <p className="text-muted">
                Puedes editarla manualmente o recalcularla a partir de los alimentos.
              </p>
            </div>
            <div className="meal-editor-nutrition-actions">
              <button
                type="button"
                className="btn-sm"
                onClick={estimateNutritionWithAI}
                disabled={estimatingNutrition}
              >
                {estimatingNutrition ? "Calculando…" : "Calcular con IA"}
              </button>
              {components.length > 0 && (
                <button type="button" className="btn-sm" onClick={applyComponentTotals}>
                  Recalcular desde alimentos
                </button>
              )}
            </div>
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

        <div className="meal-components-inline">{componentsBlock}</div>

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
