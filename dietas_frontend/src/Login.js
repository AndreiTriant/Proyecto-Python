import { useState } from "react";
import { Link } from "react-router-dom";
import { API_URL, validarEmail } from "./constantes";

function Login() {
  const [email, setEmail] = useState("");
  const [contraseña, setContraseña] = useState("");
  const [mensajeEmail, setMensajeEmail] = useState("");
  const [mensajeContraseña, setMensajeContraseña] = useState("");
  const [mensajeGeneral, setMensajeGeneral] = useState("");
  const [enviado, setEnviado] = useState(false);

  function validarYEnviar(e) {
    e.preventDefault();
    setMensajeEmail("");
    setMensajeContraseña("");
    setMensajeGeneral("");

    let hayError = false;
    const eMail = email.trim().toLowerCase();

    if (!eMail) {
      setMensajeEmail("El correo es obligatorio.");
      hayError = true;
    } else if (!validarEmail(email)) {
      setMensajeEmail("El correo no es válido (debe contener @ y dominio).");
      hayError = true;
    }
    if (!contraseña) {
      setMensajeContraseña("La contraseña es obligatoria.");
      hayError = true;
    }
    if (hayError) return;

    setEnviado(true);
    fetch(`${API_URL}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: eMail, contraseña }),
    })
      .then((res) => res.json().then((data) => ({ status: res.status, data })))
      .then(({ status, data }) => {
        setEnviado(false);
        if (data.ok) {
          setMensajeGeneral("Login correcto. Bienvenido, " + (data.usuario?.usuario || "") + ".");
          return;
        }
        setMensajeGeneral(data.error || "Error al iniciar sesión.");
        if (status === 401) setMensajeGeneral(data.error || "Correo o contraseña incorrectos.");
      })
      .catch(() => {
        setEnviado(false);
        setMensajeGeneral("Error de conexión con el servidor.");
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
          <label htmlFor="login-password">Contraseña</label>
          <input
            id="login-password"
            type="password"
            value={contraseña}
            onChange={(e) => setContraseña(e.target.value)}
            disabled={enviado}
          />
          {mensajeContraseña && <p style={{ color: "red", marginTop: 4 }}>{mensajeContraseña}</p>}
        </div>
        {mensajeGeneral && <p style={{ color: mensajeGeneral.includes("correcto") || mensajeGeneral.includes("Bienvenido") ? "green" : "red", marginTop: 8 }}>{mensajeGeneral}</p>}
        <button type="submit" disabled={enviado}>{enviado ? "Comprobando…" : "Entrar"}</button>
      </form>
      <p><Link to="/registro">No tengo cuenta (Registro)</Link></p>
    </div>
  );
}

export default Login;
