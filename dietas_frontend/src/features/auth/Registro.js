import { useState } from "react";
import { Link } from "react-router-dom";
import { API_URL, USUARIO_MAX_LEN, PASSWORD_MIN_LEN, PASSWORD_MAX_LEN, validarEmail } from "../../constantes";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../services/api";

function Registro() {
  const { refreshUser } = useAuth();
  const [usuario, setUsuario] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [mensajeUsuario, setMensajeUsuario] = useState("");
  const [mensajeEmail, setMensajeEmail] = useState("");
  const [mensajePassword, setMensajePassword] = useState("");
  const [mensajePasswordConfirm, setMensajePasswordConfirm] = useState("");
  const [mensajeGeneral, setMensajeGeneral] = useState("");
  const [cuentaCreada, setCuentaCreada] = useState(false);
  const [enviado, setEnviado] = useState(false);

  function validarYEnviar(e) {
    e.preventDefault();
    setMensajeUsuario("");
    setMensajeEmail("");
    setMensajePassword("");
    setMensajePasswordConfirm("");
    setMensajeGeneral("");
    setCuentaCreada(false);

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
      setMensajePassword(`La contraseña debe tener al menos ${PASSWORD_MIN_LEN} caracteres.`);
      hayError = true;
    } else if (password.length > PASSWORD_MAX_LEN) {
      setMensajePassword(`La contraseña no puede superar ${PASSWORD_MAX_LEN} caracteres.`);
      hayError = true;
    } else if (password !== passwordConfirm) {
      setMensajePasswordConfirm("Las contraseñas no coinciden.");
      hayError = true;
    }
    if (hayError) return;

    setEnviado(true);
    apiFetch(`${API_URL}/api/registro`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        usuario: userNormalizado,
        email: emailNormalizado,
        password,
      }),
    })
      .then((res) => res.json().then((data) => ({ status: res.status, data })))
      .then(async ({ status, data }) => {
        setEnviado(false);
        if (data.ok) {
          // El backend ya abre sesión (cookie); sincronizamos el contexto sin recargar la página.
          await refreshUser();
          setCuentaCreada(true);
          setMensajeGeneral("Cuenta creada. Ya has iniciado sesión.");
          setUsuario("");
          setEmail("");
          setPassword("");
          setPasswordConfirm("");
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
    <div className="auth-page">
      <h1>Registro</h1>
      <form onSubmit={validarYEnviar}>
        <div>
          <label htmlFor="reg-usuario">Usuario</label>
          <input
            id="reg-usuario"
            type="text"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            maxLength={USUARIO_MAX_LEN + 1}
            disabled={enviado}
          />
          {mensajeUsuario && <p className="error-msg">{mensajeUsuario}</p>}
        </div>
        <div>
          <label htmlFor="reg-email">Correo</label>
          <input
            id="reg-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={enviado}
          />
          {mensajeEmail && !mensajeGeneral && <p className="error-msg">{mensajeEmail}</p>}
        </div>
        <div>
          <label htmlFor="reg-password">Contraseña</label>
          <input
            id="reg-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            maxLength={PASSWORD_MAX_LEN + 1}
            disabled={enviado}
            autoComplete="new-password"
          />
          {mensajePassword && !mensajeGeneral && <p className="error-msg">{mensajePassword}</p>}
        </div>
        <div>
          <label htmlFor="reg-password-confirm">Confirmar contraseña</label>
          <input
            id="reg-password-confirm"
            type="password"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            maxLength={PASSWORD_MAX_LEN + 1}
            disabled={enviado}
            autoComplete="new-password"
          />
          {mensajePasswordConfirm && !mensajeGeneral && (
            <p className="error-msg">{mensajePasswordConfirm}</p>
          )}
        </div>
        {mensajeGeneral && (
          <p className={cuentaCreada ? "success-msg" : "error-msg"}>{mensajeGeneral}</p>
        )}
        {cuentaCreada && (
          <p>
            <Link to="/dashboard">Ir al panel</Link>
          </p>
        )}
        <button type="submit" disabled={enviado}>
          {enviado ? "Enviando…" : "Crear cuenta"}
        </button>
      </form>
      <p>
        <Link to="/login">Ya tengo cuenta (Login)</Link>
      </p>
    </div>
  );
}

export default Registro;
