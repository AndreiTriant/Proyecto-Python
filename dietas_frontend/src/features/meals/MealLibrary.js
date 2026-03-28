import { API_URL } from "../../constantes";
import { apiFetch } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

export default function MealLibrary() {
  const { user } = useAuth();
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    apiFetch(`${API_URL}/api/meals?user_id=${user.id}`)
      .then((res) => res.json())
      .then((data) => setMeals(Array.isArray(data) ? data : []))
      .catch(() => setMeals([]))
      .finally(() => setLoading(false));
  }, [user?.id]);

  if (loading) return <div className="card">Cargando comidas…</div>;

  return (
    <div className="meal-library">
      <Link to="/comidas/nueva" className="btn-primary">
        Nueva comida
      </Link>
      {meals.length === 0 ? (
        <div className="card card-muted">
          <p>Aún no has creado ninguna comida plantilla.</p>
          <Link to="/comidas/nueva">Crear comida</Link>
        </div>
      ) : (
        <ul className="card-list">
          {meals.map((m) => (
            <li key={m.id} className="card">
              <strong>{m.name || "Sin nombre"}</strong>
              <span>
                {m.calories ?? 0} kcal · P {m.protein ?? 0} · G {m.fat ?? 0} · C{" "}
                {m.carbs ?? 0}
              </span>
              <Link to={`/comidas/${m.id}`}>Editar</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
