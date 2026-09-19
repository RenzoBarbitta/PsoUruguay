# PSO Uruguay — Pro Soccer Online Uruguay

## Qué es esto

Sitio web de la liga **Pro Soccer Online Uruguay**: tabla de posiciones,
fixture, estadísticas de jugadores, palmarés, panel de administración y una
**trivia futbolera con ranking online** que requiere cuenta de usuario.

## Cómo se organiza (arquitectura)

El código ya no vive en un único `index.html`: está dividido por responsabilidad.

```
PsoUruguay/
├── index.html          → solo la estructura (splash + contenedor + carga de archivos)
├── css/
│   └── styles.css      → todos los estilos (variables, componentes, temas)
├── js/
│   ├── logo.js         → logo oficial de PSO Uruguay (base64 embebido)
│   ├── config.js       → credenciales admin y URL de la API
│   ├── trivia-data.js  → banco de preguntas de la trivia
│   ├── state.js        → estado global + capa de datos (servidor o localStorage)
│   ├── compute.js      → lógica pura: tabla, goleadores, asistencias, stats
│   ├── auth.js         → cuentas de usuario, registro/login, acceso admin
│   ├── ui.js           → shell, pestañas, modales, toasts, helpers
│   ├── views.js        → vistas públicas: inicio, fixture, tabla, stats, palmarés
│   ├── trivia.js       → trivia (requiere cuenta) + ranking online dinámico
│   ├── admin.js        → panel de administración (equipos, resultados, sorteo)
│   └── main.js         → inicialización
├── server.js           → servidor Express (API + archivos estáticos)
├── package.json
└── data/               → se crea sola al correr el server (se puede borrar)
```

## Cómo correrlo (modo online)

```bash
npm install
node server.js
```

Después abrí <http://localhost:3000>. El sitio queda **online y compartido**:
los usuarios se crean su cuenta, juegan la trivia y su mejor racha aparece en
un ranking que **se actualiza solo cada 5 segundos** para todos.

Los datos se guardan en la carpeta `data/`:
- `data/users.json` — cuentas de jugadores y mejores rachas (contraseñas con hash).
- `data/kv.json` — equipos, partidos y configuración de la liga.

## API del servidor

| Método | Ruta | Descripción |
| ------ | ---- | ----------- |
| GET  | `/api/health`   | estado del servidor |
| POST | `/api/auth/signup` | crea cuenta `{username, password, displayName}` |
| POST | `/api/auth/login`  | inicia sesión, devuelve token |
| GET  | `/api/me`      | devuelve el usuario autenticado |
| GET  | `/api/ranking` | ranking de trivia ordenado por mejor racha |
| POST | `/api/ranking` | guarda la mejor racha del usuario (requiere token) |
| GET  | `/api/data?key=/prefix=` | lee datos de la liga |
| PUT  | `/api/data`    | guarda datos de la liga `{key, value}` |
| DELETE | `/api/data?key=` | elimina un dato |

Los endpoints `/api/me` y `POST /api/ranking` usan el token en el header
`Authorization: Bearer <token>`.

## Modo sin servidor (respaldo local)

Si abrís `index.html` directo en el navegador (doble clic, `file://`) no hay
servidor, así que el sitio **detecciona la ausencia de API** y usa
`localStorage` de esa computadora. Funciona igual, pero los datos (incluido el
ranking) son solo locales y las cuentas se guardan en ese navegador.

## Panel de administración

Buscá estas líneas en `js/config.js` para cambiarlas:

```js
ADMIN_USER: "admin",
ADMIN_PASS: "pso2026"
```

Entrás desde el candado 🔒 de la barra superior.

## Cuentas de jugador

En la barra superior, el botón 👤 abre el formulario para **ingresar** o
**crear cuenta**. La trivia exige estar con sesión iniciada: así el ranking
sabe quién es cada jugador y guarda su mejor racha online.

## Desplegar en internet

- En cualquier VPS con Node: `npm install && node server.js` (configurá el
  puerto con la variable de entorno `PORT`).
- En plataformas tipo Railway / Render / Fly.io: indicá `node server.js` como
  comando de arranque y usá el puerto que te den con `PORT`.
- Recordá que cada usuario se autentica con su cuenta y el ranking se comparte
  desde `data/users.json`.