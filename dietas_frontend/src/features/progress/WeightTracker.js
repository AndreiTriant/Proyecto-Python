import { API_URL } from "../../constantes";
import { apiFetch } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useState, useEffect } from "react";

export default function WeightTracker() {
  const { user } = useAuth();
  const [weights, setWeights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weight, setWeight] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    const to = new Date();
    const from = new Date(to);
    from.setMonth(from.getMonth() - 3);
    const fromStr = from.toISOString().slice(0, 10);
    const toStr = to.toISOString().slice(0, 10);
    apiFetch(
      `${API_URL}/api/weights?user_id=${user.id}&from=${fromStr}&to=${toStr}`
    )
      .then((res) => res.json())
      .then((d) => setWeights(Array.isArray(d) ? d : d.weights || []))
      .catch(() => setWeights([]))
      .finally(() => setLoading(false));
  }, [user?.id]);

  const submitWeight = (e) => {
    e.preventDefault();
    if (!user?.id || !weight) return;
    setSaving(true);
    const today = new Date().toISOString().slice(0, 10);
    apiFetch(`${API_URL}/api/weights?user_id=${user.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: today,
        weight_kg: parseFloat(weight),
        note: note.trim() || null,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.ok !== false && data.id) {
          setWeights((prev) => [{ ...data, date: today }, ...prev]);
          setWeight("");
          setNote("");
        }
      })
      .finally(() => setSaving(false));
  };

  return (
    <div className="card">
      <h3>Peso</h3>
      <form onSubmit={submitWeight} className="weight-form">
        <input
          type="number"
          step="0.1"
          placeholder="Peso (kg)"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
        />
        <input
          type="text"
          placeholder="Nota (opcional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <button type="submit" disabled={saving || !weight}>
          {saving ? "Guardando…" : "Registrar peso"}
        </button>
      </form>
      {loading ? (
        <p>Cargando historial…</p>
      ) : weights.length === 0 ? (
        <p className="text-muted">Aún no hay registros de peso.</p>
      ) : (
        <ul className="weight-list">
          {weights.slice(0, 14).map((w) => (
            <li key={w.id || w.date}>
              {w.date}: {w.weight_kg} kg{w.note ? ` · ${w.note}` : ""}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
