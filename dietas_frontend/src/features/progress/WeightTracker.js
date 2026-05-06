import { API_URL } from "../../constantes";
import { apiFetch } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useMemo, useState, useEffect } from "react";

const KG_TO_LB = 2.2046226218;
const UNIT_OPTIONS = [
  { value: "metric", label: "Métrico", short: "kg" },
  { value: "us", label: "Estadounidense", short: "lb" },
];

function getUnitMeta(unitSystem) {
  return UNIT_OPTIONS.find((u) => u.value === unitSystem) || UNIT_OPTIONS[0];
}

function toDisplayWeight(weightKg, unitSystem) {
  const value = Number(weightKg);
  if (!Number.isFinite(value)) return 0;
  return unitSystem === "us" ? value * KG_TO_LB : value;
}

function toKg(weightValue, unitSystem) {
  const value = Number(weightValue);
  if (!Number.isFinite(value)) return 0;
  return unitSystem === "us" ? value / KG_TO_LB : value;
}

function formatWeight(weightKg, unitSystem, digits = 1) {
  const unit = getUnitMeta(unitSystem).short;
  return `${toDisplayWeight(weightKg, unitSystem).toFixed(digits)} ${unit}`;
}

function formatDateLabel(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

function formatDateLong(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function sortAscending(entries) {
  return [...entries].sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

function WeightChart({ entries, unitSystem }) {
  const sortedEntries = sortAscending(entries);
  const values = sortedEntries.map((entry) => toDisplayWeight(entry.weight_kg, unitSystem));
  const unit = getUnitMeta(unitSystem).short;

  if (sortedEntries.length === 0) {
    return (
      <div className="weight-chart-empty">
        Registra tu primer peso para empezar a ver la evolución.
      </div>
    );
  }

  const width = 840;
  const height = 185;
  const pad = { top: 14, right: 24, bottom: 32, left: 46 };
  const plotWidth = width - pad.left - pad.right;
  const plotHeight = height - pad.top - pad.bottom;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const lower = min - range * 0.12;
  const upper = max + range * 0.12;
  const chartRange = upper - lower || 1;

  const points = values.map((value, index) => {
    const x =
      sortedEntries.length === 1
        ? pad.left + plotWidth / 2
        : pad.left + (index / (sortedEntries.length - 1)) * plotWidth;
    const y = pad.top + ((upper - value) / chartRange) * plotHeight;
    return { x, y, value, entry: sortedEntries[index] };
  });

  const linePath = points.map((p) => `${p.x},${p.y}`).join(" ");
  const areaPath =
    points.length > 1
      ? `${points.map((p, index) => `${index === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")} L ${points[points.length - 1].x
      } ${pad.top + plotHeight} L ${points[0].x} ${pad.top + plotHeight} Z`
      : "";
  const first = points[0];
  const last = points[points.length - 1];
  const yTicks = [upper, (upper + lower) / 2, lower];

  return (
    <div className="weight-chart-card">
      <svg className="weight-chart" viewBox={`0 0 ${width} ${height}`} role="img">
        <title>Evolución del peso</title>
        <defs>
          <linearGradient id="weightAreaGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#5d5fef" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#5d5fef" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {yTicks.map((tick) => {
          const y = pad.top + ((upper - tick) / chartRange) * plotHeight;
          return (
            <g key={tick}>
              <line x1={pad.left} x2={width - pad.right} y1={y} y2={y} className="weight-grid-line" />
              <text x={pad.left - 12} y={y + 4} className="weight-axis-label" textAnchor="end">
                {tick.toFixed(1)}
              </text>
            </g>
          );
        })}

        {areaPath ? <path d={areaPath} className="weight-area" /> : null}
        {points.length > 1 ? (
          <polyline points={linePath} className="weight-line" />
        ) : (
          <line
            x1={pad.left}
            x2={width - pad.right}
            y1={first.y}
            y2={first.y}
            className="weight-line weight-line-single"
          />
        )}

        {points.map((point) => (
          <g key={point.entry.id || point.entry.date} className="weight-point-group">
            <circle cx={point.x} cy={point.y} r="5.5" className="weight-point" />
            <title>
              {formatDateLong(point.entry.date)}: {point.value.toFixed(1)} {unit}
            </title>
          </g>
        ))}

        {first ? (
          <text x={first.x} y={height - 13} className="weight-axis-label" textAnchor="middle">
            {formatDateLabel(first.entry.date)}
          </text>
        ) : null}
        {last && last !== first ? (
          <text x={last.x} y={height - 13} className="weight-axis-label" textAnchor="middle">
            {formatDateLabel(last.entry.date)}
          </text>
        ) : null}
      </svg>
    </div>
  );
}

export default function WeightTracker() {
  const { user } = useAuth();
  const [weights, setWeights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weight, setWeight] = useState("");
  const [unitSystem, setUnitSystem] = useState("metric");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    const to = new Date();
    const from = new Date(to);
    from.setMonth(from.getMonth() - 6);
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

  const sortedWeights = useMemo(() => sortAscending(weights), [weights]);
  const latest = sortedWeights[sortedWeights.length - 1];
  const first = sortedWeights[0];
  const previous = sortedWeights[sortedWeights.length - 2];
  const deltaTotal = latest && first ? latest.weight_kg - first.weight_kg : 0;
  const deltaLast = latest && previous ? latest.weight_kg - previous.weight_kg : 0;
  const unitMeta = getUnitMeta(unitSystem);

  const submitWeight = (e) => {
    e.preventDefault();
    if (!user?.id || !weight) return;
    const weightKg = toKg(weight, unitSystem);
    if (!weightKg || weightKg <= 0) return;
    setSaving(true);
    const today = new Date().toISOString().slice(0, 10);
    apiFetch(`${API_URL}/api/weights?user_id=${user.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: today,
        weight_kg: weightKg,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.ok !== false && data.id) {
          setWeights((prev) => [data, ...prev]);
          setWeight("");
        }
      })
      .finally(() => setSaving(false));
  };

  return (
    <div className="weight-panel">
      <div className="weight-hero">
        <div>
          <p className="weight-kicker">Seguimiento corporal</p>
          <h3>Peso</h3>
        </div>
        <div className="unit-toggle" role="group" aria-label="Sistema de unidades">
          {UNIT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={unitSystem === option.value ? "unit-toggle-active" : ""}
              onClick={() => setUnitSystem(option.value)}
            >
              <strong>{option.short}</strong>
            </button>
          ))}
        </div>
      </div>

      <div className="weight-content-grid">
        <form onSubmit={submitWeight} className="weight-entry-card">
          <div>
            <span className="weight-card-label">Nuevo registro</span>
            <label className="weight-input-label">
              Peso
              <div className="weight-input-wrap">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder={unitSystem === "us" ? "180.0" : "82.0"}
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                />
                <span>{unitMeta.short}</span>
              </div>
            </label>
          </div>
          <button type="submit" className="btn-primary" disabled={saving || !weight}>
            {saving ? "Guardando…" : "Registrar peso"}
          </button>
        </form>

        <div className="weight-stats">
          <div className="weight-stat-card weight-stat-card-primary">
            <span>Peso actual</span>
            <strong>{latest ? formatWeight(latest.weight_kg, unitSystem) : "Sin datos"}</strong>
            {latest ? <small>{formatDateLong(latest.date)}</small> : <small>Registra tu primer peso</small>}
          </div>
          <div className="weight-stat-card">
            <span>Desde el primer registro</span>
            <strong>
              {latest && first
                ? `${deltaTotal >= 0 ? "+" : ""}${toDisplayWeight(deltaTotal, unitSystem).toFixed(1)} ${unitMeta.short
                }`
                : "0.0"}
            </strong>
          </div>
          <div className="weight-stat-card">
            <span>Último cambio</span>
            <strong>
              {latest && previous
                ? `${deltaLast >= 0 ? "+" : ""}${toDisplayWeight(deltaLast, unitSystem).toFixed(1)} ${unitMeta.short
                }`
                : "0.0"}
            </strong>
            <small>{previous ? `Desde ${formatDateLabel(previous.date)}` : "Necesitas 2 registros"}</small>
          </div>
        </div>
      </div>

      {loading ? (
        <p className="weight-loading">Cargando historial…</p>
      ) : weights.length === 0 ? (
        <WeightChart entries={[]} unitSystem={unitSystem} />
      ) : (
        <>
          <WeightChart entries={weights} unitSystem={unitSystem} />
          <div className="weight-history-card weight-history-card-compact">
            <div className="weight-history-head">
              <h4>Últimos registros</h4>
              <span>{weights.length} en 6 meses</span>
            </div>
            <ul className="weight-list">
              {[...weights].slice(0, 5).map((w) => (
                <li key={w.id || w.date}>
                  <span>{formatDateLong(w.date)}</span>
                  <strong>{formatWeight(w.weight_kg, unitSystem)}</strong>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
