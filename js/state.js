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
    matches: [],      // {id, round, homeId, awayId, homeScore, awayScore, played, stats:{playerId:{goals,assists,yellow,red}}, competitionFormat, bracket}
    settings: { leagueName: 'Pro Soccer Online Uruguay', season: '2026', competitionFormat: null, competitionName: '' }
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
async function safeSet(key, value) {
  if (!online) {
    try { localStorage.setItem(key, value); return true; } catch (e) { return false; }
  }
  try {
    await supaFetch('/rest/v1/kv', {
      method: 'POST',
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
      query: { select: 'value', key: 'eq.' + encodeURIComponent(key) }
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
      query: { key: 'eq.' + encodeURIComponent(key) },
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
      query: { select: 'key', key: 'like.' + encodeURIComponent(prefix) + '%' }
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
    es: 'El servidor superó el límite de correos de confirmación (el registro pide verificar el email y no debería). Avisá al administrador de la liga.',
    pt: 'O servidor excedeu o limite de e-mails de confirmação (o registro pede verificar o e-mail e não deveria). Avise o administrador da liga.'
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

/* upserta la fila en public.users (para que el ranking lo vea) */
async function supaUpsertUser(token, extra) {
  try {
    const me = await supaFetch('/auth/v1/user', { token: token });
    const md = (me.user_metadata || {});
    const row = {
      id: me.id,
      username: md.username,
      display_name: md.display_name || md.username,
      best_streak: extra.best_streak !== undefined ? extra.best_streak : Number(md.best_streak || 0),
      best_penal_streak: extra.best_penal_streak !== undefined ? extra.best_penal_streak : Number(md.best_penal_streak || 0)
    };
    await supaFetch('/rest/v1/users', {
      method: 'POST',
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
         Devolvemos "pendiente" para que el modal se lo explique. */
      if (data && data.user) {
        return { pendingConfirmation: true, email, user: mapAuthUser(data.user), token: null };
      }
      throw new Error(tr('err_bad_credentials'));
    }
    await supaUpsertUser(data.access_token, {});
    return { user: mapAuthUser(data.user), token: data.access_token };
  }

  if (pathStr === '/api/auth/login') {
    const data = await supaFetch('/auth/v1/token?grant_type=password', {
      method: 'POST',
      body: { email: normalizeEmail(body.email), password: body.password }
    });
    if (!data || !data.access_token) throw new Error(tr('err_bad_credentials'));
    await supaUpsertUser(data.access_token, {});
    return { user: mapAuthUser(data.user), token: data.access_token };
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
    if (method === 'POST') {
      if (!token) throw new Error(tr('err_no_auth'));
      const me = await supaFetch('/auth/v1/user', { token: token });
      const cur = Number((me.user_metadata || {}).best_streak || 0);
      const next = Math.max(cur, Number(body.bestStreak || 0));
      await supaUpsertUser(token, { best_streak: next });
      return { user: mapAuthUser({ ...me, user_metadata: { ...(me.user_metadata || {}), best_streak: next } }) };
    }
    const rows = await supaFetch('/rest/v1/users', {
      query: { select: '*', order: 'best_streak.desc,created_at.asc', limit: '50' }
    });
    const ranking = (Array.isArray(rows) ? rows : []).map(r => ({
      id: r.id,
      username: r.username,
      displayName: r.display_name || r.username,
      bestStreak: Number(r.best_streak || 0),
      createdAt: r.created_at
    }));
    return { ranking };
  }

  /* ---------------- RANKING PENALES ---------------- */
  if (pathStr === '/api/ranking/penales') {
    if (method === 'POST') {
      if (!token) throw new Error(tr('err_no_auth'));
      const me = await supaFetch('/auth/v1/user', { token: token });
      const cur = Number((me.user_metadata || {}).best_penal_streak || 0);
      const next = Math.max(cur, Number(body.bestPenalStreak || 0));
      await supaUpsertUser(token, { best_penal_streak: next });
      return { user: mapAuthUser({ ...me, user_metadata: { ...(me.user_metadata || {}), best_penal_streak: next } }) };
    }
    const rows = await supaFetch('/rest/v1/users', {
      query: { select: '*', order: 'best_penal_streak.desc,created_at.asc', limit: '50' }
    });
    const ranking = (Array.isArray(rows) ? rows : []).map(r => ({
      id: r.id,
      username: r.username,
      displayName: r.display_name || r.username,
      bestPenalStreak: Number(r.best_penal_streak || 0),
      createdAt: r.created_at
    }));
    return { ranking };
  }

  throw new Error('Ruta desconocida: ' + path);
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
  if (!online) await loadLocalFallback();
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
      State.data.settings = { ...State.data.settings, ...(parsed.settings || {}) };
    }
  } catch (e) {}
}

function saveLocalFallback() {
  try {
    localStorage.setItem('pso_data_fallback', JSON.stringify(State.data));
  } catch (e) {}
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

    State.data.teams = teams;
    State.data.matches = matches;
    State.data.settings = settings;
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
