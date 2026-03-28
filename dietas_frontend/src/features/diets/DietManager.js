import { API_URL } from "../../constantes";
import { apiFetch } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

export default function DietManager() {
  const { user } = useAuth();
  const [diets, setDiets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    apiFetch(`${API_URL}/api/diets?user_id=${user.id}`)
      .then((res) => res.json())
      .then((data) => setDiets(Array.isArray(data) ? data : []))
      .catch(() => setDiets([]))
      .finally(() => setLoading(false));
  }, [user?.id]);

  const activate = (id) => {
    apiFetch(`${API_URL}/api/diets/${id}/activate?user_id=${user.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
      .then((res) => res.json())
      .then(() => {
        setDiets((prev) =>
          prev.map((d) => ({ ...d, is_active: d.id === id }))
        );
      });
  };

  if (loading) return <div className="card">Cargando dietas…</div>;

  return (
    <div className="diet-manager">
      <Link to="/dietas/nueva" className="btn-primary">
        Nueva dieta
      </Link>
      {diets.length === 0 ? (
        <div className="card card-muted">
          <p>Aún no has creado tu primera dieta.</p>
          <Link to="/dietas/nueva">Crear dieta</Link>
        </div>
      ) : (
        <ul className="card-list">
          {diets.map((d) => (
            <li key={d.id} className="card">
              <strong>{d.name || "Sin nombre"}</strong>
              {d.is_active && <span className="badge badge-success">Activa</span>}
              {!d.is_active && (
                <button
                  type="button"
                  className="btn-sm"
                  onClick={() => activate(d.id)}
                >
                  Activar
                </button>
              )}
              <Link to={`/dietas/${d.id}`}>Editar</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
