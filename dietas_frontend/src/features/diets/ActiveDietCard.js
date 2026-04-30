import { API_URL } from "../../constantes";
import { apiFetch } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useState, useEffect } from "react";

export default function ActiveDietCard() {
  const { user } = useAuth();
  const [diet, setDiet] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    const url = `${API_URL}/api/diets?user_id=${user.id}`;
    apiFetch(url)
      .then((res) => res.json())
      .then((data) => {
        const active = Array.isArray(data) ? data.find((d) => d.is_active) : null;
        setDiet(active || null);
      })
      .catch(() => setDiet(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const deactivate = () => {
    if (!diet?.id || !user?.id) return;
    apiFetch(`${API_URL}/api/diets/${diet.id}/deactivate?user_id=${user.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
      .then(() => {
        setDiet(null);
      })
      .catch(() => {});
  };

  if (loading) return <div className="card">Cargando dieta activa…</div>;
  if (!diet) {
    return (
      <div className="card card-muted">
        <p>No tienes una dieta activa.</p>
        <p><a href="/dietas">Crear o activar una dieta</a></p>
      </div>
    );
  }
  return (
    <div className="card">
      <h3>Dieta activa</h3>
      <p><strong>{diet.name || "Sin nombre"}</strong></p>
      <button type="button" className="btn-sm" onClick={deactivate}>
        Desactivar
      </button>
    </div>
  );
}
