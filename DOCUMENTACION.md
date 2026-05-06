# Documentación técnica del proyecto

Este documento resume, con lenguaje sencillo, las tecnologías usadas en **DIETA MVP** y por qué encajan en el proyecto.

## Visión general

DIETA MVP es una aplicación web para gestionar dietas semanales, comidas reutilizables, seguimiento diario y progreso de peso.

La aplicación está dividida en dos partes:

- **Backend**: se encarga de la API, la base de datos, la autenticación y las llamadas a IA.
- **Frontend**: se encarga de la interfaz que usa el usuario en el navegador.

## Backend

El backend está hecho con **Flask**, un framework de Python ligero y flexible.

Se eligió Flask porque permite crear una API de forma clara sin añadir demasiada complejidad. Para un MVP encaja bien porque es rápido de desarrollar, fácil de entender y suficiente para organizar rutas como:

- login y registro
- dietas
- comidas
- seguimiento diario
- progreso de peso
- estimación nutricional con IA

### Base de datos

La base de datos usada es **SQLite**.

SQLite guarda los datos en un archivo local (`dieta_backend/instance/app.db`). Es una buena elección para este proyecto porque:

- no necesita instalar un servidor de base de datos aparte
- es fácil de mover y probar
- simplifica el desarrollo del MVP
- funciona bien para una aplicación pequeña o en fase inicial

Para manejar la base de datos desde Python usamos **SQLAlchemy**, concretamente **Flask-SQLAlchemy**. Esto permite trabajar con modelos de Python en lugar de escribir SQL manualmente todo el tiempo.

También se usa **Flask-Migrate**, que permite gestionar cambios en la estructura de la base de datos mediante migraciones. Esto evita tener que borrar la base de datos cada vez que cambia un modelo.

### Autenticación

La autenticación usa sesiones de Flask con una **cookie HttpOnly**.

Esto significa que, cuando el usuario inicia sesión, el navegador guarda una cookie de sesión. Esa cookie no se lee desde JavaScript, lo que ayuda a reducir riesgos frente a ciertos ataques como XSS.

No se usa `localStorage` para guardar tokens de sesión. La sesión se valida en el backend mediante endpoints como:

- `POST /api/login`
- `POST /api/registro`
- `GET /api/me`
- `POST /api/logout`

### IA con LM Studio

Para la estimación nutricional se usa **LM Studio**.

LM Studio permite ejecutar modelos de lenguaje en local y exponerlos mediante una API compatible con OpenAI. En este proyecto se usa para estimar calorías y macros de una comida a partir del nombre, cantidad y unidad cuando el usuario lo solicita.

La configuración se controla con variables como:

- `AI_PROVIDER`
- `LM_STUDIO_BASE_URL`
- `LM_STUDIO_MODEL`

El backend llama a LM Studio usando `httpx`, una librería de Python para hacer peticiones HTTP.

La IA no sustituye al usuario: devuelve una estimación aproximada y el usuario puede revisar o corregir los valores.

## Frontend

El frontend está hecho con **React**.

React permite crear una interfaz dividida en componentes reutilizables. En este proyecto se usa para pantallas como:

- login y registro
- listado y edición de dietas
- biblioteca de comidas
- calendario de seguimiento
- progreso de peso

La app está creada con **Create React App** (`react-scripts`), que simplifica la configuración inicial del frontend.

### Rutas

Para navegar entre pantallas se usa **React Router**.

Gracias a esto, la aplicación tiene rutas como:

- `/dashboard`
- `/dietas`
- `/dietas/:id`
- `/comidas`
- `/progreso`

### Movimiento de comidas en la dieta

En la edición de dietas se usa **dnd-kit**.

Esta librería permite arrastrar y soltar elementos en la interfaz. En el proyecto se usa para mover comidas dentro de un día de dieta y reordenarlas de forma visual.

Es útil porque el usuario puede organizar su dieta de una forma más natural que usando botones de subir/bajar.

### Gráfica de peso

La gráfica de progreso de peso se hace en el frontend usando **SVG dentro de React**.

No se ha añadido una librería externa de gráficas para esta parte. La gráfica se dibuja con elementos SVG como líneas, puntos y áreas. Esto mantiene el proyecto más ligero y permite controlar el diseño sin depender de una librería adicional.

El peso se guarda internamente en kg, pero la interfaz permite mostrarlo y registrarlo en:

- kg
- lb

Cuando el usuario usa lb, el frontend convierte el valor a kg antes de enviarlo al backend.

## Comunicación entre frontend y backend

El frontend se comunica con el backend mediante llamadas HTTP a rutas `/api/...`.

Hay un helper llamado `apiFetch` que envía las cookies de sesión automáticamente con `credentials: "include"`. Esto es importante porque la sesión depende de la cookie de Flask.

En desarrollo, el frontend usa el campo `proxy` del `package.json` para reenviar llamadas `/api` al backend Flask. Así se evitan muchos problemas con cookies entre `localhost` y `127.0.0.1`.

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
- **CSS propio**: estilos personalizados sin framework visual pesado.

## Decisiones importantes

### SQLite para el MVP

Se usa SQLite porque reduce la complejidad inicial. Para una versión más grande o con muchos usuarios, se podría migrar a PostgreSQL u otra base de datos más robusta.

### Sesiones con cookie HttpOnly

Se prefirió una cookie de sesión frente a guardar tokens en el navegador. Es una opción sencilla y razonablemente segura para este tipo de aplicación.

### IA local con LM Studio

LM Studio permite probar IA sin depender necesariamente de un servicio externo. Además, facilita cambiar de modelo configurando el nombre del modelo en el entorno.

### Gráfica de peso sin librería externa

La gráfica actual es sencilla y no necesita interacciones complejas. Por eso se implementa con SVG directamente en React. Si en el futuro se necesitan tooltips avanzados, zoom o varias series de datos, se podría valorar una librería como Chart.js o Recharts.

## Posibles mejoras futuras

Algunas mejoras razonables para una siguiente versión serían:

- migrar la base de datos a PostgreSQL si el proyecto crece
- añadir tests automáticos de backend y frontend
- mejorar la validación de datos en formularios complejos
- añadir más estadísticas de progreso
- permitir objetivos de peso o macros
- mejorar el despliegue para producción
- separar mejor configuración de desarrollo y producción

## Resumen

El proyecto usa tecnologías sencillas y adecuadas para un MVP:

- Flask para la API
- React para la interfaz
- SQLite para guardar datos sin complicar el entorno
- SQLAlchemy y migraciones para gestionar modelos
- dnd-kit para mover comidas visualmente
- LM Studio para estimaciones nutricionales con IA
- SVG en React para la gráfica de peso

La idea general ha sido mantener el proyecto entendible, funcional y fácil de evolucionar.