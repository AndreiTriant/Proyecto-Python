import { useState } from "react";
import { Link } from "react-router-dom";
import { API_URL, USUARIO_MAX_LEN, PASSWORD_MIN_LEN, PASSWORD_MAX_LEN, validarEmail } from "./constantes";

function Registro() {
  const [usuario, setUsuario] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mensajeUsuario, setMensajeUsuario] = useState("");
  const [mensajeEmail, setMensajeEmail] = useState("");
  const [mensajePassword, setMensajePassword] = useState("");
  const [mensajeGeneral, setMensajeGeneral] = useState("");
  const [enviado, setEnviado] = useState(false);

  function validarYEnviar(e) {
    e.preventDefault();
    setMensajeUsuario("");
    setMensajeEmail("");
    setMensajePassword("");
    setMensajeGeneral("");

    let hayError = false;
    const userNormalizado = usuario.trim();
    const emailNormalizado = email.trim().toLowerCase();

    if (userNormalizado.length === 0) {
      setMensajeUsuario("El usuario es obligatorio.");
      hayError = true;
    } else if (userNormalizado.length > USUARIO_MAX_LEN) {
      setMensajeUsuario(`El usuario no puede superar ${USUARIO_MAX_LEN} caracteres.`);
      hayError = true;
    }
    if (emailNormalizado.length === 0) {
      setMensajeEmail("El correo es obligatorio.");
      hayError = true;
    } else if (!validarEmail(emailNormalizado)) {
      setMensajeEmail("El correo no es válido (debe contener @ y dominio).");
      hayError = true;
    }
    if (password.length < PASSWORD_MIN_LEN) {
      setMensajePassword(`La Password debe tener al menos ${PASSWORD_MIN_LEN} caracteres.`);
      hayError = true;
    } else if (password.length > PASSWORD_MAX_LEN) {
      setMensajePassword(`La Password no puede superar ${PASSWORD_MAX_LEN} caracteres.`);
      hayError = true;
    }
    if (hayError) return;

    setEnviado(true);
    fetch(`${API_URL}/api/registro`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuario: userNormalizado, email: emailNormalizado, password: password }),
    })
      .then((res) => res.json().then((data) => ({ status: res.status, data })))
      .then(({ status, data }) => {
        setEnviado(false);
        if (data.ok) {
          setMensajeGeneral("Registro correcto. Ya puedes iniciar sesión.");
          setUsuario("");
          setEmail("");
          setPassword("");
          return;
        }
        setMensajeGeneral(data.error || "Error en el registro.");
        if (status === 409 && (data.error || "").toLowerCase().includes("correo")) {
          setMensajeEmail(data.error);
        }
      })
      .catch(() => {
        setEnviado(false);
        setMensajeGeneral("Error de conexión con el servidor.");
      });
  }

  return (
    <div>
      <h1>Registro</h1>
      <form onSubmit={validarYEnviar}>
        <div>
          <label htmlFor="reg-usuario">Usuario: </label>
          <input
            id="reg-usuario"
            type="text"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            maxLength={USUARIO_MAX_LEN + 1}
            disabled={enviado}
          />
          {mensajeUsuario && <p style={{ color: "red", marginTop: 4 }}>{mensajeUsuario}</p>}
        </div>
        <div>
          <label htmlFor="reg-email">Correo: </label>
          <input
            id="reg-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={enviado}
          />
          {(mensajeEmail && !mensajeGeneral) && <p style={{ color: "red", marginTop: 4 }}>{mensajeEmail}</p>}
        </div>
        <div>
          <label htmlFor="reg-password">Contraseña: </label>
          <input
            id="reg-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            maxLength={PASSWORD_MAX_LEN + 1}
            disabled={enviado}
          />
          {(mensajePassword && !mensajeGeneral) && <p style={{ color: "red", marginTop: 4 }}>{mensajePassword}</p>}
        </div>
        {mensajeGeneral && <p style={{ color: mensajeGeneral.includes("correcto") ? "green" : "red", marginTop: 8 }}>{mensajeGeneral}</p>}
        <button type="submit" disabled={enviado}>{enviado ? "Enviando…" : "Crear cuenta"}</button>
      </form>
      <p><Link to="/login">Ya tengo cuenta (Login)</Link></p>
    </div>
  );
}

export default Registro;
