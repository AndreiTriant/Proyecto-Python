import DietManager from "../features/diets/DietManager";

export default function Dietas() {
  return (
    <div className="dietas-page">
      <header className="page-header">
        <h1>Dietas</h1>
      </header>
      <DietManager />
    </div>
  );
}
