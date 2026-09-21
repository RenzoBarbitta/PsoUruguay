/* ======================================================================
   PSO URUGUAY - LIB DEL SERVER DE PARTIDAS (Cloudflare Pages Functions)
   Valida trivia y penales en el server para que nadie pueda inventar una
   racha alta desde la consola del navegador.

   Cómo funciona (sin KV, 100% stateless):
   - start  : verifica el JWT de Supabase y emite un token de sesión firmado
              con HMAC-SHA256 (el estado de la partida vive dentro del token).
   - answer : (trivia) valida la respuesta contra la copia server de las
              respuestas correctas y devuelve un NUEVO token con la racha
              actualizada. El cliente no declara la racha: la cuenta el server.
   - kick   : (penales) valida cada tiro con piso de tiempo anti-autoplay.
   - finish : escribe la racha en public.users con la SERVICE KEY (secreto
              del server), tomando el máximo con lo que ya había.

   Secretos requeridos (env de Pages, con `wrangler pages secret put`):
     GAME_SESSION_SECRET  → firma HMAC de las sesiones (siempre requerido)
     SUPABASE_SERVICE_KEY → para escribir public.users (si falta, finish
                            devuelve 503 not_configured y el front cae al
                            flujo legacy sin validación).
   ====================================================================== */

import { TRIVIA_ANSWERS } from './trivia-answers.mjs';

/* Pisos de tiempo entre acciones (ms). Están POR DEBAJO del mínimo humano
   real: en trivia hay 1200ms de feedback hasta la próxima pregunta y en
   penales 900ms hasta que aparece el botón de siguiente. Un envío más
   rápido que el piso cierra la sesión sin sumar (anti-autoplay). */
export const MIN_GAP_TRIVIA_MS = 1000;
export const MIN_GAP_KICK_MS = 1000;

/* Vida máxima de una sesión y techo de racha (anti-bulos extremos). */
export const SESSION_TTL_MS = 45 * 60 * 1000;
export const MAX_SCORE = 500;

export function getConfig(env) {
  return {
    supabaseUrl: env.SUPABASE_URL || 'https://magestcsmgxegjbjcxef.supabase.co',
    supabaseAnonKey: env.SUPABASE_ANON_KEY || 'sb_publishable_ypyO6Mq-j6FX9S_klCcvwA_izVw6NAg',
    serviceKey: env.SUPABASE_SERVICE_KEY || null,
    secret: env.GAME_SESSION_SECRET || null
  };
}

/* ---------------- helpers base64url / HMAC ---------------- */

function b64urlEncode(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(str) {
  str = String(str).replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const bin = atob(str);
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}

function hmacKey(secret) {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

/* Firma el estado de la partida: payload JSON + HMAC-SHA256 */
export async function signState(state, secret) {
  const payload = b64urlEncode(new TextEncoder().encode(JSON.stringify(state)));
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return payload + '.' + b64urlEncode(new Uint8Array(sig));
}

/* Verifica un token y devuelve el estado, o null si es inválido */
export async function verifyState(token, secret) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  try {
    const key = await hmacKey(secret);
    const ok = await crypto.subtle.verify('HMAC', key, b64urlDecode(sig), new TextEncoder().encode(payload));
    if (!ok) return null;
    const st = JSON.parse(new TextDecoder().decode(b64urlDecode(payload)));
    if (!st || st.v !== 1 || !st.u || (st.g !== 'trivia' && st.g !== 'penales') || !st.t) return null;
    return st;
  } catch (e) {
    return null;
  }
}

/* ---------------- Supabase ---------------- */

/* Verifica el JWT del jugador contra Supabase Auth. Devuelve el user o null */
export async function verifySupabaseUser(cfg, authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const jwt = authHeader.slice(7).trim();
  if (!jwt) return null;
  try {
    const r = await fetch(cfg.supabaseUrl + '/auth/v1/user', {
      headers: { apikey: cfg.supabaseAnonKey, Authorization: 'Bearer ' + jwt }
    });
    if (!r.ok) return null;
    const me = await r.json();
    return me && me.id ? me : null;
  } catch (e) {
    return null;
  }
}

/* Fetch a Supabase con SERVICE KEY (solo desde el server) */
async function supaService(cfg, path, opts = {}) {
  if (!cfg.serviceKey) throw new Error('not_configured');
  const { method = 'GET', query, headers = {}, body } = opts;
  let url = cfg.supabaseUrl + path;
  if (query && Object.keys(query).length) {
    url += '?' + new URLSearchParams(query).toString();
  }
  const r = await fetch(url, {
    method,
    headers: {
      apikey: cfg.serviceKey,
      Authorization: 'Bearer ' + cfg.serviceKey,
      'Content-Type': 'application/json',
      ...headers
    },
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  if (!r.ok) throw new Error('supabase_' + r.status);
  const text = typeof r.text === 'function' ? await r.text() : '';
  if (text) return JSON.parse(text);
  return typeof r.json === 'function' ? await r.json() : null;
}

/* Guarda la racha en public.users tomando el MÁXIMO con lo que ya había
   (replica el upsert del front pero con service key y sin poder bajar). */
export async function saveStreak(cfg, me, column, score) {
  let cur = {};
  try {
    const rows = await supaService(cfg, '/rest/v1/users', {
      query: { id: 'eq.' + me.id, select: 'id,created_at,best_streak,best_penal_streak', limit: '1' }
    });
    if (Array.isArray(rows) && rows[0]) cur = rows[0];
  } catch (e) { /* si no se puede leer, seguimos con vacío (el trigger de la DB igual no deja bajar) */ }

  const md = me.user_metadata || {};
  const row = {
    id: me.id,
    username: md.username,
    display_name: md.display_name || md.username,
    best_streak: Math.max(Number(cur.best_streak || 0), column === 'best_streak' ? score : Number(md.best_streak || 0)),
    best_penal_streak: Math.max(Number(cur.best_penal_streak || 0), column === 'best_penal_streak' ? score : Number(md.best_penal_streak || 0)),
    created_at: cur.created_at !== undefined ? cur.created_at : Date.now()
  };
  await supaService(cfg, '/rest/v1/users', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates' },
    body: [row]
  });
  return row;
}

/* User con la forma que espera el front (mapAuthUser en js/state.js) */
export function userFromRow(me, row) {
  return {
    id: me.id,
    username: row.username,
    displayName: row.display_name || row.username,
    email: me.email || null,
    bestStreak: Number(row.best_streak || 0),
    bestPenalStreak: Number(row.best_penal_streak || 0),
    createdAt: row.created_at
  };
}

/* ---------------- helpers de respuesta ---------------- */

export function json(status, obj) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}

/* Pregunta al azar (índice sobre TRIVIA_ANSWERS) */
export function randomQuestionIndex() {
  return Math.floor(Math.random() * TRIVIA_ANSWERS.length);
}

export { TRIVIA_ANSWERS };

