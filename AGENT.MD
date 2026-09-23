# AGENT.MD — PSO Uruguay (Pro Soccer Online Uruguay)

> Guia para agentes IA (y humanos) que trabajen en este repo.
> Leer este archivo antes de tocar codigo.

## 1. Que es

Sitio de la liga **Pro Soccer Online Uruguay**: tabla de posiciones,
fixture, estadisticas, palmares, panel admin y **3 juegos con ranking
online** (trivia, pasapalabra diario, penales). Repo
`RenzoBarbitta/PsoUruguay`, rama `main`. Prod: `https://psouruguay.uy`
(Cloudflare Pages `psouruguay`).

## 2. Stack

| Capa | Tecnologia |
|---|---|
| Frontend | **React 19 + Vite 8 + Motion + lucide-react** en `src/`. La capa legacy se sirve **verbatim** como scripts classicos en `public/js/` (datos, estado, auth, compute, i18n, puente) y React se monta al final |
| Estilos | Un solo `css/styles.css` (variables + temas dark/light + estilos legacy y de los componentes React) |
| Datos liga | Supabase (Postgres via PostgREST + Auth, REST directo del navegador) con fallback a `localStorage` |
| Anti-trampa | Cloudflare Pages Functions (`functions/`) validan partidas y escriben ranking con service key |
| i18n | ES default / PT-BR, diccionario en `public/js/i18n.js`, helper `tr(clave)` (React usa `t('clave')` que llama a `tr`) |
| Deploy | `npm run build` (Vite) -> `wrangler pages deploy dist` |

## 3. Estructura del repo

```
PsoUruguay/
├── AGENT.MD, README.md        → este archivo (agentes) y docs usuario/deploy
├── index.html                 → entrada Vite: meta/fonts/splash + scripts classicos + /src/main.jsx
├── vite.config.mjs            → base '/', target es2019, outDir dist
├── public/                    → archivos servidos verbatim (se copian a dist/) — docs: favicon/img de index.html, RAIZ del dominio
│   ├── logo.webp              → favicon + og:image (debe quedar en RAIZ de dist)
│   ├── google7cb43165a7bd622a.html → verificacion Search Console
│   ├── css/styles.css         → TODOS los estilos (legacy + React; srve verbatim)
│   └── js/                    → LOGICA LEGACY (globales, NO tocar estructura):
│       logo.js config.js i18n.js competencias.js trivia-data.js
│       pasapalabra-data.js state.js compute.js auth.js bridge.js
└── public/_headers            → politica de cache (index/js/css no-cache; assets/logo/google immutable)
├── src/                       → React (ver §4)
├── js/legacy/                 → REFERENCIA SOLO (codigo DOM viejo: ui, views, trivia,
│                               pasapalabra, penales, admin, main) — no se carga
├── functions/                 → Pages Functions anti-trampa (ver §5), quedan en RAIZ
│   ├── lib/game.mjs, lib/trivia-answers.mjs  → ver §5
│   └── api/...                → ranking/start/answer/kick/finish
├── supabase-schema.sql, supabase-hardening.sql → esquema + hardening RLS
├── dist/                      → GENERADO por Vite, no editar, ignorado en git
└── package.json               → scripts dev/build/deploy
```

Orden de carga en `index.html` (NO cambiar): `logo → config → i18n →
competencias → trivia-data → pasapalabra-data → state → compute → auth →
bridge` y luego el modulo `/src/main.jsx`.

## 4. Frontend (`public/js/*` globales + `src/*` React)

### Capa legacy (globales, cargada siempre)
- **logo.js** → `window.PSO_LOGO_URL` (base64). Todo `<img>` del logo usa esa variable.
- **config.js** → `PSO_CONFIG` con `SUPABASE_URL` + `SUPABASE_ANON_KEY` (publica por diseño, protegida por RLS).
- **i18n.js** → `I18N.dic` ES/PT, `tr(key, vars)`, `setLang/syncLangUI`, idioma en `pso_lang`. Toda cadena visible VA por `tr()` (React: `t()` en `src/core/ui.jsx`).
- **state.js** → `State` global (`theme`, `currentTab`, `currentAdminTab`, `currentStatsCompetition`, `isAdmin` (sessionStorage), `data:{teams,matches,competitions,palmares,settings}`); `supaFetch/apiRequest/gameApi/rankingApi`; `detectOnline/initDB/refreshFromStorage`; CRUD kv (`uid`, `safeGet/Set/Delete/List`, `persistTeam/persistMatch/persistCompetition/persistSettings/persistPalmaresEntry` y `delete*`, `getCompetitionMatchesCount`, `getLocalUsers/saveLocalUsers`); `authToken/adminToken/normalizeEmail`; `getTeamById` está en compute.js.
- **compute.js** → puras: `computeStandings(f)` (3/1/0, desempate pts→DG→GF→nombre), `computeTopScorers/TopAssists/TopSaves`, `computeAllPlayerStats` (solo convocados en `lineup`), `computePalmares`, `getTeamById`, `hasActiveLigas` (competencias.js), `generateCopaBracket/nextPowerOfTwo`.
- **auth.js** → `AuthState` en localStorage (`pso_token/pso_user/...`); `doSignup/doLoginUser/logoutUser/handleAuthRedirect`, modo local `pso_local_users`, `localFindUser`; `openAuthModal/openLoginModal` legacy (React usa sus propios modales, mismos helpers).
- **bridge.js** → `window.psoBus` (`on/emit`) y stubs: `toast/renderAll/switchTab/renderShell/renderMainContent` emiten eventos; `window.PSO_GAMES = {trivia, pasapalabra, penales}` con `jugando` (estado por partida) — los juegos React registran su `.stop()` ahi.

### Capa React (`src/`)
- `src/main.jsx` → monta `<App/>` (sin StrictMode).
- `src/core/app.jsx` → `AppProvider`: estado `tab`, `v` (bump por bus `data-updated`), `ready`, `modales`, `toasts`; boot (theme → splash logo → `setLang` → `initDB` → `handleAuthRedirect` → `/api/me` si session); auto-refresh 25s (pausa con modal/admin/partida en curso via `PSO_GAMES.*.jugando`); `switchTab` con guard admin; `toggleTheme/changeLang/doLogout` (detiene juegos vía `PSO_GAMES.*.stop()`); `ToastHost`, `ModalHost` (Escape/overlay), `ConfirmModal`, helper `c`.
- `src/core/ui.jsx` → `useData/useAuth` (leen los globales y re-renderan con `v`), `t`, `initialsOf`, `TeamDot`, `EmptyState`, `SectionHead`, `fadeUp/fadeIn/spring`, `View`, `RankItem`.
- `src/App.jsx` → shell (`Topbar` + `TabsNav` + `<View>` router + Footer).
- `src/components/` → `Topbar` (marca, idioma, Discord `https://discord.gg/3HymNM8XB3`), `TabsNav` (tabla solo si `hasActiveLigas()`), `MatchCard` (`MatchCard`, `BracketMatchCard`, `matchScheduledLabel`, `bracketRoundName`).
- `src/views/` → `Inicio`, `Fixture` (ligas por fechas + copas por llaves + fallbacks legacy), `Tabla` (solo ligas), `Estadisticas` (general/goleadores/asistencias/atajadas + filtro), `Planteles`, `Palmares` (años + modal admin con crop de logo 400x400 webp), `Seleccion` (cinematica), `Juegos` (hub).
- `src/games/` → `Trivia.jsx` (singleton `PSO_GAMES.trivia`, flujo server `gameApi('/api/game/start|answer|finish')` con fallback local, ranking 5s, exporta `ConfirmGameModal`, `RankRow`); `Pasapalabra.jsx` (rosca A-Z diaria FNV-1a, 120s, 2 vueltas, resume `pso_rosco`); `Penales.jsx` (timer por refs DOM, `gameApi('/api/game/start|kick|finish')`, ranking 5s).
- `src/admin/` → `AuthModal.jsx` (`LoginModal` con `initialTab`, `AdminLoginView` via `supaFetch('/auth/v1/token?grant_type=password')` y `is_admin`); `AdminPanel.jsx` (subtabs equipos/resultados/competencias/config; usa los `persist*` globales; `generateRoundRobin` ida/vuelta y `maybeAdvanceCopaRounds`/`declareChampion` portados al modulo).

### Contrato React ↔ legacy
- Se accede a los globales **por identificador pelado** (`State`, `AuthState`, `online`, `tr`, `getTeamById`, ...). Los `const/let` top-level de un `<script>` clasico son bindings del global lexical (alcanzables desde modulos) y Vite no renombra identificadores libres. `window.*` solo donde el legacy ya lo expuso (`PSO_LOGO_URL`, `PSO_CONFIG`, `psoBus`, `PSO_GAMES`).
- `State.data` es la unica fuente: equipos `{id,name,short,logo,players[]}`, partidos `{id,round,homeId,awayId,homeScore,awayScore,played,stats,competitionId,competitionFormat,bracket,bracketRound,bracketSlot,totalBracketRounds,scheduledDate,scheduledTime,lineup,lineupPositions}`, competencias `{id,name,type:'liga'|'copa',teamIds,season,createdAt}`, settings `{leagueName,season,competitionName,competitionFormat,navMsg}`.
- Los `persist*` mutan `State.data` en memoria Y guardan (Supabase si online + fallback localStorage). Despues de persistir, emitir `window.psoBus.emit('data-updated')` para que React re-render si es necesario.

## 5. Backend server (Functions anti-trampa)

Stateless, sin KV: estado de la partida viaja firmado HMAC-SHA256 dentro del token (`payload_b64.sig_b64`). Constantes en `lib/game.mjs`: `MIN_GAP_TRIVIA_MS=1000`, `MIN_GAP_KICK_MS=250`, `SESSION_TTL_MS=45min`, `MAX_SCORE=500` (penales cap 100).

| Endpoint | Metodo | Auth | Que hace |
|---|---|---|---|
| `/api/game/start` | POST `{game:'trivia'\|'penales'}` | JWT Supabase | Verifica usuario, emite token sesion (trivia incluye `q` = indice pregunta random) |
| `/api/game/answer` | POST `{token,a}` | token sesion | Valida respuesta vs `TRIVIA_ANSWERS`; piso anti-bot 1000ms; acierto → score+1 y `next`; fallo → `over:true` |
| `/api/game/kick` | POST `{token,result}` | token sesion | `gol` suma; piso 250ms; limite 100 tiros (`max_penales`); `over` si no-gol o limite |
| `/api/game/finish` | POST `{token}` | JWT + token (mismo `u`) | Guarda racha server (`state.s`, max con previo) vía service key; devuelve `{score,user}` |
| `/api/ranking` | GET → ranking trivia; POST `{token}` guarda score trivia validado | GET: nada; POST: JWT | Lee/escribe `best_streak` con service key |
| `/api/ranking/penales` | igual para penales (`best_penal_streak`, cap 100) | igual | idem |

Secretos Pages (env, `wrangler pages secret put`): `GAME_SESSION_SECRET` (siempre) + `SUPABASE_SERVICE_KEY` (para escribir ranking; sin ella → `503 not_configured` y el front usa flujo legacy).

## 6. Supabase

- **Tablas** (`supabase-schema.sql`): `kv(key TEXT PK, value TEXT, updated_at)` = liga; `users(id=auth.uid, username UNIQUE, display_name, best_streak, best_penal_streak, created_at)` = ranking.
- **Hardening** (`supabase-hardening.sql`): lectura publica / escritura solo admin (kv) y solo fila propia con rachas forzadas (users); trigger `pso_clamp_best_streaks()`.
- **Admin**: crear usuario en Auth → `update auth.users set raw_app_meta_data ||= '{"is_admin":true}' where email=...`.
- **Jugadores**: Email provider ON + **Confirm email ON** (SMTP propio).
- **Diagnostico**: `curl -H "apikey: $ANON_KEY" ".../rest/v1/kv?select=key&limit=1"` → 200 ok; 404 PGRST205 → re-correr schema.

## 7. Build, dev y deploy

- `npm run dev` → Vite dev server (globals de `public/js` servidos como estaticos).
- `npm run dev:full` = build + `wrangler pages dev dist` (Functions incluidas).
- `npm run build` → `vite build` (React). Copia `public/` verbatim (js clasicos, css, `_headers`, webp, google html). `index.html` referencia `/css/styles.css` y `/js/*` — por eso deben vivir en `public/`.
- `npm run preview` → `vite preview`.
- `npm run deploy` = build + `wrangler pages deploy dist --project-name psouruguay --branch main`. `functions/` queda en RAIZ (Pages lo compila) — nunca dentro de `dist/`.
- **Dashboard**: Caching → Browser Cache TTL = **Respect Existing Headers**. Dominio `psouruguay.uy`: SSL Full (strict), CNAME a Pages, redirect www→canonical.
- `dist/` y `.wrangler/` ignorados en git. No tocar `_headers` a mano fuera de `public/_headers`.

## 8. Flujos de desarrollo

- **Local sin backend**: `npm run dev` (Vite, hot reload; NO abrir `index.html` directo ni con Live Server: los scripts legacy están en `public/` y `main.jsx` es JSX que necesita Vite). Para probar el build: `npm run build` + `npm run preview` (o `python -m http.server dist`).
- **Agregar pregunta trivia** (ES+PT): `public/js/trivia-data.js` → `node scripts/gen-trivia-answers.mjs` → verificar `functions/lib/trivia-answers.mjs`.
- **Agregar rosca pasapalabra**: `public/js/pasapalabra-data.js` en ambos idiomas (misma letra inicial).
- **Cambiar estilos**: solo `public/css/styles.css`; respeta variables y tokens `[data-theme]`.
- **Nuevo texto visible**: agregar clave ES+PT en `public/js/i18n.js` y usar `tr()`/`t()`.
- **Probar**: `npm run build` (falla si hay syntax/import errors); revisar dist. No hay suite de tests del frontend.

## 9. Reglas para agentes (obligatorias)

1. NO reordenar los `<script>` clasicos de `index.html`; la capa legacy NO se toca salvo i18n (`public/js/i18n.js`, solo agregar claves) y `public/js/bridge.js`.
2. NO romper el contrato de datos: equipos/partidos/competencias/settings tienen la forma documentada en §4; SIEMPRE usar `persist*`/`delete*` para escrituras.
3. NO commitear `dist/`, `.wrangler/`, `node_modules/`, ni NUNCA la `service_role`/secret key.
4. NO editar `functions/lib/trivia-answers.mjs` a mano (usar el generador).
5. Todo dato de usuario renderizado pasa por `escapeHtml()` (disponible global); toda cadena UI por `tr()` en ES+PT.
6. Ranking: el cliente NUNCA declara score — solo tokens de sesion firmados; el maximo lo aplica server+trigger DB.
7. RLS: no relajar policies; el hardening es la ultima barrera.
8. Los juegos exponen su `stop()` en `window.PSO_GAMES.<juego>` (lo llama `doLogout` y no debe dejar timers vivos al desmontar).
9. Tras cambiar JS/CSS: `npm run build` antes de deployar; verificar `dist/_headers`.
10. Commits en español, descriptivos (`area: que cambia`, ej. `penales: ...`, `trivia: ...`, `seleccion: ...`, `seguridad: ...`, `fixture: ...`).
11. Antes de dar por terminado: releer archivos editados y validar con `npm run build`.

## 10. Referencias

- `README.md` (operativa completa: Supabase paso a paso, SMTP, FAQ), `supabase-*.sql`, `package.json` (scripts), `public/_headers` (cache), `.qodo/` (workflows).