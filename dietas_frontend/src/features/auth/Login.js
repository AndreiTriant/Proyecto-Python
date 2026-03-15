import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { validarEmail } from "../../constantes";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mensajeEmail, setMensajeEmail] = useState("");
  const [mensajePassword, setMensajePassword] = useState("");
  const [mensajeGeneral, setMensajeGeneral] = useState(null);
  const [enviado, setEnviado] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/dashboard";

  async function validarYEnviar(e) {
    e.preventDefault();
    setMensajeEmail("");
    setMensajePassword("");
    setMensajeGeneral(null);

    let hayError = false;
    const eMail = email.trim().toLowerCase();

    if (!eMail) {
      setMensajeEmail("El correo es obligatorio.");
      hayError = true;
    } else if (!validarEmail(email)) {
      setMensajeEmail("El correo no es válido (debe contener @ y dominio).");
      hayError = true;
    }
    if (!password) {
      setMensajePassword("La contraseña es obligatoria.");
      hayError = true;
    }
    if (hayError) return;

    setEnviado(true);
    const result = await login(eMail, password);
    setEnviado(false);
    if (result.ok) {
      navigate(from, { replace: true });
      return;
    }
    setMensajeGeneral({
      error: true,
      response: result.error || "Error al iniciar sesión.",
    });
  }

  return (
    <div className="auth-page">
      <h1>Login</h1>
      <form onSubmit={validarYEnviar}>
        <div>
          <label htmlFor="login-email">Correo</label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={enviado}
          />
          {mensajeEmail && <p className="error-msg">{mensajeEmail}</p>}
        </div>
        <div>
          <label htmlFor="login-password">Contraseña</label>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={enviado}
          />
          {mensajePassword && <p className="error-msg">{mensajePassword}</p>}
        </div>
        {mensajeGeneral && (
          <p className={mensajeGeneral.error ? "error-msg" : "success-msg"}>
            {mensajeGeneral.response}
          </p>
        )}
        <button type="submit" disabled={enviado}>
          {enviado ? "Comprobando…" : "Entrar"}
        </button>
      </form>
      <p>
        <Link to="/registro">No tengo cuenta (Registro)</Link>
      </p>
    </div>
  );
}
