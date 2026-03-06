# DIETA MVP

Proyecto fullstack: backend Flask (Python) + frontend React. Base de datos SQLite.

---

## Arrancar el proyecto (ya instalado)

**Backend** (en una terminal):

```powershell
cd dieta_backend
venv\Scripts\activate
python app.py
```

→ Backend en **http://127.0.0.1:8080**

**Frontend** (en otra terminal):

```powershell
cd dietas_frontend
npm start
```

→ Frontend en **http://localhost:3000**

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
   pip install -r requirements.txt
   ```

6. **Arrancar el backend**

   ```powershell
   python app.py
   ```

   La primera vez se crea la base de datos en `dieta_backend/instance/app.db` y la tabla `usuarios`.

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

## Estructura del proyecto

- **dieta_backend/** — API Flask, SQLite (SQLAlchemy), rutas `/`, `/api/autor`, `/api/usuarios`.
- **dietas_frontend/** — React (Create React App), consume el backend en el puerto 8080.

La base de datos está en `dieta_backend/instance/app.db` (no se sube a Git).
