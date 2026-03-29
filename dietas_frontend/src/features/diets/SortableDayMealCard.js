import { useMemo, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function formatNumber(value) {
  return Number(value || 0).toFixed(1);
}

export default function SortableDayMealCard({
  assignedMeal,
  onDelete,
  onSaveLabel,
  onEditMeal,
  busy = false,
}) {
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [labelValue, setLabelValue] = useState(assignedMeal.label || "");

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: assignedMeal.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const components = useMemo(
    () => assignedMeal.meal_template?.components || [],
    [assignedMeal.meal_template?.components]
  );

  const saveLabel = () => {
    onSaveLabel(assignedMeal.id, labelValue);
    setIsEditingLabel(false);
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`assigned-meal-card ${isDragging ? "assigned-meal-card-dragging" : ""}`}
    >
      <div className="assigned-meal-card-head">
        <div>
          <span className="assigned-meal-order">#{(assignedMeal.order ?? 0) + 1}</span>
          <h4>{assignedMeal.meal_template?.name || "Comida"}</h4>
        </div>
        <button
          type="button"
          className="drag-handle"
          aria-label="Reordenar comida"
          {...attributes}
          {...listeners}
        >
          Mover
        </button>
      </div>

      {isEditingLabel ? (
        <div className="meal-label-editor">
          <input
            value={labelValue}
            onChange={(event) => setLabelValue(event.target.value)}
            placeholder="Desayuno, comida, cena..."
          />
          <div className="meal-label-editor-actions">
            <button type="button" className="btn-sm" onClick={saveLabel} disabled={busy}>
              Guardar
            </button>
            <button
              type="button"
              className="btn-sm"
              onClick={() => {
                setLabelValue(assignedMeal.label || "");
                setIsEditingLabel(false);
              }}
              disabled={busy}
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="assigned-meal-chip-row">
          <span className="assigned-meal-chip assigned-meal-chip-label">
            {assignedMeal.label || "Sin etiqueta"}
          </span>
          <button type="button" className="assigned-meal-link" onClick={() => setIsEditingLabel(true)}>
            Editar etiqueta
          </button>
        </div>
      )}

      <div className="assigned-meal-macros">
        <span>{formatNumber(assignedMeal.meal_template?.calories)} kcal</span>
        <span>P {formatNumber(assignedMeal.meal_template?.protein)}</span>
        <span>G {formatNumber(assignedMeal.meal_template?.fat)}</span>
        <span>C {formatNumber(assignedMeal.meal_template?.carbs)}</span>
      </div>

      <div className="assigned-meal-footer">
        <div className="tooltip-wrapper">
          <span className="assigned-meal-chip assigned-meal-chip-info">
            {components.length > 0
              ? `${components.length} alimento${components.length === 1 ? "" : "s"}`
              : "Sin desglose"}
          </span>
          {components.length > 0 && (
            <div className="modern-tooltip">
              <strong>Composición nutricional</strong>
              <ul>
                {components.map((component) => (
                  <li key={component.id || `${component.name}-${component.quantity}`}>
                    <span>
                      {component.name} · {component.quantity} {component.unit}
                    </span>
                    <span>
                      {formatNumber(component.calories)} kcal | P {formatNumber(component.protein)} | G{" "}
                      {formatNumber(component.fat)} | C {formatNumber(component.carbs)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="assigned-meal-footer-actions">
          {onEditMeal && assignedMeal.meal_template?.id ? (
            <button
              type="button"
              className="btn-sm"
              onClick={() => onEditMeal(assignedMeal)}
              disabled={busy}
            >
              Editar comida
            </button>
          ) : null}
          <button type="button" className="btn-sm" onClick={() => onDelete(assignedMeal.id)} disabled={busy}>
            Eliminar
          </button>
        </div>
      </div>
    </article>
  );
}
