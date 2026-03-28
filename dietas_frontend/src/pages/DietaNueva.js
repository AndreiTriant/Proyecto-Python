import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../constantes";
import { apiFetch } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function DietaNueva() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("Mi dieta");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = (e) => {
    e.preventDefault();
    if (!user?.id) return;
    setSaving(true);
    setError("");
    apiFetch(`${API_URL}/api/diets?user_id=${user.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() || "Mi dieta" }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.id) {
          navigate(`/dietas/${data.id}`);
          return;
        }
        setError(data.error || "Error al crear.");
      })
      .catch(() => setError("Error de conexión"))
      .finally(() => setSaving(false));
  };

  return (
    <div className="editor-page">
      <h1>Nueva dieta</h1>
      <form onSubmit={submit}>
        <label>
          Nombre
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Mi dieta"
          />
        </label>
        {error && <p className="error-msg">{error}</p>}
        <div className="form-actions">
          <button type="button" onClick={() => navigate("/dietas")}>
            Cancelar
          </button>
          <button type="submit" disabled={saving}>
            {saving ? "Creando…" : "Crear"}
          </button>
        </div>
      </form>
    </div>
  );
}
