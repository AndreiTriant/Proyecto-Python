import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { API_URL } from "../constantes";
import { apiFetch } from "../services/api";
import { useAuth } from "../context/AuthContext";
import WeeklyDietEditor from "../features/diets/WeeklyDietEditor";

export default function DietaEditar() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [diet, setDiet] = useState(null);
  const [loading, setLoading] = useState(true);

  const refetch = () => {
    if (!user?.id || !id) return;
    apiFetch(`${API_URL}/api/diets/${id}?user_id=${user.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) setDiet(data);
      });
  };

  useEffect(() => {
    if (!user?.id || !id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    apiFetch(`${API_URL}/api/diets/${id}?user_id=${user.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setDiet(null);
        else setDiet(data);
      })
      .catch(() => setDiet(null))
      .finally(() => setLoading(false));
  }, [user?.id, id]);

  if (loading) return <div className="card">Cargando…</div>;
  if (!diet) {
    return (
      <div className="card">
        <p>Dieta no encontrada.</p>
        <button type="button" onClick={() => navigate("/dietas")}>
          Volver a dietas
        </button>
      </div>
    );
  }

  return (
    <div className="editor-page diet-editor-page">
      <header className="page-header">
        <h1>{diet.name || "Editar dieta"}</h1>
        <button type="button" onClick={() => navigate("/dietas")}>
          Volver
        </button>
      </header>
      <WeeklyDietEditor diet={diet} userId={user.id} onUpdate={refetch} />
    </div>
  );
}
