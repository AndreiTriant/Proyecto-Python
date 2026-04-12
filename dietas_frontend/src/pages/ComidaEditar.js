import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { API_URL } from "../constantes";
import { apiFetch } from "../services/api";
import { useAuth } from "../context/AuthContext";
import MealEditor from "../features/meals/MealEditor";

export default function ComidaEditar() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [meal, setMeal] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id || !id) {
      setLoading(false);
      return;
    }
    apiFetch(`${API_URL}/api/meals/${id}?user_id=${user.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setMeal(null);
        else setMeal(data);
      })
      .catch(() => setMeal(null))
      .finally(() => setLoading(false));
  }, [user?.id, id]);

  if (loading) return <div className="card">Cargando…</div>;
  if (!meal) {
    return (
      <div className="card">
        <p>Comida no encontrada.</p>
        <button type="button" className="btn-ghost" onClick={() => navigate("/comidas")}>
          ← Volver a comidas
        </button>
      </div>
    );
  }

  return (
    <div className="editor-page meal-editor-page">
      <div className="modal-content modal-content-wide modal-meal-shell meal-editor-route-shell">
        <MealEditor
          key={meal.id}
          meal={meal}
          userId={user.id}
          onSaved={() => navigate("/comidas")}
          onCancel={() => navigate("/comidas")}
          saveButtonLabel="Guardar cambios"
          compact
          modalSubtitle="BIBLIOTECA DE COMIDAS"
          modalTitle={meal.name?.trim() ? meal.name : "Editar comida"}
          modalInfoText="Los cambios se guardan en tu biblioteca. Las dietas que usen esta comida mostrarán los valores actualizados."
          modalCloseLabel="← Volver"
        />
      </div>
    </div>
  );
}
