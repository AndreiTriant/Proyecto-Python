import NutritionChart from "../features/progress/NutritionChart";
import WeightTracker from "../features/progress/WeightTracker";

export default function Progreso() {
  return (
    <div className="progreso-page">
      <header className="page-header">
        <h1>Progreso</h1>
      </header>
      <section className="progreso-section">
        <NutritionChart />
      </section>
      <section className="progreso-section">
        <WeightTracker />
      </section>
    </div>
  );
}
