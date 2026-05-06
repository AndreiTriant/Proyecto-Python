import { useCallback, useEffect, useMemo, useState } from "react";
import { API_URL } from "../../constantes";
import { apiFetch } from "../../services/api";
import MealEditor from "../meals/MealEditor";
import DietDayColumn from "./DietDayColumn";
import "./weekly-diet-editor.css";

const WEEKDAYS = [
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
  "domingo",
];

function sortByWeekday(days = []) {
  return [...days].sort((left, right) => WEEKDAYS.indexOf(left.weekday) - WEEKDAYS.indexOf(right.weekday));
}

function sortDayMeals(meals = []) {
  return [...meals].sort((left, right) => (left.order ?? 0) - (right.order ?? 0));
}

async function requestJson(url, options = {}) {
  const response = await apiFetch(url, options);
  const data = await response.json();
  if (!response.ok || data?.error) {
    throw new Error(data?.error || "No se pudo completar la operación.");
  }
  return data;
}

export default function WeeklyDietEditor({ diet, userId, onUpdate }) {
  const [days, setDays] = useState(sortByWeekday(diet?.days || []));
  const [mealLibrary, setMealLibrary] = useState([]);
  const [searchTerms, setSearchTerms] = useState({});
  const [loadingMeals, setLoadingMeals] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");
  const [busyAction, setBusyAction] = useState("");
  const [createMealWeekday, setCreateMealWeekday] = useState("");
  const [copySourceWeekday, setCopySourceWeekday] = useState("");
  const [copyTargetWeekday, setCopyTargetWeekday] = useState("");
  const [editDayMealContext, setEditDayMealContext] = useState(null);

  useEffect(() => {
    setDays(sortByWeekday(diet?.days || []));
  }, [diet]);

  const loadMealLibrary = useCallback(async () => {
    if (!userId) return;
    setLoadingMeals(true);
    try {
      const data = await requestJson(`${API_URL}/api/meals?user_id=${userId}&include_components=1`);
      setMealLibrary(Array.isArray(data) ? data : []);
    } catch {
      setMealLibrary([]);
    } finally {
      setLoadingMeals(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setLoadingMeals(false);
      return;
    }
    loadMealLibrary();
  }, [userId, loadMealLibrary]);

  const daysWithFallback = useMemo(
    () =>
      days.length
        ? days
        : WEEKDAYS.map((weekday) => ({
            id: null,
            weekday,
            meals: [],
          })),
    [days]
  );

  const filteredMealMap = useMemo(() => {
    const map = {};
    WEEKDAYS.forEach((weekday) => {
      const query = (searchTerms[weekday] || "").trim().toLowerCase();
      map[weekday] = !query
        ? []
        : mealLibrary
            .filter((meal) => meal.name?.toLowerCase().includes(query))
            .slice(0, 8);
    });
    return map;
  }, [mealLibrary, searchTerms]);

  const updateDayInState = (weekday, updater) => {
    setDays((prev) => {
      const existing = prev.find((day) => day.weekday === weekday);
      const nextDay = {
        ...(existing || { id: null, weekday, meals: [] }),
        meals: sortDayMeals(
          typeof updater === "function" ? updater(existing?.meals || []) : updater
        ),
      };
      const nextDays = existing
        ? prev.map((day) => (day.weekday === weekday ? nextDay : day))
        : [...prev, nextDay];
      return sortByWeekday(nextDays);
    });
  };

  const replaceDayInState = (weekday, nextDay) => {
    setDays((prev) => {
      const existing = prev.some((day) => day.weekday === weekday);
      const nextDays = existing
        ? prev.map((day) => (day.weekday === weekday ? { ...nextDay, meals: sortDayMeals(nextDay.meals || []) } : day))
        : [...prev, { ...nextDay, meals: sortDayMeals(nextDay.meals || []) }];
      return sortByWeekday(nextDays);
    });
  };

  const clearFeedback = () => {
    setError("");
    setStatusMessage("");
  };

  const setSearchValue = (weekday, value) => {
    setSearchTerms((prev) => ({ ...prev, [weekday]: value }));
  };

  const addMealToDay = async (weekday, meal) => {
    try {
      clearFeedback();
      setBusyAction(`add-${weekday}`);
      const targetDay = daysWithFallback.find((day) => day.weekday === weekday);
      const order = targetDay?.meals?.length || 0;
      const createdDayMeal = await requestJson(
        `${API_URL}/api/diets/${diet.id}/days/${weekday}/meals?user_id=${userId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            meal_template_id: meal.id,
            order,
          }),
        }
      );
      updateDayInState(weekday, (currentMeals) => [...currentMeals, createdDayMeal]);
      setSearchValue(weekday, "");
      setStatusMessage(`"${meal.name}" se ha añadido a ${weekday}.`);
    } catch (requestError) {
      setError(requestError.message || "No se pudo añadir la comida.");
    } finally {
      setBusyAction("");
    }
  };

  const deleteMealFromDay = async (weekday, mealId) => {
    try {
      clearFeedback();
      setBusyAction(`delete-${mealId}`);
      await requestJson(`${API_URL}/api/diets/${diet.id}/days/${weekday}/meals/${mealId}?user_id=${userId}`, {
        method: "DELETE",
      });
      updateDayInState(weekday, (currentMeals) =>
        currentMeals
          .filter((meal) => meal.id !== mealId)
          .map((meal, index) => ({ ...meal, order: index }))
      );
      setStatusMessage("Comida eliminada del día.");
    } catch (requestError) {
      setError(requestError.message || "No se pudo eliminar la comida.");
    } finally {
      setBusyAction("");
    }
  };

  const reorderMeals = async (weekday, reorderedMeals) => {
    const previousDays = [...days];
    replaceDayInState(weekday, {
      ...(daysWithFallback.find((day) => day.weekday === weekday) || {}),
      weekday,
      meals: reorderedMeals,
    });

    try {
      clearFeedback();
      setBusyAction(`reorder-${weekday}`);
      const payload = { meal_ids: reorderedMeals.map((meal) => meal.id) };
      const response = await requestJson(
        `${API_URL}/api/diets/${diet.id}/days/${weekday}/reorder?user_id=${userId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      replaceDayInState(weekday, response.day);
    } catch (requestError) {
      setDays(previousDays);
      setError(requestError.message || "No se pudo reordenar la comida.");
    } finally {
      setBusyAction("");
    }
  };

  const copyDayMeals = async () => {
    if (!copySourceWeekday || !copyTargetWeekday) return;
    try {
      clearFeedback();
      setBusyAction(`copy-${copySourceWeekday}-${copyTargetWeekday}`);
      const response = await requestJson(
        `${API_URL}/api/diets/${diet.id}/days/${copySourceWeekday}/copy?user_id=${userId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            target_weekday: copyTargetWeekday,
            replace: true,
          }),
        }
      );
      replaceDayInState(copyTargetWeekday, response.day);
      setStatusMessage(`Se ha copiado ${copySourceWeekday} sobre ${copyTargetWeekday}.`);
      setCopySourceWeekday("");
      setCopyTargetWeekday("");
    } catch (requestError) {
      setError(requestError.message || "No se pudo copiar el día.");
    } finally {
      setBusyAction("");
    }
  };

  const handleMealTemplateUpdatedFromDiet = (freshMeal) => {
    const templateId = freshMeal.id;
    setMealLibrary((prev) => {
      const exists = prev.some((meal) => meal.id === templateId);
      const nextMeals = exists
        ? prev.map((meal) => (meal.id === templateId ? freshMeal : meal))
        : prev;
      return exists ? nextMeals : [...prev, freshMeal].sort((left, right) => left.name.localeCompare(right.name));
    });
    setDays((prev) =>
      prev.map((day) => ({
        ...day,
        meals: (day.meals || []).map((dm) =>
          dm.meal_template_id === templateId || dm.meal_template?.id === templateId
            ? { ...dm, meal_template_id: templateId, meal_template: freshMeal }
            : dm
        ),
      }))
    );
    setEditDayMealContext(null);
    setStatusMessage(`"${freshMeal.name || "Comida"}" actualizada en la dieta y en la biblioteca.`);
    if (onUpdate) onUpdate();
  };

  const handleMealCreated = async (savedMeal) => {
    const targetWeekday = createMealWeekday;
    setCreateMealWeekday("");
    setMealLibrary((prev) => {
      const exists = prev.some((meal) => meal.id === savedMeal.id);
      const nextMeals = exists
        ? prev.map((meal) => (meal.id === savedMeal.id ? savedMeal : meal))
        : [savedMeal, ...prev];
      return nextMeals.sort((left, right) => left.name.localeCompare(right.name));
    });
    if (targetWeekday) {
      await addMealToDay(targetWeekday, savedMeal);
    }
    if (onUpdate) onUpdate();
  };

  if (!diet?.id) return null;

  return (
    <div className="weekly-diet-editor">
      <div className="weekly-editor-topbar card">
        <div>
          <p className="weekly-editor-kicker">Plan semanal</p>
          <h2>Organiza la dieta día por día</h2>
          <p className="text-muted">
            Busca comidas existentes, crea nuevas con sus alimentos y reordénalas con drag and drop.
          </p>
        </div>
        <div className="weekly-editor-topbar-side">
          {loadingMeals && <span className="text-muted">Cargando biblioteca de comidas...</span>}
        </div>
      </div>

      {error && <div className="card error-banner">{error}</div>}
      {statusMessage && <div className="card success-banner">{statusMessage}</div>}

      <div className="modern-diet-days-grid">
        {daysWithFallback.map((day) => (
          <DietDayColumn
            key={day.id || day.weekday}
            day={{ ...day, meals: sortDayMeals(day.meals || []) }}
            searchTerm={searchTerms[day.weekday] || ""}
            onSearchChange={setSearchValue}
            filteredMeals={filteredMealMap[day.weekday] || []}
            onAddMeal={addMealToDay}
            onOpenCreateMeal={setCreateMealWeekday}
            onOpenCopyDay={(weekday) => {
              setCopySourceWeekday(weekday);
              setCopyTargetWeekday("");
            }}
            onDeleteMeal={deleteMealFromDay}
            onEditAssignedMeal={(weekday, assignedMeal) =>
              setEditDayMealContext({ weekday, assignedMeal })
            }
            onReorderMeals={reorderMeals}
            busy={busyAction.startsWith("delete-")}
          />
        ))}
      </div>

      {editDayMealContext?.assignedMeal?.meal_template?.id && (
        <div className="modal-overlay">
          <div className="modal-content modal-content-wide modal-meal-shell">
            <MealEditor
              key={editDayMealContext.assignedMeal.meal_template.id}
              meal={editDayMealContext.assignedMeal.meal_template}
              userId={userId}
              onSaved={handleMealTemplateUpdatedFromDiet}
              onCancel={() => setEditDayMealContext(null)}
              saveButtonLabel="Guardar cambios"
              compact
              modalSubtitle={
                editDayMealContext.weekday
                  ? `${editDayMealContext.weekday.toUpperCase()} - COMIDA DEL PLAN`
                  : ""
              }
              modalTitle="Editar comida"
              modalInfoText="Los cambios aplicados a esta plantilla se verán reflejados en todos los días de esta dieta y en tu biblioteca personal."
            />
          </div>
        </div>
      )}

      {createMealWeekday && (
        <div className="modal-overlay">
          <div className="modal-content modal-content-wide modal-meal-shell">
            <MealEditor
              userId={userId}
              onSaved={handleMealCreated}
              onCancel={() => setCreateMealWeekday("")}
              saveButtonLabel="Guardar y añadir"
              compact
              modalSubtitle={`NUEVA COMIDA PARA ${createMealWeekday.toUpperCase()}`}
              modalTitle="Crear y añadir a la dieta"
              modalInfoText=""
            />
          </div>
        </div>
      )}

      {copySourceWeekday && (
        <div className="modal-overlay">
          <div className="modal-content copy-day-modal">
            <h3>Copiar comidas</h3>
            <p className="text-muted">
              Las comidas de <strong>{copySourceWeekday}</strong> sustituirán por completo el día destino.
            </p>
            <label>
              Día destino
              <select value={copyTargetWeekday} onChange={(event) => setCopyTargetWeekday(event.target.value)}>
                <option value="">Selecciona un día</option>
                {WEEKDAYS.filter((weekday) => weekday !== copySourceWeekday).map((weekday) => (
                  <option key={weekday} value={weekday}>
                    {weekday.charAt(0).toUpperCase() + weekday.slice(1)}
                  </option>
                ))}
              </select>
            </label>
            <div className="modal-actions">
              <button
                type="button"
                onClick={() => {
                  setCopySourceWeekday("");
                  setCopyTargetWeekday("");
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={copyDayMeals}
                disabled={!copyTargetWeekday || busyAction.startsWith("copy-")}
              >
                {busyAction.startsWith("copy-") ? "Copiando..." : "Copiar día"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
