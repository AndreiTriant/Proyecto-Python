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
    <div className="editor-page meal-editor-page">
      <div className="modal-content modal-content-wide modal-meal-shell meal-editor-route-shell">
        <MealEditor
          userId={user?.id}
          onSaved={onSaved}
          onCancel={() => navigate("/comidas")}
          saveButtonLabel="Guardar comida"
          compact
          modalSubtitle="BIBLIOTECA DE COMIDAS"
          modalTitle="Nueva comida"
          modalInfoText="La comida se guarda en tu biblioteca personal. Podrás asignarla a cualquier día de tus dietas."
          modalCloseLabel="← Volver"
        />
      </div>
    </div>
  );
}
