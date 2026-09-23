/* ======================================================================
   PSO URUGUAY - ESTADO DE LA APP Y CAPA DE DATOS (SUPABASE DIRECTO)
   ======================================================================
   Estructura 100% estática. La web habla DIRECTO con Supabase
   (PostgREST + Auth), SIN server.js:

     - ONLINE:  el ranking/cuentas/datos viven en Postgres de Supabase y
                se comparten online con todos los jugadores.
     - LOCAL:   sin red (ej: abrir index.html sin internet) → respaldo con
                localStorage del navegador actual.

   No se usa PSO_CONFIG.API_URL acá: se usa SUPABASE_URL + SUPABASE_ANON_KEY
   (pública por diseño, protegida por RLS). La "service_role/secret" NUNCA
   va en el front.
   ====================================================================== */

let dbReady = false;
let online = null;

/* ---------------- Estado global ---------------- */

const State = {
  theme: localStorage.getItem('pso_theme') || 'dark',
  currentTab: 'inicio',
  isAdmin: sessionStorage.getItem('pso_admin') === '1',
  currentStatsTab: 'general',
  currentStatsCompetition: 'todas',
  data: {
    teams: [],       // {id, name, short, logo, color, players:[{id,name}]}
    matches: [],      // {id, round, homeId, awayId, homeScore, awayScore, played, stats:{playerId:{goals,assists,yellow,red}}, competitionId, competitionFormat, bracket}
    competitions: [], // {id, name, type:'liga'|'copa', teamIds:[], season, createdAt}
    palmares: [],     // {id, name, year, logo, players:[{id,name}]} — títulos manuales (solo admin)
    settings: { leagueName: 'Pro Soccer Online Uruguay', season: '2026' }
  }
};

function uid(prefix) {
  return prefix + '_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
}

/* ======================================================================
   CLIENTE SUPABASE (REST directo, sin servidor)
   ====================================================================== */

async function supaFetch(path, options = {}) {
  const { method = 'GET', query, headers = {}, body, token } = options;

  let url = PSO_CONFIG.SUPABASE_URL + path;
  if (query && Object.keys(query).length) {
    const params = new URLSearchParams();
    for (const k in query) if (query[k] !== undefined && query[k] !== '') params.set(k, query[k]);
    const qs = params.toString();
    if (qs) url += (url.includes('?') ? '&' : '?') + qs;
  }

  const h = {
    apikey: PSO_CONFIG.SUPABASE_ANON_KEY,
    Authorization: 'Bearer ' + (token || PSO_CONFIG.SUPABASE_ANON_KEY),
    'Content-Type': 'application/json',
    ...headers
  };

  let res;
  try {
    res = await fetch(url, {
      method,
      headers: h,
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  } catch (e) {
    throw new Error(tr('err_no_server'));
  }

  if (!res.ok) {
    let msg = 'HTTP ' + res.status;
    try {
      const j = await res.json();
      /* GoTrue (Auth) manda el texto en `msg`; PostgREST en `message`. */
      if (j && (j.message || j.msg || j.error_description || j.error)) {
        msg = j.message || j.msg || j.error_description || j.error;
      }
    } catch (e) {}
    throw new Error(localizeServerError(msg));
  }

  const text = await res.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch (e) { return text; }
}

/* ---------------- Detección de conexión ---------------- */

async function detectOnline() {
  try {
    const r = await fetch(PSO_CONFIG.SUPABASE_URL + '/auth/v1/health', {
      headers: { apikey: PSO_CONFIG.SUPABASE_ANON_KEY }
    });
    return r.ok;
  } catch (e) {
    return false;
  }
}

/* ---------------- Capa de almacenamiento (kv ↔ Postgres) ---------------- */

/* safeSet: upsert key/value. Devuelve true si quedó guardado. */
function adminToken() {
  try { return sessionStorage.getItem('pso_admin_token') || null; } catch (e) { return null; }
}

async function safeSet(key, value) {
  if (!online) {
    try { localStorage.setItem(key, value); return true; } catch (e) { return false; }
  }
  try {
    /* Escribir en kv (equipos/partidos/competencias/settings) requiere sesión
       de admin real (Supabase Auth), la RLS de la tabla lo exige. Sin token
       de admin esto devuelve 401/403 de PostgREST. */
    await supaFetch('/rest/v1/kv', {
      method: 'POST',
      token: adminToken(),
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: [{ key, value }]
    });
    return true;
  } catch (e) {
    console.warn('safeSet falló', key, e);
    return false;
  }
}

/* safeGet: lee un valor por key. Devuelve string o null. */
async function safeGet(key) {
  if (!online) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  try {
    const rows = await supaFetch('/rest/v1/kv', {
      query: { select: 'value', key: 'eq.' + key }
    });
    return Array.isArray(rows) && rows.length ? rows[0].value : null;
  } catch (e) {
    return null;
  }
}

async function safeDelete(key) {
  if (!online) {
    try { localStorage.removeItem(key); return true; } catch (e) { return false; }
  }
  try {
    await supaFetch('/rest/v1/kv', {
      method: 'DELETE',
      token: adminToken(),
      query: { key: 'eq.' + key },
      headers: { Prefer: 'count=exact' }
    });
    return true;
  } catch (e) {
    return false;
  }
}

async function safeList(prefix) {
  if (!online) {
    try {
      const out = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(prefix)) out.push(k);
      }
      return out;
    } catch (e) { return []; }
  }
  try {
    const rows = await supaFetch('/rest/v1/kv', {
      query: { select: 'key', key: 'like.' + prefix + '%' }
    });
    return Array.isArray(rows) ? rows.map(r => r.key) : [];
  } catch (e) {
    return [];
  }
}

/* ======================================================================
   API "FICTICIA" PARA EL FRONT (traduce las rutas /api/... a Supabase)
   Mantiene la MISMA interfaz que usaban auth.js / trivia.js / penales.js:
     POST /api/auth/signup  {email,username,password,displayName} → {user, token}
                            (si falta confirmar el email: {pendingConfirmation:true, email})
     POST /api/auth/login   {email,password}                → {user, token}
     GET  /api/me           (token)                         → {user}
     GET  /api/ranking      → {ranking:[{id,username,displayName,bestStreak,createdAt}]}
     POST /api/ranking      (token) {bestStreak}            → {user}
     GET  /api/ranking/penales → {ranking:[{id,username,displayName,bestPenalStreak,createdAt}]}
     POST /api/ranking/penales (token) {bestPenalStreak}    → {user}
   ====================================================================== */

const I18N_SERVER_ERR = {
  'No autorizado. Iniciá sesión.': { es: 'No autorizado. Iniciá sesión.', pt: 'Não autorizado. Faça login.' },
  'El usuario debe tener entre 3 y 20 caracteres (letras, números o _).': { es: 'El usuario debe tener entre 3 y 20 caracteres (letras, números o _).', pt: 'O usuário deve ter entre 3 e 20 caracteres (letras, números ou _).' },
  'La contraseña debe tener al menos 6 caracteres.': { es: 'La contraseña debe tener al menos 6 caracteres.', pt: 'A senha deve ter pelo menos 6 caracteres.' },
  'Ese nombre de usuario ya está en uso.': { es: 'Ese nombre de usuario ya está en uso.', pt: 'Esse nome de usuário já está em uso.' },
  'Usuario o contraseña incorrectos.': { es: 'Usuario o contraseña incorrectos.', pt: 'Usuário ou senha incorretos.' },
  'Usuario no encontrado.': { es: 'Usuario no encontrado.', pt: 'Usuário não encontrado.' },
  'Falta la key.': { es: 'Falta la key.', pt: 'Falta a key.' },

  /* ---- Mensajes que devuelve Supabase Auth (GoTrue), en inglés ---- */
  'Invalid login credentials': { es: 'Usuario o contraseña incorrectos.', pt: 'Usuário ou senha incorretos.' },
  'User already registered': { es: 'Ese nombre de usuario ya está en uso.', pt: 'Esse nome de usuário já está em uso.' },
  'Password should be at least 6 characters.': { es: 'La contraseña debe tener al menos 6 caracteres.', pt: 'A senha deve ter pelo menos 6 caracteres.' },
  'Email not confirmed': { es: 'Falta confirmar el correo de la cuenta (pedile al administrador).', pt: 'Falta confirmar o e-mail da conta (peça ao administrador).' },
  'Signups not allowed for this instance': { es: 'El registro está deshabilitado en el servidor.', pt: 'O registro está desativado no servidor.' },
  'Unable to validate email address: invalid format': { es: 'El nombre de usuario no es válido.', pt: 'O nome de usuário não é válido.' },
  'email rate limit exceeded': {
    es: 'El servidor de correos está saturado: el servicio de prueba solo deja mandar 2 correos por hora. Esperá una hora y reintentá, o pedile al administrador que configure un servidor de correo propio (SMTP).',
    pt: 'O servidor de e-mails está saturado: o serviço de teste só permite 2 e-mails por hora. Espere uma hora e tente novamente, ou peça ao administrador que configure um servidor de e-mail próprio (SMTP).'
  },
  'Email address not authorized': {
    es: 'El servidor de correos todavía es el de prueba y solo puede mandar mails a los administradores del proyecto. Pedile al administrador que configure un servidor de correo propio (SMTP).',
    pt: 'O servidor de e-mails ainda é o de teste e só pode enviar e-mails aos administradores do projeto. Peça ao administrador que configure um servidor de e-mail próprio (SMTP).'
  },
  'Email link is invalid or has expired': {
    es: 'El link del correo ya venció o se usó antes. Entrá con tu email y contraseña, o pedí un correo nuevo.',
    pt: 'O link do e-mail expirou ou já foi usado. Entre com seu e-mail e senha, ou peça um novo e-mail.'
  },
  'Error sending confirmation email': {
    es: 'No se pudo enviar el correo de confirmación: el servicio de correos del sitio está mal configurado. Avisá al administrador de la liga.',
    pt: 'Não foi possível enviar o e-mail de confirmação: o serviço de e-mails do site está mal configurado. Avise o administrador da liga.'
  }
};

/* Índice en minúsculas: GoTrue (Auth) varía el uso de mayúsculas entre versiones. */
const I18N_SERVER_ERR_LC = (() => {
  const out = {};
  for (const k in I18N_SERVER_ERR) out[k.toLowerCase()] = I18N_SERVER_ERR[k];
  return out;
})();

function localizeServerError(msg) {
  if (typeof I18N === 'undefined' || typeof I18N_SERVER_ERR !== 'object') return msg;
  const text = String(msg || '');
  const entry = I18N_SERVER_ERR[text] || I18N_SERVER_ERR_LC[text.toLowerCase()];
  if (!entry) return text;
  const lang = window.I18N ? I18N.lang : 'es';
  return entry[lang] || entry.es || text;
}

/* El jugador se registra con su email real (lo pide el formulario): ese email
   es el que usa Supabase Auth para mandar el link de confirmación. El username
   viaja en user_metadata y es el nombre que se ve en el ranking.
   El email NO se guarda en public.users a propósito: esa tabla la lee
   cualquiera con la anon key y no queremos exponer los correos. */

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function mapAuthUser(authData) {
  const md = (authData && authData.user_metadata) || {};
  return {
    id: authData && (authData.id || authData.sub),
    username: md.username || md.email,
    displayName: md.display_name || md.full_name || md.username,
    bestStreak: Number(md.best_streak || 0),
    bestPenalStreak: Number(md.best_penal_streak || 0),
    createdAt: Date.now()
  };
}

function authToken() {
  try {
    return localStorage.getItem('pso_token') || null;
  } catch (e) { return null; }
}

/* Refresca el access token de Supabase si está por expirar. Los tokens duran
   1 hora y si no se refrescan, el jugador con sesión vieja ya no puede
   guardar puntaje: todo devolvía 401 y el ranking quedaba clavado. */
async function asegurarSesion() {
  const tok = authToken();
  if (!tok) return;
  let expires = 0;
  try { expires = Number(localStorage.getItem('pso_expires') || 0); } catch (e) {}
  if (expires && Date.now() < expires - 5 * 60 * 1000) return;
  let ref = null;
  try { ref = localStorage.getItem('pso_refresh'); } catch (e) {}
  if (!ref) return;
  try {
    const data = await supaFetch('/auth/v1/token?grant_type=refresh', {
      method: 'POST',
      body: { refresh_token: ref }
    });
    if (!data || !data.access_token) return;
    localStorage.setItem('pso_token', data.access_token);
    AuthState.token = data.access_token;
    if (data.refresh_token) localStorage.setItem('pso_refresh', data.refresh_token);
    localStorage.setItem('pso_expires', String(Date.now() + (Number(data.expires_in) || 3600) * 1000));
    if (data.user) {
      const u = mapAuthUser(data.user);
      AuthState.user = u;
      localStorage.setItem('pso_user', JSON.stringify(u));
    }
  } catch (e) { /* sin red o refresh inválido */ }
}

/* upserta la fila en public.users (para que el ranking lo vea) */
async function supaUpsertUser(token, extra) {
  try {
    const me = await supaFetch('/auth/v1/user', { token: token });
    const md = (me.user_metadata || {});
    // verificamos si el usuario ya existe en public.users
    let existing = null;
    try {
      existing = await supaFetch('/rest/v1/users?id=eq.' + encodeURIComponent(me.id), {
        token: token,
        query: { select: 'id,created_at', limit: '1' }
      });
    } catch (e) {
      // si no podemos verificar, asumimos que es nuevo y enviamos created_at
      console.warn('supaUpsertUser: no se pudo verificar existencia, asumiendo nuevo', e);
    }
    const isNew = !Array.isArray(existing) || existing.length === 0;
    const row = {
      id: me.id,
      username: md.username,
      display_name: md.display_name || md.username,
      best_streak: extra.best_streak !== undefined ? extra.best_streak : Number(md.best_streak || 0),
      best_penal_streak: extra.best_penal_streak !== undefined ? extra.best_penal_streak : Number(md.best_penal_streak || 0)
    };
    if (isNew) {
      row.created_at = Date.now();
    } else if (existing.length > 0 && existing[0].created_at) {
      // si ya existe, conservamos su created_at original para evitar conflictos
      row.created_at = existing[0].created_at;
    }
    await supaFetch('/rest/v1/users', {
      method: 'POST',
      token: token,
      headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: [row]
    });
  } catch (e) {
    throw new Error(localizeServerError(e.message));
  }
}

async function apiRequest(path, options = {}) {
  const { method = 'GET', body, auth } = options;
  const pathStr = String(path || '');
  const token = auth ? authToken() : null;

  /* ---------------- AUTH ---------------- */
  if (pathStr === '/api/auth/signup') {
    const email = normalizeEmail(body.email);
    const data = await supaFetch('/auth/v1/signup', {
      method: 'POST',
      body: {
        email,
        password: body.password,
        data: {
          username: String(body.username || '').toLowerCase(),
          display_name: body.displayName || String(body.username),
          best_streak: 0,
          best_penal_streak: 0
        }
      }
    });
    if (!data || !data.access_token) {
      /* Sin token pero con usuario: Supabase creó la cuenta y quedó esperando
         que el jugador confirme el email (por eso todavía no hay sesión).
         OJO: cuando "Confirm email" está ON, /auth/v1/signup NO devuelve
         {user:{...}}, devuelve el objeto de usuario DIRECTO (id, email,
         confirmation_sent_at, etc). Por eso hay que aceptar ambas formas;
         si solo se acepta "data.user" esto cae siempre al error genérico
         de credenciales, aunque el registro y el envío del mail hayan
         funcionado bien (el bug que reportaban). */
      const rawUser = (data && data.user) ? data.user : data;
      if (rawUser && (rawUser.id || rawUser.email)) {
        return { pendingConfirmation: true, email, user: mapAuthUser(rawUser), token: null };
      }
      throw new Error(tr('err_signup_failed'));
    }
    await supaUpsertUser(data.access_token, {});
    return {
      user: mapAuthUser(data.user),
      token: data.access_token,
      refreshToken: data.refresh_token || null,
      expiresAt: Date.now() + (Number(data.expires_in) || 3600) * 1000
    };
  }

  if (pathStr === '/api/auth/login') {
    const data = await supaFetch('/auth/v1/token?grant_type=password', {
      method: 'POST',
      body: { email: normalizeEmail(body.email), password: body.password }
    });
    if (!data || !data.access_token) throw new Error(tr('err_bad_credentials'));
    await supaUpsertUser(data.access_token, {});
    return {
      user: mapAuthUser(data.user),
      token: data.access_token,
      refreshToken: data.refresh_token || null,
      expiresAt: Date.now() + (Number(data.expires_in) || 3600) * 1000
    };
  }

  if (pathStr === '/api/me') {
    if (!token) throw new Error(tr('err_no_auth'));
    const me = await supaFetch('/auth/v1/user', { token: token });
    const user = mapAuthUser(me);
    user.bestStreak = Number((me.user_metadata || {}).best_streak || 0);
    user.bestPenalStreak = Number((me.user_metadata || {}).best_penal_streak || 0);
    return { user };
  }

  /* ---------------- RANKING TRIVIA ---------------- */
  if (pathStr === '/api/ranking') {
    /* El ranking (GET y POST) ahora lo atienden las Pages Functions
       /api/ranking y /api/ranking/penales con la service key: la tabla
       public.users no permite lectura anónima por RLS. */
    throw new Error('Ruta desconocida: ' + path);
  }

  throw new Error('Ruta desconocida: ' + path);
}

/* ======================================================================
   PARTIDAS VALIDADAS EN EL SERVER (anti-trampa)
   Las Pages Functions del propio sitio (/api/game/*) emiten tokens de
   sesión firmados (HMAC) y llevan la racha del lado del server.
   Si el server no está configurado (503 not_configured) los juegos caen
   al flujo legacy de siempre.
   ====================================================================== */
async function gameApi(path, body) {
  await asegurarSesion();
  const token = authToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = 'Bearer ' + token;
  const r = await fetch(path, {
    method: 'POST',
    headers,
    body: JSON.stringify(body || {})
  });
  let data = null;
  try { data = await r.json(); } catch (e) { /* sin cuerpo */ }
  if (!r.ok) {
    const err = new Error((data && data.error) || ('HTTP ' + r.status));
    err.code = data && data.error;
    err.status = r.status;
    throw err;
  }
  return data;
}

/* Llama a una Pages Function del ranking con el token de usuario si hay.
   GET si no va body, POST si va. El server usa la service key, así que
   funciona aunque la RLS no permita acceso anónimo a public.users. */
async function rankingApi(path, body) {
  await asegurarSesion();
  const token = authToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = 'Bearer ' + token;
  const r = await fetch(path, {
    method: body !== undefined ? 'POST' : 'GET',
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  let data = null;
  try { data = await r.json(); } catch (e) { /* sin cuerpo */ }
  if (!r.ok) {
    const err = new Error((data && data.error) || ('HTTP ' + r.status));
    err.code = data && data.error;
    err.status = r.status;
    throw err;
  }
  return data;
}

/* ======================================================================
   INICIALIZACIÓN: detectar online y cargar datos iniciales
   ====================================================================== */

async function detectOnlineAndInit() {
  try {
    online = await detectOnline();
  } catch (e) {
    online = false;
  }
  if (!online) await loadLocalFallback();
  dbReady = true;
}

async function initDB() {
  let detected = false;
  try {
    online = await detectOnline();
    detected = true;
  } catch (e) {
    online = false;
  }
  if (!online) {
    await loadLocalFallback();
  } else {
    // cargar desde Supabase al iniciar cuando hay conexión
    try {
      await refreshFromStorage();
    } catch (e) {
      // si falla, quedarse con lo que haya en memoria (puede ser vacío)
      console.warn('initDB: refreshFromStorage falló al iniciar', e);
    }
    // iniciar heartbeat para revalidar conexión periódicamente
    startHeartbeat();
  }
  dbReady = true;
  return detected;
}

async function loadLocalFallback() {
  try {
    const raw = localStorage.getItem('pso_data_fallback');
    if (raw) {
      const parsed = JSON.parse(raw);
      State.data.teams = parsed.teams || [];
      State.data.matches = parsed.matches || [];
      State.data.palmares = parsed.palmares || [];
      State.data.settings = { ...State.data.settings, ...(parsed.settings || {}) };
    }
  } catch (e) {}
}

function saveLocalFallback() {
  try {
    localStorage.setItem('pso_data_fallback', JSON.stringify(State.data));
  } catch (e) {}
}
/* heartbeat: revalidar conexión periódicamente para detectar cambios
   (ej: usuario que pierde/redobla internet después del init). */
let heartbeatTimer = null;

function startHeartbeat() {
  if (heartbeatTimer) return;
  heartbeatTimer = setInterval(async () => {
    try {
      const wasOnline = online;
      const nowOnline = await detectOnline();
      if (nowOnline !== wasOnline) {
        online = nowOnline;
        console.log('heartbeat: estado de conexión cambiado →', nowOnline ? 'online' : 'offline');
        if (nowOnline) {
          // si volvimos a online, refrescar datos desde Supabase
          try { await refreshFromStorage(); } catch (e) { console.warn('heartbeat refreshFromStorage falló', e); }
          toast(tr('toast_conexion_restaurada'), 'success');
        } else {
          toast(tr('toast_conexion_perdida'), 'warning');
        }
      }
    } catch (e) {
      console.warn('heartbeat detectOnline falló', e);
      online = false;
    }
  }, 15000);
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

async function refreshFromStorage() {
  if (!online) return;
  try {
    const teamRows = await safeList('teams:');
    const teams = [];
    for (const key of teamRows) {
      const rec = await safeGet(key);
      if (rec) { try { teams.push(JSON.parse(rec)); } catch (e) {} }
    }
    const matchRows = await safeList('matches:');
    const matches = [];
    for (const key of matchRows) {
      const rec = await safeGet(key);
      if (rec) { try { matches.push(JSON.parse(rec)); } catch (e) {} }
    }
    const settingsRaw = await safeGet('settings:main');
    const settings = State.data.settings;
    if (settingsRaw) { try { Object.assign(settings, JSON.parse(settingsRaw)); } catch (e) {} }
    const competitions = await getCompetitionsFromStorage();
    const palmares = await getPalmaresFromStorage();

    State.data.teams = teams;
    State.data.matches = matches;
    State.data.settings = settings;
    State.data.competitions = competitions;
    State.data.palmares = palmares;
    if (typeof renderAll === 'function') renderAll();
  } catch (e) {}
}

/* ======================================================================
   PERSISTENCIA DE ENTIDADES (teams / matches / settings)
   ====================================================================== */

async function persistTeam(team) {
  if (online) {
    const ok = await safeSet('teams:' + team.id, JSON.stringify(team));
    if (!ok) { toast(tr('toast_save_team_error'), 'error'); return; }
  }
  const idx = State.data.teams.findIndex(t => t.id === team.id);
  if (idx >= 0) State.data.teams[idx] = team; else State.data.teams.push(team);
  if (!online) saveLocalFallback();
}

async function deleteTeamDB(id) {
  if (online) await safeDelete('teams:' + id);
  State.data.teams = State.data.teams.filter(t => t.id !== id);
  if (!online) saveLocalFallback();
}

async function persistMatch(match) {
  if (online) {
    const ok = await safeSet('matches:' + match.id, JSON.stringify(match));
    if (!ok) { toast(tr('toast_save_match_error'), 'error'); return; }
  }
  const idx = State.data.matches.findIndex(m => m.id === match.id);
  if (idx >= 0) State.data.matches[idx] = match; else State.data.matches.push(match);
  if (!online) saveLocalFallback();
}

function getCompetitionByMatchMatchId(matchId) {
  const match = State.data.matches.find(m => m.id === matchId);
  if (!match || !match.competitionId) return null;
  return getCompetitionById(match.competitionId);
}

async function deleteMatchDB(id) {
  if (online) await safeDelete('matches:' + id);
  State.data.matches = State.data.matches.filter(m => m.id !== id);
  if (!online) saveLocalFallback();
}

async function persistSettings() {
  if (online) {
    await safeSet('settings:main', JSON.stringify(State.data.settings));
  } else {
    saveLocalFallback();
  }
}

/* ---------------- Competencias ---------------- */

async function persistCompetition(comp) {
  if (online) {
    const ok = await safeSet('competitions:' + comp.id, JSON.stringify(comp));
    if (!ok) { toast(tr('toast_save_team_error'), 'error'); return; }
  }
  const idx = State.data.competitions.findIndex(c => c.id === comp.id);
  if (idx >= 0) State.data.competitions[idx] = comp; else State.data.competitions.push(comp);
  if (!online) saveLocalFallback();
}

async function deleteCompetitionDB(id) {
  if (online) await safeDelete('competitions:' + id);
  State.data.competitions = State.data.competitions.filter(c => c.id !== id);
  if (!online) saveLocalFallback();
}

async function getCompetitionsFromStorage() {
  if (!online) return [];
  try {
    const rows = await safeList('competitions:');
    const comps = [];
    for (const key of rows) {
      const rec = await safeGet(key);
      if (rec) { try { comps.push(JSON.parse(rec)); } catch (e) {} }
    }
    return comps;
  } catch (e) { return []; }
}

function getCompetitionById(id) {
  return State.data.competitions.find(c => c.id === id);
}

function getMatchesByCompetition(competitionId) {
  return State.data.matches.filter(m => m.competitionId === competitionId);
}

function getCompetitionMatchesCount(competitionId) {
  return State.data.matches.filter(m => m.competitionId === competitionId).length;
}

/* ---------------- Palmarés manual (solo admin) ---------------- */

async function persistPalmaresEntry(entry) {
  if (online) {
    const ok = await safeSet('palmares:' + entry.id, JSON.stringify(entry));
    if (!ok) { toast(tr('toast_save_team_error'), 'error'); return; }
  }
  const idx = State.data.palmares.findIndex(e => e.id === entry.id);
  if (idx >= 0) State.data.palmares[idx] = entry; else State.data.palmares.push(entry);
  if (!online) saveLocalFallback();
}

async function deletePalmaresEntryDB(id) {
  if (online) await safeDelete('palmares:' + id);
  State.data.palmares = State.data.palmares.filter(e => e.id !== id);
  if (!online) saveLocalFallback();
}

async function getPalmaresFromStorage() {
  if (!online) return State.data.palmares || [];
  try {
    const rows = await safeList('palmares:');
    const out = [];
    for (const key of rows) {
      const rec = await safeGet(key);
      if (rec) { try { out.push(JSON.parse(rec)); } catch (e) {} }
    }
    return out;
  } catch (e) { return []; }
}
