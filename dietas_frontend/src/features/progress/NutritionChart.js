import { API_URL } from "../../constantes";
import { useAuth } from "../../context/AuthContext";
import { useState, useEffect } from "react";

export default function NutritionChart() {
  const { user } = useAuth();
  const [data, setData] = useState([]);

  useEffect(() => {
    if (!user?.id) return;
    const to = new Date();
    const from = new Date(to);
    from.setDate(from.getDate() - 30);
    const fromStr = from.toISOString().slice(0, 10);
    const toStr = to.toISOString().slice(0, 10);
    fetch(
      `${API_URL}/api/progress/overview?user_id=${user.id}&from=${fromStr}&to=${toStr}`
    )
      .then((res) => res.json())
      .then((d) => setData(d.days || d.data || []))
      .catch(() => setData([]));
  }, [user?.id]);

  return (
    <div className="card">
      <h3>Calorías consumidas</h3>
      {data.length === 0 ? (
        <p className="text-muted">No hay datos de progreso en este periodo.</p>
      ) : (
        <div className="chart-placeholder">
          Gráfico temporal (Recharts): {data.length} días de datos
        </div>
      )}
    </div>
  );
}
