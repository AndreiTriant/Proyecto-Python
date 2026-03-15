import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="landing">
      <h1>Dieta MVP</h1>
      <p>Gestiona tus dietas semanales y tu seguimiento nutricional.</p>
      <p>
        <Link to="/registro">Registro</Link> · <Link to="/login">Login</Link>
      </p>
    </div>
  );
}
