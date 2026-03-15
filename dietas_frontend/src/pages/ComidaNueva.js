import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import MealEditor from "../features/meals/MealEditor";

export default function ComidaNueva() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const onSaved = (savedMeal) => {
    if (savedMeal?.id) navigate(`/comidas/${savedMeal.id}`);
    else navigate("/comidas");
  };

  return (
    <div className="editor-page">
      <header className="page-header">
        <h1>Nueva comida</h1>
        <button type="button" onClick={() => navigate("/comidas")}>
          Volver
        </button>
      </header>
      <MealEditor userId={user?.id} onSaved={onSaved} onCancel={() => navigate("/comidas")} />
    </div>
  );
}
