/* ======================================================================
   PSO URUGUAY - ESTADO DE LA APP Y CAPA DE DATOS
   ======================================================================
   Dos modos posibles:
   - ONLINE:  se detecta un servidor (server.js) en /api → todo se guarda
              en el backend y se comparte entre todos los usuarios.
   - LOCAL:   sin servidor (ej: abrir index.html directo) → respaldo con
              localStorage del navegador actual.
   ====================================================================== */

let dbReady = false;
let online = false;

const State = {
  theme: localStorage.getItem('pso_theme') || 'light',
  isAdmin: sessionStorage.getItem('pso_admin') === '1',
  currentTab: 'inicio',
  currentAdminTab: 'resultados',
  currentStatsTab: 'general',
  currentStatsCompetition: 'todas',
  data: {
    teams: [],       // {id, name, short, color, players:[{id,name}]}
    matches: [],      // {id, round, homeId, awayId, homeScore, awayScore, played, stats:{playerId:{goals,assists,yellow,red}}}
    settings: { leagueName: 'Pro Soccer Online Uruguay', season: '2026', competitionFormat: null, competitionName: '' }
  }
};

function uid(prefix) {
  return prefix + '_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
}

/* ---------------- Cliente API (online) ---------------- */

const I18N_SERVER_ERR = {
  'No autorizado. Iniciá sesión.': 'Não autorizado. Faça login.',
  'El usuario debe tener entre 3 y 20 caracteres (letras, números o _).': 'O usuário deve ter entre 3 e 20 caracteres (letras, números ou _).',
  'La contraseña debe tener al menos 4 caracteres.': 'A senha deve ter pelo menos 4 caracteres.',
  'Ese nombre de usuario ya está en uso.': 'Esse nome de usuário já está em uso.',
  'Usuario o contraseña incorrectos.': 'Usuário ou senha incorretos.',
  'Usuario no encontrado.': 'Usuário não encontrado.',
  'Falta la key.': 'Falta a key.'
};

function localizeServerError(msg) {
  if (I18N.lang === 'pt' && I18N_SERVER_ERR[msg]) return I18N_SERVER_ERR[msg];
  return msg;
}

async function apiRequest(path, options = {}) {
  const { auth, body, method = 'GET' } = options;
  const headers = { ...(options.headers || {}) };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = localStorage.getItem('pso_token');
  if (auth && token) headers['Authorization'] = 'Bearer ' + token;

  let res;
  try {
    res = await fetch(PSO_CONFIG.API_URL + path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  } catch (e) {
    throw new Error(tr('err_no_server'));
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error((data && data.error && localizeServerError(data.error)) || tr('err_server', { status: res.status }));
  return data;
}

async function detectOnline() {
  try {
    const res = await fetch(PSO_CONFIG.API_URL + '/api/health', { method: 'GET' });
    return res.ok;
  } catch (e) {
    return false;
  }
}

/* ---------------- Capa de almacenamiento ---------------- */

async function safeGet(key) {
  if (online) {
    try {
      const r = await apiRequest('/api/data?key=' + encodeURIComponent(key));
      return r.value != null ? r.value : null;
    } catch (e) {
      return null;
    }
  }
  try {
    return localStorage.getItem(key);
  } catch (e) {
    return null;
  }
}

async function safeSet(key, value) {
  if (online) {
    try {
      await apiRequest('/api/data', { method: 'PUT', body: { key, value } });
      return true;
    } catch (e) {
      return false;
    }
  }
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    return false;
  }
}

async function safeDelete(key) {
  if (online) {
    try {
      await apiRequest('/api/data?key=' + encodeURIComponent(key), { method: 'DELETE' });
      return true;
    } catch (e) {
      return false;
    }
  }
  try {
    localStorage.removeItem(key);
    return true;
  } catch (e) {
    return false;
  }
}

async function safeList(prefix) {
  if (online) {
    try {
      const r = await apiRequest('/api/data?prefix=' + encodeURIComponent(prefix));
      return r.keys || [];
    } catch (e) {
      return [];
    }
  }
  try {
    const out = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) out.push(k);
    }
    return out;
  } catch (e) {
    return [];
  }
}

/* ---------------- Inicialización de la base de datos ---------------- */

async function initDB() {
  online = await detectOnline();

  if (online) {
    try {
      const teamKeys = await safeList('teams:');
      const teams = [];
      for (const key of teamKeys) {
        const rec = await safeGet(key);
        if (rec) { try { teams.push(JSON.parse(rec)); } catch (e) {} }
      }
      State.data.teams = teams;

      const matchKeys = await safeList('matches:');
      const matches = [];
      for (const key of matchKeys) {
        const rec = await safeGet(key);
        if (rec) { try { matches.push(JSON.parse(rec)); } catch (e) {} }
      }
      State.data.matches = matches;

      const settingsRaw = await safeGet('settings:main');
      if (settingsRaw) {
        try { State.data.settings = { ...State.data.settings, ...JSON.parse(settingsRaw) }; } catch (e) {}
      }
    } catch (e) {
      console.error('DB init error', e);
      loadLocalFallback();
    }
  } else {
    loadLocalFallback();
  }
  dbReady = true;
}

function loadLocalFallback() {
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
  localStorage.setItem('pso_data_fallback', JSON.stringify(State.data));
}

/* ---------------- Persistencia de entidades ---------------- */

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
  if (online) {
    await safeDelete('teams:' + id);
  }
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
  if (online) {
    await safeDelete('matches:' + id);
  }
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

/* ---------------- Sincronización periódica (modo online) ---------------- */

async function refreshFromStorage() {
  try {
    const teamKeys = await safeList('teams:');
    const teams = [];
    for (const key of teamKeys) {
      const rec = await safeGet(key);
      if (rec) { try { teams.push(JSON.parse(rec)); } catch (e) {} }
    }
    const matchKeys = await safeList('matches:');
    const matches = [];
    for (const key of matchKeys) {
      const rec = await safeGet(key);
      if (rec) { try { matches.push(JSON.parse(rec)); } catch (e) {} }
    }
    const settingsRaw = await safeGet('settings:main');
    let settings = State.data.settings;
    if (settingsRaw) { try { settings = { ...State.data.settings, ...JSON.parse(settingsRaw) }; } catch (e) {} }

    State.data.teams = teams;
    State.data.matches = matches;
    State.data.settings = settings;
    renderAll();
  } catch (e) {}
}