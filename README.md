# DIETA MVP

Proyecto fullstack: backend Flask (Python) + frontend React. Base de datos SQLite.

---

## Arrancar el proyecto (ya instalado)

**Opción rápida** (backend + frontend en dos ventanas):

```powershell
.\iniciar_proyecto.ps1
```

→ Backend en **http://127.0.0.1:8080** · Frontend en **http://localhost:3000**

**Manual** — Backend (en una terminal, con el entorno ya creado e instalado):

```powershell
Actualizar dependencias: pip install -r requirements.txt
cd dieta_backend
venv\Scripts\activate
python app.py
```

→ Backend en **http://127.0.0.1:8080**

Si cambias los modelos, usa migraciones:

```powershell
cd dieta_backend
venv\Scripts\activate
python -m flask --app app db migrate -m "descripcion del cambio"
python -m flask --app app db upgrade
```

Para cargar datos de ejemplo:

```powershell
Actualizar dependencias: npm install
cd dieta_backend
venv\Scripts\activate
python seed_data.py
```

Incluye un usuario **demo@example.com** con contraseña **demo**. El script guarda la contraseña con el mismo hash que `/api/login` (`pbkdf2:sha256`). Si en el pasado ejecutaste un seed que guardaba texto plano y el login fallaba, vuelve a ejecutar `python seed_data.py` (corrige el hash del demo).

**Frontend** (en otra terminal):

```powershell
cd dietas_frontend
npm start
```

→ Frontend en **http://localhost:3000**

**Sesión y cookies en desarrollo:** no definas `REACT_APP_API_URL` apuntando a `http://127.0.0.1:8080` si quieres que la cookie de sesión funcione sin complicaciones: usa URLs relativas y el campo `"proxy"` de `dietas_frontend/package.json` (Create React App reenvía `/api` al backend). Abre la app en **http://localhost:3000** (no mezcles con otro host sin leer la sección de autenticación).

---

## Instalación desde cero

### Requisitos

- **Python 3** (recomendado 3.10+)
- **Node.js y npm** (para el frontend)

### 1. Backend (Flask + SQLite)

1. **Comprobar Python**

   ```powershell
   python --version
   ```
   Si no funciona, usa `py --version`. Si solo funciona `py`, añade Python al PATH (Panel de control → Sistema → Variables de entorno → Path) con la ruta de tu instalación, por ejemplo:
   `C:\Users\<TU_USUARIO>\AppData\Local\Programs\Python\Python3xx\` y `...\Python3xx\Scripts\`.

2. **Entrar en la carpeta del backend**

   ```powershell
   cd dieta_backend
   ```

3. **Crear entorno virtual**

   ```powershell
   python -m venv venv
   ```

4. **Activar el entorno virtual**

   ```powershell
   venv\Scripts\activate
   ```

5. **Instalar dependencias**

   Asegúrate de que `requirements.txt` está guardado en **UTF-8**. Luego:

   ```powershell
   python -m pip install -r requirements.txt
   ```

6. **Crear la base de datos y aplicar el esquema inicial (solo la primera vez)**

   ```powershell
   # Dentro de dieta_backend y con el venv activado
   python -m flask --app app db upgrade
   ```

7. **Opcional: insertar datos de ejemplo**

   ```powershell
   python seed_data.py
   ```

8. **Arrancar el backend**

```powershell
python app.py
```

La base de datos está en `dieta_backend/instance/app.db`.
Las tablas se gestionan ahora con **Flask-Migrate** (migraciones Alembic).

### 2. Frontend (React)

1. **Entrar en la carpeta del frontend**

   ```powershell
   cd dietas_frontend
   ```

2. **Instalar dependencias**

   ```powershell
   npm install
   ```

3. **Arrancar el frontend**

   ```powershell
   npm start
   ```

   Se abre el navegador en http://localhost:3000.

---

## Autenticación (sesión en cookie HttpOnly)

El login y el registro crean una **sesión en el servidor**; Flask guarda un identificador en una **cookie firmada y HttpOnly** (el JavaScript del front no puede leerla; reduce riesgo frente a XSS comparado con guardar tokens en `localStorage`).

- **POST** `/api/login` y **POST** `/api/registro` — establecen la cookie de sesión.
- **GET** `/api/me` — devuelve el usuario actual si la cookie es válida.
- **POST** `/api/logout` — cierra sesión y borra la cookie.

Las peticiones al API deben usar **`credentials: "include"`** (en este repo: `apiFetch` en el front); sin eso el navegador no envía la cookie aunque exista.

### Desarrollo local (recomendado)

1. Backend en **http://127.0.0.1:8080** (`python app.py`).
2. Frontend con **`npm start`** en **http://localhost:3000**.
3. **No** pongas en `.env` del front `REACT_APP_API_URL=http://127.0.0.1:8080` salvo que sepas configurar CORS y cookies cross-site: desde `localhost:3000` hacia `127.0.0.1:8080` son orígenes distintos; con `SameSite=Lax` (por defecto) muchos navegadores **no** envían la cookie de sesión en `fetch` y parecerá que no hay login.
4. Deja `REACT_APP_API_URL` vacío: el código usa URLs relativas (`/api/...`). En `dietas_frontend/package.json` está `"proxy": "http://127.0.0.1:8080"`: el dev server de React reenvía esas rutas al Flask; el navegador solo ve **localhost:3000**, así la cookie encaja con `Lax` y la sesión funciona.

### Producción

Define `REACT_APP_API_URL` con la URL pública del API (**HTTPS**). En el backend, por ejemplo:

- `FLASK_SECRET_KEY` (obligatorio; valor largo y aleatorio)
- `FLASK_SESSION_COOKIE_SECURE=true`
- Si front y API están en **dominios distintos**, suele hacer falta `FLASK_SESSION_COOKIE_SAMESITE=None` junto con `Secure` y CORS con orígenes explícitos (nunca `*` con credenciales).

### Datos de ejemplo y contraseña demo

`seed_data.py` crea **demo@example.com** / **demo** usando `generate_password_hash` igual que el registro. Si el login con demo fallaba tras un seed viejo, ejecuta de nuevo `python seed_data.py` para corregir el hash en base de datos.

---

## Estructura del proyecto

- **dieta_backend/** — API Flask, SQLite (SQLAlchemy). Rutas principales:
  - `/`
  - `/api/usuarios`
  - **POST** `/api/registro`
  - **POST** `/api/login`
  - **GET** `/api/me`
  - **POST** `/api/logout`
  - `/api/meals` — plantillas de comida (`meal_templates`; requiere `user_id` vía query o header `X-User-Id`)
  - `/api/meals/<meal_id>`
  - `/api/diet_plans` (requiere `user_id`)
  - `/api/diet_plans/<plan_id>`

  Contraseñas hasheadas (werkzeug), consultas parametrizadas (SQLAlchemy).
- **dietas_frontend/** — React (Create React App), rutas `/`, `/registro`, `/login`. Sin estilos (pendiente para más adelante).

La base de datos está en `dieta_backend/instance/app.db` (no se sube a Git).
Ya no es necesario borrar el fichero para aplicar cambios de esquema: usa migraciones con `flask db migrate` y `flask db upgrade`.
