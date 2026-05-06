import { API_URL } from "../../constantes";
import { apiFetch } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useState, useEffect } from "react";
import DayCheckinModal from "./DayCheckinModal";

const WEEKDAYS = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];
const MONTH_FMT = new Intl.DateTimeFormat("es-ES", { month: "long" });

/** Mensajes cortos tipo coach, rotativos por fecha (estables por celda del calendario). */
const TOOLTIP_COACH_BY_STATUS = {
  followed_exact: [
    "¡Muy bien, sigues el plan con constancia!",
    "¡Genial, vas construyendo hábitos que sí se notan!",
    "Buen trabajo, tu compromiso cuenta más de lo que crees.",
    "Perfecto, así se afianza una rutina que perdura.",
    "¡Bravo, mantener el plan también es una gran victoria!",
    "Excelente, cada día bien registrado te acerca a tu objetivo.",
  ],
  followed_other_day: [
    "Muy bien visto, aplicaste otro día del menú sin perder el norte.",
    "Buena adaptación, seguiste la guía usando otro día de la semana.",
    "Inteligente cambio, respetaste el esquema con otro día del plan.",
    "Correcto, alternar el día del menú también es orden con cabeza.",
    "Bien planteado, organizaste el día manteniendo la referencia del plan.",
    "Buen criterio, flexibilidad con límites claros como estos suma.",
  ],
  not_followed: [
    "Menú distinto al plan, pero eso no dice si encajaste tus macros o mejoraste el día.",
    "Puedes haber cambiado el guion y aun así llevar la nutrición muy bien encaminada.",
    "Variaciones del menú cuentan una historia, los números te dirán cómo te fue en conjunto.",
    "Un día distinto puede ser improvisación acertada, no solo desviación.",
    "Registrar cómo comiste aquí importa más que la etiqueta del menú previsto.",
    "A veces sales del plan escrito y aciertas en proteínas, volumen o hidratación igualmente.",
    "Flexibilizar un día puede recargarte la cabeza para volver al plan con más ganas y menos tensión.",
    "Un paréntesis bien vivido a veces es lo que te mantiene firme semanas después, no lo contrario.",
  ],
};

const TOOLTIP_EMPTY_DAY_MESSAGES = [
  "Pulsa el día para contar cómo te fue.",
  "Aquí puedes registrar tu día cuando quieras.",
  "Un tap y dejas constancia de cómo salió.",
  "¿Cómo fue este día? Regístralo cuando te venga bien.",
  "Pequeños registros dan mejor visión de conjunto.",
  "Tu calendario mejora con cada nota que añades.",
];

const TOOLTIP_FALLBACK_MESSAGES = [
  "Aquí tienes lo guardado para ese día.",
  "Este día ya tiene un registro guardado.",
  "Revisa el detalle cuando quieras.",
  "Tu historial de este día está registrado.",
  "Constancia también es mirar atrás con claridad.",
  "Sigue usando el calendario, te ayuda a ordenarte.",
];

const STATUS_META = {
  followed_exact: { label: "Dieta seguida", tone: "green" },
  followed_other_day: { label: "Otro día de dieta", tone: "amber" },
  not_followed: { label: "Fuera del plan", tone: "red" },
};

function pickCoachMessage(messages, seed) {
  if (!messages?.length) return "";
  if (!seed) return messages[0];
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return messages[(h >>> 0) % messages.length];
}

function getDaysInMonth(year, month) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const days = [];
  const startPad = (first.getDay() + 6) % 7;
  for (let i = 0; i < startPad; i++) days.push(null);
  for (let d = 1; d <= last.getDate(); d++) {
    days.push(new Date(year, month, d));
  }
  return days;
}

function isSameCalendarDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function dayKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
}

function weekdayFromDate(day) {
  return WEEKDAYS[(day.getDay() + 6) % 7];
}

function formatNumber(value, digits = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return digits === 0 ? "0" : "0.0";
  return n.toFixed(digits);
}

function formatWeekday(value) {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getCheckinStatus(checkin) {
  return typeof checkin === "string" ? checkin : checkin?.status;
}

function getMealTotals(meals = []) {
  return meals.reduce(
    (totals, meal) => ({
      calories: totals.calories + (Number(meal.calories) || 0),
      protein: totals.protein + (Number(meal.protein) || 0),
      fat: totals.fat + (Number(meal.fat) || 0),
      carbs: totals.carbs + (Number(meal.carbs) || 0),
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0 }
  );
}

function mealTemplateToTooltipMeal(assignedMeal) {
  const meal = assignedMeal?.meal_template || assignedMeal;
  return {
    id: assignedMeal?.id || meal?.id,
    name: meal?.name || "",
    calories: meal?.calories,
    protein: meal?.protein,
    fat: meal?.fat,
    carbs: meal?.carbs,
    notes: meal?.notes || "",
  };
}

function getPlannedMealsForWeekday(activeDiet, weekday) {
  if (!activeDiet || !weekday) return [];
  const day = (activeDiet.days || []).find((item) => item.weekday === weekday);
  return (day?.meals || []).map(mealTemplateToTooltipMeal);
}

function CalendarDayTooltip({ checkin, plannedMeals = [], rotationKey = "" }) {
  const status = getCheckinStatus(checkin);
  if (!status) {
    return (
      <div className="calendar-tooltip" role="tooltip">
        <div className="calendar-tooltip-empty">
          {pickCoachMessage(TOOLTIP_EMPTY_DAY_MESSAGES, rotationKey)}
        </div>
      </div>
    );
  }

  const meta = STATUS_META[status] || { label: "Registro del día", tone: "neutral" };
  const coachPool = TOOLTIP_COACH_BY_STATUS[status];
  const coachLine = coachPool
    ? pickCoachMessage(coachPool, `${rotationKey}:${status}`)
    : pickCoachMessage(TOOLTIP_FALLBACK_MESSAGES, `${rotationKey}:${status}`);
  const manualMeals = Array.isArray(checkin?.meal_logs) ? checkin.meal_logs : [];
  const meals = status === "not_followed" ? manualMeals : plannedMeals;
  const totals = getMealTotals(meals);
  const mealsLabel = status === "not_followed" ? "Tu registro" : "Tu plan";

  return (
    <div className="calendar-tooltip" role="tooltip">
      <div className="calendar-tooltip-head">
        <span className={`calendar-tooltip-status calendar-tooltip-status--${meta.tone}`}>
          {status === "followed_other_day" && checkin?.weekday_used
            ? `Otro día de la dieta: ${formatWeekday(checkin.weekday_used)}`
            : meta.label}
        </span>
        {status !== "followed_other_day" && checkin?.weekday_used ? (
          <span className="calendar-tooltip-used-day">
            {formatWeekday(checkin.weekday_used)}
          </span>
        ) : null}
      </div>

      {coachLine ? <p className="calendar-tooltip-description">{coachLine}</p> : null}

      {meals.length > 0 ? (
        <>
          <div className="calendar-tooltip-section-label">{mealsLabel}</div>
          <div className="calendar-tooltip-totals">
            <strong>{formatNumber(totals.calories)} kcal</strong>
            <span>P {formatNumber(totals.protein)}g</span>
            <span>G {formatNumber(totals.fat)}g</span>
            <span>HC {formatNumber(totals.carbs)}g</span>
          </div>
          <ul className="calendar-tooltip-meals">
            {meals.slice(0, 4).map((meal, index) => (
              <li key={meal.id || `${meal.name}-${index}`}>
                <div className="calendar-tooltip-meal-title">
                  <span>{meal.name || "Comida"}</span>
                  <strong>{formatNumber(meal.calories)} kcal</strong>
                </div>
                <div className="calendar-tooltip-meal-macros">
                  P {formatNumber(meal.protein)}g · G {formatNumber(meal.fat)}g · HC{" "}
                  {formatNumber(meal.carbs)}g
                </div>
                {meal.notes ? <p>{meal.notes}</p> : null}
              </li>
            ))}
          </ul>
          {meals.length > 4 ? (
            <div className="calendar-tooltip-more">+{meals.length - 4} comidas más</div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

export default function CalendarTracker() {
  const { user } = useAuth();
  const [checkins, setCheckins] = useState({});
  const [activeDiet, setActiveDiet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [date] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const year = date.getFullYear();
  const month = date.getMonth();
  const today = new Date();
  const monthLabel = MONTH_FMT.format(date);

  const loadCheckins = () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    const from = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const to = `${year}-${String(month + 1).padStart(2, "0")}-31`;
    const checkinsRequest = apiFetch(`${API_URL}/api/checkins?user_id=${user.id}&from=${from}&to=${to}`)
      .then((res) => res.json())
      .catch(() => []);
    const activeDietRequest = apiFetch(`${API_URL}/api/diets?user_id=${user.id}`)
      .then((res) => res.json())
      .then((diets) => {
        const active = (Array.isArray(diets) ? diets : []).find((diet) => diet.is_active);
        if (!active?.id) return null;
        return apiFetch(`${API_URL}/api/diets/${active.id}?user_id=${user.id}`).then((res) =>
          res.json()
        );
      })
      .catch(() => null);

    Promise.all([checkinsRequest, activeDietRequest])
      .then(([data, diet]) => {
        const map = {};
        (data.checkins || data || []).forEach((c) => {
          map[c.date] = c;
        });
        setCheckins(map);
        setActiveDiet(diet?.ok === false ? null : diet);
      })
      .catch(() => {
        setCheckins({});
        setActiveDiet(null);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCheckins();
  }, [user?.id, year, month]);

  const days = getDaysInMonth(year, month);

  const statusColor = (day) => {
    if (!day) return "";
    const key = dayKey(year, month, day);
    const s = getCheckinStatus(checkins[key]);
    if (s === "followed_exact") return "cal-green";
    if (s === "followed_other_day") return "cal-amber";
    if (s === "not_followed") return "cal-red";
    return "cal-empty";
  };

  const openModal = (day) => {
    if (!day) return;
    setSelectedDay(day);
    setModalOpen(true);
  };

  const onClose = () => {
    setModalOpen(false);
    setSelectedDay(null);
  };

  const onSaved = () => {
    onClose();
    setLoading(true);
    loadCheckins();
  };

  if (loading && Object.keys(checkins).length === 0) {
    return <div className="card">Cargando calendario…</div>;
  }

  return (
    <div className="calendar-tracker">
      <div className="calendar-header">
        <h3 className="calendar-title">
          Calendario <span className="calendar-title-month">{monthLabel}</span>
        </h3>
      </div>
      <div className="calendar-grid">
        {WEEKDAYS.map((d) => (
          <div key={d} className="cal-weekday">
            {d.charAt(0).toUpperCase() + d.slice(1, 3)}
          </div>
        ))}
        {days.map((day, i) => {
          const key = day ? dayKey(year, month, day) : "";
          const checkin = day ? checkins[key] : null;
          const status = getCheckinStatus(checkin);
          const dietWeekday =
            status === "followed_other_day" ? checkin?.weekday_used : day ? weekdayFromDate(day) : "";
          const plannedMeals = getPlannedMealsForWeekday(activeDiet, dietWeekday);
          const col = i % 7;
          return (
            <div
              key={i}
              className={`cal-day ${
                day ? `${statusColor(day)} ${isSameCalendarDay(day, today) ? "cal-today" : ""}` : "cal-out"
              } ${day ? `cal-col-${col}` : ""}`}
              onClick={() => openModal(day)}
              role={day ? "button" : undefined}
              tabIndex={day ? 0 : undefined}
            >
              {day ? (
                <>
                  <span className="cal-day-number">{day.getDate()}</span>
                  <CalendarDayTooltip
                    checkin={checkin}
                    plannedMeals={plannedMeals}
                    rotationKey={key}
                  />
                </>
              ) : (
                ""
              )}
            </div>
          );
        })}
      </div>
      {modalOpen && selectedDay && (
        <DayCheckinModal
          date={selectedDay}
          userId={user?.id}
          currentWeekday={weekdayFromDate(selectedDay)}
          onClose={onClose}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}
