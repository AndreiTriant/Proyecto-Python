import { useState } from "react";
import { Link } from "react-router-dom";
import { API_URL, validarEmail } from "./constantes";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mensajeEmail, setMensajeEmail] = useState("");
  const [mensajePassword, setMensajePassword] = useState("");
  const [mensajeGeneral, setMensajeGeneral] = useState(null);
  const [enviado, setEnviado] = useState(false);

  function validarYEnviar(e) {
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
    fetch(`${API_URL}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: eMail, password }),
    })
      .then((res) => res.json().then((data) => ({ status: res.status, data })))
      .then(({ status, data }) => {
        setEnviado(false);
        if (data.ok) {
          setMensajeGeneral({
            error: false,
            response: "Login correcto. Bienvenido, " + (data.usuario?.usuario || "") + ".",
          });
          return;
        }
        setMensajeGeneral({
          error: true,
          response: data.error || "Error al iniciar sesión.",
        });
      })
      .catch(() => {
        setEnviado(false);
        setMensajeGeneral({ error: true, response: "Error de conexión con el servidor." });
      });
  }

  return (
    <div>
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
          {mensajeEmail && <p style={{ color: "red", marginTop: 4 }}>{mensajeEmail}</p>}
        </div>
        <div>
          <label htmlFor="login-password">contraseña</label>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={enviado}
          />
          {mensajePassword && <p style={{ color: "red", marginTop: 4 }}>{mensajePassword}</p>}
        </div>
        {mensajeGeneral && <p style={{ color: mensajeGeneral.error ? "red" : "green", marginTop: 8 }}>{mensajeGeneral.response}</p>}
        <button type="submit" disabled={enviado}>{enviado ? "Comprobando…" : "Entrar"}</button>
      </form>
      <p><Link to="/registro">No tengo cuenta (Registro)</Link></p>
    </div>
  );
}

export default Login;
