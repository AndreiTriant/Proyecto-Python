import { closestCenter, DndContext, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import SortableDayMealCard from "./SortableDayMealCard";

function sortMeals(meals = []) {
  return [...meals].sort((left, right) => (left.order ?? 0) - (right.order ?? 0));
}

export default function DietDayColumn({
  day,
  searchTerm,
  onSearchChange,
  filteredMeals,
  onAddMeal,
  onOpenCreateMeal,
  onOpenCopyDay,
  onDeleteMeal,
  onUpdateMealLabel,
  onEditAssignedMeal,
  onReorderMeals,
  busy = false,
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const orderedMeals = sortMeals(day.meals || []);

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = orderedMeals.findIndex((meal) => meal.id === active.id);
    const newIndex = orderedMeals.findIndex((meal) => meal.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reorderedMeals = arrayMove(orderedMeals, oldIndex, newIndex).map((meal, index) => ({
      ...meal,
      order: index,
    }));
    onReorderMeals(day.weekday, reorderedMeals);
  };

  return (
    <section className="modern-day-column">
      <div className="day-column-head">
        <div>
          <p className="day-column-kicker">Día de la semana</p>
          <h3>{day.weekday ? day.weekday.charAt(0).toUpperCase() + day.weekday.slice(1) : ""}</h3>
          <p className="text-muted">
            {orderedMeals.length} comida{orderedMeals.length === 1 ? "" : "s"} planificada
            {orderedMeals.length === 1 ? "" : "s"}
          </p>
        </div>
        <button type="button" className="btn-sm" onClick={() => onOpenCopyDay(day.weekday)}>
          Copiar a...
        </button>
      </div>

      <div className="day-actions">
        <button type="button" className="btn-primary" onClick={() => onOpenCreateMeal(day.weekday)}>
          Crear nueva comida
        </button>
      </div>

      <div className="meal-search-shell">
        <input
          className="meal-search-input"
          value={searchTerm}
          onChange={(event) => onSearchChange(day.weekday, event.target.value)}
          placeholder="Buscar comida existente..."
        />
        {searchTerm.trim() ? (
          <div className="meal-search-results">
            {filteredMeals.length === 0 ? (
              <p className="text-muted">No hay comidas con ese nombre.</p>
            ) : (
              filteredMeals.map((meal) => (
                <button
                  key={meal.id}
                  type="button"
                  className="meal-search-result"
                  onClick={() => onAddMeal(day.weekday, meal)}
                >
                  <span>{meal.name}</span>
                  <small>
                    {Number(meal.calories || 0).toFixed(1)} kcal · {meal.components?.length || 0} alimento
                    {(meal.components?.length || 0) === 1 ? "" : "s"}
                  </small>
                </button>
              ))
            )}
          </div>
        ) : (
          <p className="meal-search-hint">Busca por nombre y añade la comida al día.</p>
        )}
      </div>

      {orderedMeals.length === 0 ? (
        <div className="empty-day-card">
          <p>Este día todavía no tiene comidas.</p>
          <span>Empieza buscando una comida existente o crea una nueva.</span>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={orderedMeals.map((meal) => meal.id)} strategy={verticalListSortingStrategy}>
            <div className="day-meals-stack">
              {orderedMeals.map((assignedMeal) => (
                <SortableDayMealCard
                  key={assignedMeal.id}
                  assignedMeal={assignedMeal}
                  onDelete={(mealId) => onDeleteMeal(day.weekday, mealId)}
                  onSaveLabel={(mealId, label) => onUpdateMealLabel(day.weekday, mealId, label)}
                  onEditMeal={
                    onEditAssignedMeal
                      ? (meal) => onEditAssignedMeal(day.weekday, meal)
                      : undefined
                  }
                  busy={busy}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </section>
  );
}
