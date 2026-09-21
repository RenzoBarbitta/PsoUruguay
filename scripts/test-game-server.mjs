/* Test local del server de partidas. Uso: node scripts/test-game-server.mjs */
import assert from 'node:assert';
import { signState, verifyState, MIN_GAP_TRIVIA_MS } from '../functions/lib/game.mjs';
import { TRIVIA_ANSWERS } from '../functions/lib/trivia-answers.mjs';

const SECRET = 'test-secret-123';
let failures = 0;
async function check(name, fn) {
  try { await fn(); console.log('OK  ' + name); }
  catch (e) { failures++; console.log('FAIL ' + name + ' → ' + e.message); }
}

/* --- HMAC --- */
await check('signState/verifyState roundtrip', async () => {
  const st = { v: 1, u: 'user-1', g: 'trivia', t: 1, l: 1, s: 3, k: 3, q: 5, n: 'abc' };
  const out = await verifyState(await signState(st, SECRET), SECRET);
  assert.ok(out && out.s === 3 && out.q === 5);
});
await check('tampering falla', async () => {
  const token = await signState({ v: 1, u: 'x', g: 'trivia', t: 1, l: 1, s: 1, k: 1, q: 0, n: 'n' }, SECRET);
  const forged = btoa(JSON.stringify({ v: 1, u: 'x', g: 'trivia', t: 1, l: 1, s: 999, k: 999, q: 0, n: 'n' }))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  assert.equal(await verifyState(forged + '.' + token.split('.')[1], SECRET), null);
});
await check('secret equivocado falla', async () => {
  const token = await signState({ v: 1, u: 'x', g: 'penales', t: 1, l: 1, s: 1, k: 1, n: 'n' }, SECRET);
  assert.equal(await verifyState(token, 'otro-secret'), null);
});
await check('banco de preguntas server válido', () => {
  assert.ok(TRIVIA_ANSWERS.length >= 20, 'solo ' + TRIVIA_ANSWERS.length + ' preguntas');
  for (const m of TRIVIA_ANSWERS) {
    assert.ok(Number.isInteger(m.c) && m.c >= 0 && m.c < m.n && m.n >= 2, 'inválida: ' + JSON.stringify(m));
  }
});

/* Mock de Supabase para los endpoints */
const SUPA_USER = { id: 'user-1', email: 'a@b.c', user_metadata: { username: 'jugador', display_name: 'Jugador Uno' } };
let lastUserPost = null;
globalThis.fetch = async (url, opts = {}) => {
  const u = String(url);
  if (u.includes('/auth/v1/user')) {
    if ((opts.headers || {}).Authorization === 'Bearer bad-jwt') return { ok: false, status: 401, json: async () => ({}) };
    return { ok: true, json: async () => SUPA_USER };
  }
  if (u.includes('/rest/v1/users')) {
    if (!opts.method || opts.method === 'GET') {
      const rows = [{ id: 'user-1', created_at: 111, best_streak: 7, best_penal_streak: 2 }];
      return { ok: true, json: async () => rows, text: async () => JSON.stringify(rows) };
    }
    lastUserPost = JSON.parse(opts.body)[0];
    return { ok: true, json: async () => ({}), text: async () => '' };
  }
  return { ok: false, status: 404, json: async () => ({}), text: async () => '' };
};

const { onRequestPost: answerEndpoint } = await import('../functions/api/game/answer.js');
const { onRequestPost: kickEndpoint } = await import('../functions/api/game/kick.js');
const { onRequestPost: finishEndpoint } = await import('../functions/api/game/finish.js');

const env = { GAME_SESSION_SECRET: SECRET, SUPABASE_SERVICE_KEY: 'sk' };
const ctx = (body, hdrs = {}) => ({
  env,
  request: {
    json: async () => body,
    headers: { get: (k) => { const kk = String(k).toLowerCase(); for (const key in hdrs) if (key.toLowerCase() === kk) return hdrs[key]; return null; } }
  }
});

await check('answer: correcta suma y reparte siguiente', async () => {
  const st = { v: 1, u: 'user-1', g: 'trivia', t: Date.now(), l: Date.now() - 5000, s: 0, k: 0, q: 0, n: 'x' };
  const r = await answerEndpoint(ctx({ token: await signState(st, SECRET), a: TRIVIA_ANSWERS[0].c }));
  const data = await r.json();
  assert.equal(data.ok, true); assert.equal(data.s, 1); assert.ok(Number.isInteger(data.next));
});
await check('answer: incorrecta cierra sin sumar', async () => {
  const st = { v: 1, u: 'user-1', g: 'trivia', t: Date.now(), l: Date.now() - 5000, s: 3, k: 3, q: 0, n: 'x' };
  const wrong = (TRIVIA_ANSWERS[0].c + 1) % TRIVIA_ANSWERS[0].n;
  const data = await (await answerEndpoint(ctx({ token: await signState(st, SECRET), a: wrong }))).json();
  assert.equal(data.over, true); assert.equal(data.s, 3);
});
await check('answer: demasiado rápido cierra sin sumar', async () => {
  const st = { v: 1, u: 'user-1', g: 'trivia', t: Date.now(), l: Date.now(), s: 0, k: 0, q: 0, n: 'x' };
  const data = await (await answerEndpoint(ctx({ token: await signState(st, SECRET), a: TRIVIA_ANSWERS[0].c }))).json();
  assert.equal(data.reason, 'too_fast'); assert.equal(data.s, 0);
});
await check('answer: rechaza token inválido y game equivocado', async () => {
  assert.equal((await (await answerEndpoint(ctx({ token: 'x.y', a: 1 }))).json()).error, 'invalid_token');
  const pen = await signState({ v: 1, u: 'u', g: 'penales', t: Date.now(), l: Date.now() - 5000, s: 0, k: 0, n: 'x' }, SECRET);
  assert.equal((await (await answerEndpoint(ctx({ token: pen, a: 1 }))).json()).error, 'wrong_game');
});
await check('kick: gol suma, atajada cierra', async () => {
  const st = { v: 1, u: 'user-1', g: 'penales', t: Date.now(), l: Date.now() - 5000, s: 0, k: 0, n: 'x' };
  let data = await (await kickEndpoint(ctx({ token: await signState(st, SECRET), result: 'gol' }))).json();
  assert.equal(data.s, 1); assert.equal(data.over, false);
  data = await (await kickEndpoint(ctx({ token: data.token, result: 'atajada' }))).json();
  assert.equal(data.over, true); assert.equal(data.s, 1);
});
await check('kick: rechaza result inválido', async () => {
  const st = { v: 1, u: 'u', g: 'penales', t: Date.now(), l: Date.now() - 5000, s: 0, k: 0, n: 'x' };
  assert.equal((await (await kickEndpoint(ctx({ token: await signState(st, SECRET), result: 'golazo' }))).json()).error, 'bad_result');
});
await check('finish: guarda el score del server y arma el user', async () => {
  const st = { v: 1, u: 'user-1', g: 'penales', t: Date.now(), l: Date.now() - 5000, s: 12, k: 12, n: 'x' };
  const r = await finishEndpoint(ctx({ token: await signState(st, SECRET) }, { Authorization: 'Bearer valid' }));
  const data = await r.json();
  assert.equal(r.status, 200, 'status ' + r.status);
  assert.equal(data.score, 12);
  assert.equal(data.user.bestPenalStreak, 12);
  assert.equal(data.user.displayName, 'Jugador Uno');
  assert.equal(lastUserPost.created_at, 111, 'created_at debe conservarse');
});
await check('finish: rechaza sesión de otro usuario', async () => {
  const st = { v: 1, u: 'OTRO', g: 'trivia', t: Date.now(), l: Date.now() - 5000, s: 5, k: 5, q: 0, n: 'x' };
  const r = await finishEndpoint(ctx({ token: await signState(st, SECRET) }, { Authorization: 'Bearer valid' }));
  assert.equal(r.status, 401);
});
await check('finish: sin service key → not_configured', async () => {
  const st = { v: 1, u: 'user-1', g: 'trivia', t: Date.now(), l: Date.now() - 5000, s: 1, k: 1, q: 0, n: 'x' };
  const r = await finishEndpoint({ env: { GAME_SESSION_SECRET: SECRET }, request: { json: async () => ({ token: await signState(st, SECRET) }), headers: { get: () => 'Bearer valid' } } });
  assert.equal((await r.json()).error, 'not_configured');
});
await check('finish: sin secret → not_configured (503)', async () => {
  const r = await finishEndpoint({ env: {}, request: { json: async () => ({}), headers: { get: () => null } } });
  assert.equal(r.status, 503);
});
await check('piso de tiempo trivia razonable', () => {
  assert.ok(MIN_GAP_TRIVIA_MS >= 900 && MIN_GAP_TRIVIA_MS <= 1150);
});

if (failures) { console.log('\n❌ ' + failures + ' tests fallaron'); process.exit(1); }
console.log('\n✅ Todos los tests del server pasaron');

