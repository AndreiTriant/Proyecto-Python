import MealLibrary from "../features/meals/MealLibrary";

export default function Comidas() {
  return (
    <div className="comidas-page">
      <header className="page-header">
        <h1>Comidas</h1>
      </header>
      <MealLibrary />
    </div>
  );
}
