import { useState } from "react";
import CalendarTracker from "../features/tracking/CalendarTracker";
import ActiveDietCard from "../features/diets/ActiveDietCard";
import DayCheckinModal from "../features/tracking/DayCheckinModal";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();
  const [openToday, setOpenToday] = useState(false);
  const today = new Date();

  return (
    <div className="dashboard-page">
      <header className="page-header">
        <h1>Inicio</h1>
        <button
          type="button"
          className="btn-primary"
          onClick={() => setOpenToday(true)}
        >
          Registrar hoy
        </button>
      </header>
      <section className="dashboard-section">
        <ActiveDietCard />
      </section>
      <section className="dashboard-section">
        <CalendarTracker />
      </section>
      {openToday && (
        <DayCheckinModal
          date={today}
          userId={user?.id}
          onClose={() => setOpenToday(false)}
          onSaved={() => setOpenToday(false)}
        />
      )}
    </div>
  );
}
