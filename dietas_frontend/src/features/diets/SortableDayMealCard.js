import { useMemo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function formatNumber(value) {
  return Number(value || 0).toFixed(1);
}

function isNonZero(value) {
  return Number(value || 0) !== 0;
}

/** Línea tipo "120 kcal · P 10 · G 5" omitiendo ceros. */
function componentNutritionSummary(component) {
  const bits = [];
  if (isNonZero(component.calories)) bits.push(`${formatNumber(component.calories)} kcal`);
  if (isNonZero(component.protein)) bits.push(`P ${formatNumber(component.protein)}`);
  if (isNonZero(component.fat)) bits.push(`G ${formatNumber(component.fat)}`);
  if (isNonZero(component.carbs)) bits.push(`C ${formatNumber(component.carbs)}`);
  return bits.length > 0 ? bits.join(" · ") : null;
}

export default function SortableDayMealCard({
  assignedMeal,
  onDelete,
  onEditMeal,
  busy = false,
}) {
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

  const tmpl = assignedMeal.meal_template;

  const nutritionTooltip = useMemo(() => {
    if (!tmpl) return null;
    const qtyLine = `${formatNumber(tmpl.quantity ?? 1)} ${tmpl.unit || "porción"}`;
    const calLine = isNonZero(tmpl.calories) ? `${formatNumber(tmpl.calories)} kcal` : null;
    const macroParts = [];
    if (isNonZero(tmpl.protein)) macroParts.push(`Proteínas ${formatNumber(tmpl.protein)} g`);
    if (isNonZero(tmpl.fat)) macroParts.push(`Grasas ${formatNumber(tmpl.fat)} g`);
    if (isNonZero(tmpl.carbs)) macroParts.push(`Carbohidratos ${formatNumber(tmpl.carbs)} g`);
    const macroLine = macroParts.length > 0 ? macroParts.join(" · ") : null;
    return { qtyLine, calLine, macroLine };
  }, [tmpl]);

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`assigned-meal-card ${isDragging ? "assigned-meal-card-dragging" : ""}`}
    >
      <div className="assigned-meal-card-head">
        <div className="tooltip-wrapper assigned-meal-title-tooltip">
          <h4 className="assigned-meal-card-title" tabIndex={0}>
            {tmpl?.name || "Comida"}
          </h4>
          <div className="modern-tooltip assigned-meal-nutrition-tooltip" role="tooltip">
            <strong>Valores nutricionales</strong>
            {tmpl ? (
              nutritionTooltip.qtyLine ||
              nutritionTooltip.calLine ||
              nutritionTooltip.macroLine ? (
                <p className="assigned-meal-nutrition-tooltip-body">
                  {nutritionTooltip.qtyLine ? (
                    <>
                      Cantidad: {nutritionTooltip.qtyLine}
                      <br />
                    </>
                  ) : null}
                  {nutritionTooltip.calLine}
                  {nutritionTooltip.calLine && nutritionTooltip.macroLine ? <br /> : null}
                  {nutritionTooltip.macroLine}
                </p>
              ) : (
                <p className="assigned-meal-nutrition-tooltip-body">Sin valores registrados</p>
              )
            ) : (
              <p className="assigned-meal-nutrition-tooltip-body">Sin datos</p>
            )}
          </div>
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
                {components.map((component) => {
                  const nutritionLine = componentNutritionSummary(component);
                  return (
                    <li key={component.id || `${component.name}-${component.quantity}`}>
                      <span>
                        {component.name} · {component.quantity} {component.unit}
                      </span>
                      <span>{nutritionLine ?? "Sin valores registrados"}</span>
                    </li>
                  );
                })}
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
