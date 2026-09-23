# PSO Uruguay — Pro Soccer Online Uruguay

## Qué es esto

Sitio web de la liga **Pro Soccer Online Uruguay**: tabla de posiciones, fixture,
estadísticas de jugadores, palmarés, panel de administración y una
**trivia futbolera con ranking online** que requiere cuenta de usuario.

## Cómo se organiza (arquitectura)

El proyecto es **100% estático** (funciona en Cloudflare Pages/Netlify/GitHub Pages).

```
PsoUruguay/
├── index.html          → estructura + carga de archivos JS (orden correcto)
├── css/
│   └── styles.css      → todos los estilos (variables, componentes, temas)
├── js/
│   ├── logo.js         → logo oficial de PSO Uruguay (base64 embebido)
│   ├── config.js       → credenciales Supabase (URL + anon key)
│   ├── i18n.js         → internacionalización (ES / PT-BR)
│   ├── trivia-data.js  → banco de preguntas de la trivia
│   ├── pasapalabra-data.js → banco de preguntas del pasapalabra diario
│   ├── state.js        → estado global + capa de datos (Supabase directo o localStorage)
│   ├── compute.js      → lógica pura: tabla, goleadores, asistencias, stats
│   ├── auth.js         → cuentas de usuario, registro/login, acceso admin
│   ├── ui.js           → shell, pestañas, modales, toasts, helpers
│   ├── views.js        → vistas públicas: inicio, fixture, tabla, stats, palmarés
│   ├── trivia.js       → trivia (requiere cuenta) + ranking online dinámico
│   ├── admin.js        → panel de administración (equipos, resultados, sorteo)
│   └── main.js         → inicialización
├── supabase-schema.sql → esquema SQL para ejecutar en Supabase Dashboard
└── .gitignore
```

## Stack actual

- **Frontend**: app **React + Vite** (`src/`) sobre una capa legacy en `public/js*`
  (datos, Supabase y lógica de negocio que la app consume vía `window`).
  Se builda con `npm run build` → `dist/`.
- **Backend**: Supabase (Postgres + Auth vía REST directo desde el navegador)
- **Hosting recomendado**: Cloudflare Pages (ver sección de deploy abajo)
- **RLS**: las políticas de seguridad viven en Supabase (véase `supabase-schema.sql`)

## Cómo probarlo localmente

No hace falta Node. Basta abrir `index.html` en el navegador (doble clic,
`file://`, o `python -m http.server`). El sitio detecta si hay conexión a
Supabase y, si no la hay, cae a `localStorage` automáticamente.

```bash
# Opción A — archivo local (sin servidor web)
open index.html

# Opción B — server local si querés la política de mismo origen tranquila:
cd PsoUruguay
python -m http.server 8000
# abrir http://localhost:8000
```

## Supabase — configuración requerida

1. Creamos un proyecto nuevo en [supabase.com](https://supabase.com).
2. En **Project Settings → API** copiamos:
   - **Project URL**
   - **anon public** key (la "publishable")
3. Pegamos ambos en `js/config.js`:

```js
SUPABASE_URL: "https://tudominio.supabase.co",
SUPABASE_ANON_KEY: "sb_publishable_xxxx",
```

4. Ejecutamos el SQL de `supabase-schema.sql` en:
   **Supabase Dashboard → SQL Editor → Run**.
4b. Después, ejecutamos `supabase-hardening.sql` (idempotente):
   bloquea la escritura del ranking desde el cliente (solo el server de
   partidas puede sumar puntos vía service key) y refuerza la RLS de `kv`.
5. Activamos **Row Level Security (RLS)** en las tablas `users` y `kv`
   (el script ya lo hace).
6. En **Authentication → Sign In / Providers → Email** dejamos **Email** activado
   (email + contraseña) y **"Confirm email" ACTIVADO**.

   Las cuentas se crean con el **email real** que el jugador escribe en el
   formulario (`js/auth.js`). Con "Confirm email" en ON, Supabase manda el
   correo de confirmación y **el jugador no puede iniciar sesión hasta abrirlo**;
   el front se lo avisa en el modal apenas se registra.

   > ⚠ **Para producción hace falta SMTP propio.** El mailer integrado de
   > Supabase es solo para pruebas y tiene **3 restricciones** (documentadas
   > por Supabase): límite de **2 correos por hora**, **solo entrega a los
   > emails del equipo del proyecto** (el resto falla con
   > `Email address not authorized`) y sin garantía de entrega.
   >
   > Opciones de SMTP propio, en `Authentication → Emails → SMTP Settings`:
   >
   > - **Gmail de la liga** — lo más rápido y gratis, **no necesita dominio
   >   propio**: host `smtp.gmail.com`, port `465`, usuario el Gmail completo
   >   y una **contraseña de aplicación** (requiere activar la verificación en
   >   2 pasos). Límite ~500 correos/día.
   > - **Resend / Brevo / SendGrid** — mejor entregabilidad, pero Resend exige
   >   **verificar un dominio propio** (registros MX + SPF + DKIM) y **sin
   >   dominio verificado solo puede enviar a tu propio email**.
   >
   > Después subí el límite en **Authentication → Rate Limits**.

7. Verificamos que las tablas existan y que la API las vea:

```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  -H "apikey: $ANON_KEY" \
  "https://<proyecto>.supabase.co/rest/v1/kv?select=key&limit=1"
#   200 → ok | 404 PGRST205 → falta correr el SQL o recargar el schema cache
```

   Si da `404` con `PGRST205: Could not find the table`, volvé a correr
   `supabase-schema.sql` (es idempotente y termina con
   `notify pgrst, 'reload schema';`).

8. La **contraseña mínima es de 6 caracteres** (política por defecto de
   Supabase Auth). El front valida lo mismo antes de llamar al server
   (`js/auth.js`), así el jugador ve *"La contraseña debe tener al menos 6
   caracteres"* en vez de un `HTTP 422` pelado.
   Si querés permitir contraseñas más cortas: **Authentication → Settings →
   Password requirements → Minimum length**, y bajá el `6` en `js/auth.js`.

## API del frontend (no es un server)

El sitio NO tiene su propio backend: usa Supabase REST directamente desde el
navegador. El mapeo completo está en `js/state.js`:

| Front desea | Llamada real |
| ----------- | ------------ |
| Register    | `POST /auth/v1/signup` |
| Login       | `POST /auth/v1/token` |
| Mi usuario  | `GET /auth/v1/user` |
| Ranking     | `GET /rest/v1/users` (ordenado por best_streak) |
| Guardar racha | `upsert` en `public.users` |

Las credenciales en `config.js` son **públicas por diseño** (son las que
embeddé en el HTML). Están protegidas por RLS.
**Nunca** subas la `service_role` key al repo.

## Panel de administración

Accedés desde el candado 🔒 de la barra superior.

Ya **no** hay usuario/contraseña fijos en el código (antes cualquiera los
veía con "Ver código fuente" y, peor, la tabla `kv` donde viven equipos y
partidos aceptaba escrituras de cualquiera con la anon key, sin login).
Ahora el admin es una cuenta real de Supabase Auth marcada como admin.
Para crearla (una sola vez):

1. **Supabase Dashboard → Authentication → Users → Add user** — cargá un
   email y una contraseña fuerte para el admin.
2. **SQL Editor**, corré (reemplazando el email):
   ```sql
   update auth.users
   set raw_app_meta_data = raw_app_meta_data || '{"is_admin": true}'::jsonb
   where email = 'admin@tudominio.com';
   ```
3. En la web, el candado 🔒 pide ese email + esa contraseña. La RLS de la
   tabla `kv` (ver `supabase-schema.sql`) ahora exige esa marca `is_admin`
   para dejar guardar equipos, partidos, resultados y sorteos — sin eso,
   Supabase rechaza la escritura aunque alguien llame a la API directo.

## Cuentas de jugador

En la barra superior, el botón 👤 abre el formulario para **ingresar** o
**crear cuenta**. El registro pide **usuario, nombre visible, email y
contraseña (6+)**; el email es real y hay que **confirmarlo desde el correo**
antes de poder entrar (así se evita que cualquiera cargue nombres ajenos en el
ranking). El login se hace con **email + contraseña**. La trivia exige estar con
sesión iniciada: así el ranking sabe quién es cada jugador y guarda su mejor
racha online.

## Desplegar en internet

### Cómo funciona el build (hashes automáticos)

El sitio es una **app React montada con Vite**: no se sube el repo directo,
hay que correr el build porque genera `dist/` con todo lo que se va a servir.

`npm run build` (→ `vite build`) hace:

1. Compila `src/` a `dist/assets/index-<hash>.js`, donde el **hash cambia con
   el contenido**: si cambia el código cambia la URL, y el navegador baja la
   versión nueva (cache relief automático del bundle).
2. Copia `public/` verbatim: la capa legacy (`js/`, `css/`, `logo.webp`,
   `google*.html`) y `_headers`.
3. `dist/_headers` (viene de `public/_headers`) define la política de caché:
   - `index.html` y la capa legacy (`/js/*`, `/css/*`) →
     `no-cache` (siempre revalidan contra el ETag de Pages: un deploy nuevo se
     ve **sin `Ctrl+Shift+R`**).
   - `/assets/*` (bundle hasheado), `logo.webp` y `google*.html` →
     `public, max-age=31536000, immutable` (1 año, pero como la URL cambia con
     el contenido, nunca se sirve una versión vieja).

> No hay que tocar hashes a mano jamás: Vite los calcula solo en cada build.

### Cloudflare Pages (recomendado)

```bash
# 1. Nos logueamos en wrangler
npm install -g wrangler   # si no lo tenemos
wrangler login

# 2. Build + publicamos la carpeta dist/
#    --branch main → producción (psouruguay.pages.dev)
#    cualquier otra rama → preview (*.psouruguay.pages.dev)
npm run deploy

#    ... o manualmente:
npm run build
wrangler pages deploy dist --project-name psouruguay --branch main

# 3. (Opcional) Auto-deploy en cada push: conectar el repo de GitHub en
#    Cloudflare Dashboard → Workers & Pages → psouruguay →
#    Settings → Builds & deployments → Connect to Git
#    Repo: RenzoBarbitta/PsoUruguay · Rama: main
#    Build command: npm run build
#    Output directory: /dist
```

> ⚠ **`Output directory` tiene que ser `/dist` sí o sí.** Si el dashboard la
> deja en `/` (raíz), Cloudflare publica el `index.html` del repo — que apunta
> a `/src/main.jsx`, el fuente de Vite que no existe en producción — y el sitio
> queda en blanco. Con `/dist` se sirve el build correcto.
>
> `functions/` queda en la raíz del repo (NO dentro de `dist/`): Cloudflare
> Pages compila las Pages Functions desde la raíz y sube los estáticos desde
> `dist/`.

### Dominio propio (psouruguay.uy) — ajuste obligatorio en el dashboard

En **Cloudflare Dashboard → Caching → Configuration → Browser Cache TTL**,
elegí **"Respect Existing Headers"** (o el valor `0`).

Es la única opción del dashboard que no se puede resolver desde el repo:
Cloudflare, por defecto, **reemplaza el `Cache-Control` del origen** con el
TTL configurado en ese ajuste. Si está en 1 hora / 4 horas / 1 año, el
navegador sirve `index.html` y los assets viejos de caché hasta que venza —
por eso había que apretar `Ctrl+Shift+R`. Con **Respect Existing Headers** el
origen (nuestro `_headers`) manda y el comportamiento queda así:

- HTML nuevo en cuanto navegás (revalida rápido con el ETag → `304`).
- Assets versionados cacheados 1 año en el navegador, pero con **URL nueva
  cuando el contenido cambió** → siempre baja el nuevo.

> Si preferís no tocar ese ajuste global, podés crear una **Cache Rule** para
> el mismo dominio con **Browser TTL = Respect origin** y **Cache key** sin
> ignorar query string (así `?v=` también diferencia en el edge). Lo global
> es más simple.

### Otras opciones estáticas

- **Netlify**: arrastramos la carpeta a Netlify Drop o conectamos GitHub.
- **GitHub Pages**: `Settings → Pages → Source: main branch, /root`.
- **Vercel**: importamos el repo, no hace falta `vercel.json`.

### Dominio propio (psouruguay.uy)

Desde Cloudflare Dashboard:
1. **SSL/TLS → Overview** → Full (strict) recomendado si hay origen.
2. **DNS** → añadimos un `CNAME` o `A` del dominio a Cloudflare Pages.
3. **Rules → Redirect Rules** si queremos que `www` redirija al canonical.

## FAQ

**¿Puedo usar el sitio sin internet?**
Sí. Sin conexión a Supabase, todos los datos (equipos, partidos, ranking)
viven en `localStorage` y son locales a ese navegador. Al volver online se
vuelven a sincronizar si hay cambios.

**¿Qué pasa si Supabase se cae?**
El frontend detecta la caída en `detectOnline()` y sigue funcionando en modo
local. El ranking online deja de actualizarse hasta que Supabase vuelve.

**¿Cómo agrego más preguntas?**
- Trivia: añadí objetos al array `TRIVIA_QUESTIONS` en `js/trivia-data.js`.
- Pasapalabra: añadí entradas en `PASAPALABRA_QUESTIONS` en
  `js/pasapalabra-data.js` (una por letra, en español y portugués).

**¿Puedo cambiar el idioma por defecto?**
Sí — en `js/i18n.js`:

```js
lang: localStorage.getItem('pso_lang') || 'es'   // cambiar 'es' por 'pt'
```
