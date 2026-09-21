/* POST /api/game/kick — valida un tiro de penales.
   Body: { token, result: 'gol' | 'atajada' | 'sin_tiempo' }
   Anti-autoplay: entre tiro y tiro hay un piso de tiempo server-side. */
import { getConfig, verifyState, signState, MIN_GAP_KICK_MS, SESSION_TTL_MS, json } from '../../lib/game.mjs';

export async function onRequestPost(context) {
  const cfg = getConfig(context.env);
  if (!cfg.secret) return json(503, { error: 'not_configured' });

  let body;
  try { body = await context.request.json(); } catch (e) { return json(400, { error: 'bad_request' }); }

  const st = await verifyState(body && body.token, cfg.secret);
  if (!st) return json(400, { error: 'invalid_token' });
  if (st.g !== 'penales') return json(400, { error: 'wrong_game' });
  if (Date.now() - st.t > SESSION_TTL_MS) return json(400, { error: 'expired' });

  const result = body && body.result;
  if (result !== 'gol' && result !== 'atajada' && result !== 'sin_tiempo') {
    return json(400, { error: 'bad_result' });
  }

  const now = Date.now();
  const gap = now - (st.l || st.t);
  if (gap < MIN_GAP_KICK_MS) {
    const token = await signState({ ...st, l: now }, cfg.secret);
    return json(200, { token, s: st.s, over: true, reason: 'too_fast' });
  }

  const gol = result === 'gol';
  const st2 = gol ? { ...st, s: st.s + 1, k: (st.k || 0) + 1, l: now } : { ...st, l: now };
  const token = await signState(st2, cfg.secret);
  return json(200, { token, s: st2.s, over: !gol });
}
