/* Test de SEGURIDAD del endpoint /api/ranking (y /api/ranking/penales).
   Verifica el hardening: el POST ya NO acepta un score que el cliente
   declare libre; solo acepta la racha contada por el server en la sesión
   de partida firmada (HMAC).
   Uso: node scripts/test-ranking-security.mjs */
import assert from 'node:assert';
import { signState, verifyState } from '../functions/lib/game.mjs';

const SECRET = 'test-secret-123';
let failures = 0;
let savedUsersPost = null;
async function check(name, fn) {
  try { await fn(); console.log('OK  ' + name); }
  catch (e) { failures++; console.log('FAIL ' + name + ' → ' + e.message); }
}

/* Mock de Supabase */
const SUPA_USER = { id: 'user-1', email: 'a@b.c', user_metadata: { username: 'jugador', display_name: 'Jugador Uno' } };
globalThis.fetch = async (url, opts = {}) => {
  const u = String(url);
  if (u.includes('/auth/v1/user')) return { ok: true, json: async () => SUPA_USER };
  if (u.includes('/rest/v1/users')) {
    if (!opts.method || opts.method === 'GET') {
      const rows = [{ id: 'user-1', created_at: 111, best_streak: 7, best_penal_streak: 2 }];
      return { ok: true, json: async () => rows, text: async () => JSON.stringify(rows) };
    }
    savedUsersPost = JSON.parse(opts.body)[0];
    return { ok: true, json: async () => ({}), text: async () => '' };
  }
  return { ok: false, status: 404, json: async () => ({}), text: async () => '' };
};

const { onRequestPost: rankingPost } = await import('../functions/api/ranking.js');
const { onRequestPost: penalesPost } = await import('../functions/api/ranking/penales.js');

const env = { GAME_SESSION_SECRET: SECRET, SUPABASE_SERVICE_KEY: 'sk' };
const ctx = (body, hdrs = {}) => ({
  env,
  request: {
    json: async () => body,
    headers: { get: (k) => { const kk = String(k).toLowerCase(); for (const key in hdrs) if (key.toLowerCase() === kk) return hdrs[key]; return null; } }
  }
});

const triviaSession = (s, user = 'user-1') =>
  signState({ v: 1, u: user, g: 'trivia', t: Date.now(), l: Date.now() - 5000, s, k: s, q: 0, n: 'x' }, SECRET);
const penalSession = (s, user = 'user-1') =>
  signState({ v: 1, u: user, g: 'penales', t: Date.now(), l: Date.now() - 5000, s, k: s, n: 'x' }, SECRET);

await check('ATAQUE 1: POST sin sesión de partida → 403 (antes: guardaba el score libre)', async () => {
  const r = await rankingPost(ctx({ bestStreak: 500 }, { Authorization: 'Bearer valid' }));
  assert.equal(r.status, 403);
  assert.equal((await r.json()).error, 'invalid_token');
});

await check('ATAQUE 2: POST con sesión de otra persona → 401', async () => {
  const r = await rankingPost(ctx({ token: await triviaSession(50, 'OTRO') }, { Authorization: 'Bearer valid' }));
  assert.equal(r.status, 401);
});

await check('ATAQUE 3: sesión de penales en el ranking de trivia → 400', async () => {
  const r = await rankingPost(ctx({ token: await penalSession(12) }, { Authorization: 'Bearer valid' }));
  assert.equal((await r.json()).error, 'wrong_game');
});

await check('ATAQUE 4: manipular st.s en el JWT no es posible (la firma HMAC lo rechaza)', async () => {
  /* El atacante fabrica un payload de sesión con s=999 y firma que no conoce. */
  const fake = await signState({ v: 1, u: 'user-1', g: 'trivia', t: Date.now(), l: Date.now() - 5000, s: 999, k: 999, q: 0, n: 'x' }, 'NO-SECRET');
  const r = await rankingPost(ctx({ token: fake }, { Authorization: 'Bearer valid' }));
  assert.equal(r.status, 403);
});

await check('ATAQUE 5: declarar bestStreak alto en el body NO sube el score (usa st.s)', async () => {
  const token = await triviaSession(3, 'user-1');
  savedUsersPost = null;
  const r = await rankingPost(ctx({ token, bestStreak: 500 }, { Authorization: 'Bearer valid' }));
  assert.equal(r.status, 200);
  assert.equal((await r.json()).score, 3);          /* el server contó 3, no 500 */
  assert.equal(savedUsersPost.best_streak, Math.max(7, 3)); /* 7 existente, nunca baja */
});

await check('FLUJO LEGÍTIMO: sesión de trivia válida guarda la racha del server', async () => {
  const token = await triviaSession(41, 'user-1');
  savedUsersPost = null;
  const r = await rankingPost(ctx({ token }, { Authorization: 'Bearer valid' }));
  assert.equal(r.status, 200);
  const data = await r.json();
  assert.equal(data.score, 41);
  assert.equal(data.user.bestStreak, 41);
  assert.equal(savedUsersPost.best_streak, 41);
});

await check('FLUJO LEGÍTIMO: penales válido guarda y queda topeado a 100', async () => {
  const token = await penalSession(3, 'user-1');
  const r = await penalesPost(ctx({ token }, { Authorization: 'Bearer valid' }));
  assert.equal(r.status, 200);
  assert.equal((await r.json()).score, 3);

  const tokenMax = await penalSession(999, 'user-1'); /* imposible: la sesión nunca supera 100 */
  const r2 = await penalesPost(ctx({ token: tokenMax }, { Authorization: 'Bearer valid' }));
  assert.equal(r2.status, 200);
  assert.equal((await r2.json()).score, 100);
});

await check('ATAQUE 6: sesión vencida → 400', async () => {
  const old = await signState({ v: 1, u: 'user-1', g: 'trivia', t: Date.now() - 60 * 60 * 1000, l: Date.now() - 60 * 60 * 1000, s: 5, k: 5, q: 0, n: 'x' }, SECRET);
  const r = await rankingPost(ctx({ token: old }, { Authorization: 'Bearer valid' }));
  assert.equal(r.status, 400);
  assert.equal((await r.json()).error, 'expired');
});

if (failures) { console.log('\n❌ ' + failures + ' tests de seguridad fallaron'); process.exit(1); }
console.log('\n✅ Todos los tests de seguridad del ranking pasaron');