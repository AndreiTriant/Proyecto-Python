import { API_URL } from "../../constantes";
import { useAuth } from "../../context/AuthContext";
import { useState, useEffect } from "react";
import DayCheckinModal from "./DayCheckinModal";

const WEEKDAYS = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];

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

export default function CalendarTracker() {
  const { user } = useAuth();
  const [checkins, setCheckins] = useState({});
  const [loading, setLoading] = useState(true);
  const [date] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const year = date.getFullYear();
  const month = date.getMonth();

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    const from = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const to = `${year}-${String(month + 1).padStart(2, "0")}-31`;
    fetch(`${API_URL}/api/checkins?user_id=${user.id}&from=${from}&to=${to}`)
      .then((res) => res.json())
      .then((data) => {
        const map = {};
        (data.checkins || data || []).forEach((c) => {
          map[c.date] = c.status || c;
        });
        setCheckins(map);
      })
      .catch(() => setCheckins({}))
      .finally(() => setLoading(false));
  }, [user?.id, year, month]);

  const days = getDaysInMonth(year, month);

  const statusColor = (day) => {
    if (!day) return "";
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
    const s = checkins[key];
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
    const from = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const to = `${year}-${String(month + 1).padStart(2, "0")}-31`;
    fetch(`${API_URL}/api/checkins?user_id=${user.id}&from=${from}&to=${to}`)
      .then((res) => res.json())
      .then((data) => {
        const map = {};
        (data.checkins || data || []).forEach((c) => {
          map[c.date] = c.status || c;
        });
        setCheckins(map);
      })
      .finally(() => setLoading(false));
  };

  if (loading && Object.keys(checkins).length === 0) {
    return <div className="card">Cargando calendario…</div>;
  }

  return (
    <div className="calendar-tracker">
      <h3>Calendario</h3>
      <div className="calendar-grid">
        {WEEKDAYS.map((d) => (
          <div key={d} className="cal-weekday">
            {d.charAt(0).toUpperCase() + d.slice(1, 3)}
          </div>
        ))}
        {days.map((day, i) => (
          <div
            key={i}
            className={`cal-day ${day ? statusColor(day) : "cal-out"}`}
            onClick={() => openModal(day)}
            role={day ? "button" : undefined}
          >
            {day ? day.getDate() : ""}
          </div>
        ))}
      </div>
      {modalOpen && selectedDay && (
        <DayCheckinModal
          date={selectedDay}
          userId={user?.id}
          onClose={onClose}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}
