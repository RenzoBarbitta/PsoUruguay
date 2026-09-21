/* POST /api/game/answer — valida una respuesta de trivia.
   Body: { token, a: <índice elegido> }
   La racha la cuenta el SERVER contra su copia de las respuestas correctas:
   el cliente no declara aciertos, solo qué opción tocó. */
import { getConfig, verifyState, signState, randomQuestionIndex, TRIVIA_ANSWERS, MIN_GAP_TRIVIA_MS, SESSION_TTL_MS, json } from '../../lib/game.mjs';

export async function onRequestPost(context) {
  const cfg = getConfig(context.env);
  if (!cfg.secret) return json(503, { error: 'not_configured' });

  let body;
  try { body = await context.request.json(); } catch (e) { return json(400, { error: 'bad_request' }); }

  const st = await verifyState(body && body.token, cfg.secret);
  if (!st) return json(400, { error: 'invalid_token' });
  if (st.g !== 'trivia') return json(400, { error: 'wrong_game' });
  if (Date.now() - st.t > SESSION_TTL_MS) return json(400, { error: 'expired' });

  const meta = TRIVIA_ANSWERS[st.q | 0];
  const a = Number(body && body.a);
  if (!meta || !Number.isInteger(a) || a < 0 || a >= meta.n) return json(400, { error: 'bad_answer' });

  const now = Date.now();
  const gap = now - (st.l || st.t);
  if (gap < MIN_GAP_TRIVIA_MS) {
    /* Imposible que un humano responda tan rápido: se cierra sin sumar. */
    const token = await signState({ ...st, l: now }, cfg.secret);
    return json(200, { token, ok: false, s: st.s, over: true, reason: 'too_fast' });
  }

  if (a !== meta.c) {
    const token = await signState({ ...st, l: now }, cfg.secret);
    return json(200, { token, ok: false, s: st.s, over: true });
  }

  const st2 = { ...st, s: st.s + 1, k: (st.k || 0) + 1, l: now, q: randomQuestionIndex() };
  const token = await signState(st2, cfg.secret);
  return json(200, { token, ok: true, s: st2.s, next: st2.q });
}
