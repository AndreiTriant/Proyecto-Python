# Documentación técnica del proyecto

## Visión general

Este proyecto, nombrado DIETA MVP temporalmente, como su propio nombre indica, es un producto mínimo viable que sigue en desarrollo y cuyas principales funciones son: gestionar dietas semanales, comidas reutilizables, seguimiento diario y progreso de peso.

La aplicación está dividida en dos partes:

- **Backend**: se encarga de la API, la base de datos, la autenticación y las llamadas a IA.
- **Frontend**: se encarga de la interfaz que usa el usuario en el navegador.

## Backend

El backend está hecho con **Flask**, un framework de Python ligero y flexible.

Elegí Flask, aparte de por ser uno de los frameworks vistos en clase, porque permite crear una API de forma clara sin añadir demasiada complejidad. Para un MVP encaja bien porque es rápido de desarrollar y fácil de entender, además de que es un framework bastante popular y era interesante obtener algo de experiencia utilizándolo.

### Base de datos

La base de datos usada es **SQLite**.

SQLite guarda los datos en un archivo local (`dieta_backend/instance/app.db`). Me pareció la mejor opción para un proyecto pequeño en fase inicial porque es muy sencillo y cómodo de utilizar sin instalar un servidor de base de datos aparte. 

Para manejar la base de datos desde Python se usa **SQLAlchemy**, concretamente **Flask-SQLAlchemy**. Esto permite trabajar con modelos de Python en lugar de escribir SQL manualmente todo el tiempo.

También se usa **Flask-Migrate**, que permite gestionar cambios en la estructura de la base de datos mediante migraciones. Esto evita tener que borrar la base de datos cada vez que cambia un modelo. Es muy útil también si se trabaja en equipo, aunque las migraciones no sean necesarias para este desarrollo me pareció interesante añadirlas solamente por eso.

### Autenticación

La autenticación usa sesiones de Flask con una **cookie HttpOnly**.

Esto significa que, cuando el usuario inicia sesión, el navegador guarda una cookie de sesión. 

No se usa `localStorage` para guardar tokens de sesión. La sesión se valida en el backend mediante endpoints como:

- `POST /api/login`
- `POST /api/registro`
- `GET /api/me`
- `POST /api/logout`

### IA con LM Studio

Para la estimación nutricional se usa **LM Studio**.

LM Studio permite ejecutar modelos de lenguaje en local y exponerlos mediante una API compatible con OpenAI. En este proyecto se usa para estimar calorías y macros de una comida a partir del nombre, cantidad y unidad cuando el usuario lo solicita.

La configuración se controla con estas constantes definidas en el .env:

- `AI_PROVIDER`
- `LM_STUDIO_BASE_URL`
- `LM_STUDIO_MODEL`

El backend llama a LM Studio usando `httpx`, una librería de Python para hacer peticiones HTTP.

La IA devuelve una estimación aproximada y el usuario puede revisar o corregir los valores.

## Frontend

El frontend está hecho con **React**.

React permite crear una interfaz dividida en componentes reutilizables. En este proyecto se usa para pantallas como:

- login y registro
- listado y edición de dietas
- biblioteca de comidas
- calendario de seguimiento
- progreso de peso

### Movimiento de comidas en la dieta

En la edición de dietas se usa **dnd-kit (supongo que sea drag and drop, no por el juego de mesa)**.

Esta librería permite arrastrar y soltar elementos en la interfaz. En el proyecto se usa para mover comidas dentro de un día de dieta y reordenarlas de forma visual.

### Gráfica de peso

La gráfica de progreso de peso se hace en el frontend usando **SVG dentro de React**.

## Comunicación entre frontend y backend

El frontend se comunica con el backend mediante llamadas HTTP a rutas `/api/...`.

## Estructura principal

La estructura general es:

- `dieta_backend/`
  - API Flask
  - modelos de base de datos
  - rutas de autenticación, dietas, comidas, IA, progreso y seguimiento
  - migraciones de base de datos
- `dietas_frontend/`
  - aplicación React
  - componentes visuales
  - páginas principales
  - estilos CSS

## Librerías y herramientas destacadas

### Backend

- **Flask**: servidor web y API.
- **Flask-SQLAlchemy**: manejo de base de datos con modelos.
- **Flask-Migrate**: migraciones de base de datos.
- **Werkzeug**: hash de contraseñas.
- **python-dotenv**: carga de variables de entorno.
- **httpx**: llamadas HTTP a servicios externos, como LM Studio.
- **SQLite**: base de datos local.

### Frontend

- **React**: interfaz de usuario.
- **React Router**: navegación entre páginas.
- **dnd-kit**: arrastrar y reordenar comidas.
- **SVG**: gráfica de peso sin librería externa.
- **CSS**: no se usa ningún framework adicional.

