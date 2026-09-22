/* /api/ranking/penales — ranking de penales con SERVICE KEY (mismo motivo
   que /api/ranking: la tabla public.users no se lee anónimo por RLS).

   GET  → {ranking:[{id,username,displayName,bestPenalStreak,createdAt}]}
   POST (token) {token} → {score, user}
   El POST SOLO acepta un score que el SERVER haya validado: el body debe
   traer el token de sesión de partida firmado (HMAC, lo da /api/game/start
   y la cuenta /api/game/kick, que limita la tanda a 100 tiros). Sin sesión
   válida → 401/403. */
import { getConfig, verifySupabaseUser, verifyState, saveStreak, readStreakRanking, userFromRow, SESSION_TTL_MS, json } from '../../lib/game.mjs';

export const MAX_PENALES_SCORE = 100;

export async function onRequestGet(context) {
  const cfg = getConfig(context.env);
  if (!cfg.serviceKey) return json(503, { error: 'not_configured' });
  try {
    const rows = await readStreakRanking(cfg, 'best_penal_streak');
    return json(200, {
      ranking: rows.map(r => ({
        id: r.id,
        username: r.username,
        displayName: r.display_name || r.username,
        bestPenalStreak: Number(r.best_penal_streak || 0),
        createdAt: r.created_at
      }))
    });
  } catch (e) {
    return json(502, { error: 'supabase_error' });
  }
}

export async function onRequestPost(context) {
  const cfg = getConfig(context.env);
  if (!cfg.serviceKey) return json(503, { error: 'not_configured' });
  if (!cfg.secret) return json(503, { error: 'not_configured' });

  let body;
  try { body = await context.request.json(); } catch (e) { return json(400, { error: 'bad_request' }); }

  const me = await verifySupabaseUser(cfg, context.request.headers.get('Authorization'));
  if (!me) return json(401, { error: 'unauthorized' });

  /* El score se toma de la sesión validada por el server, nunca del body. */
  const st = await verifyState(body && body.token, cfg.secret);
  if (!st) return json(403, { error: 'invalid_token' });
  if (st.g !== 'penales') return json(400, { error: 'wrong_game' });
  if (st.u !== me.id) return json(401, { error: 'unauthorized' });
  if (Date.now() - st.t > SESSION_TTL_MS) return json(400, { error: 'expired' });

  const score = Math.min(Number(st.s || 0), MAX_PENALES_SCORE);
  let row;
  try {
    row = await saveStreak(cfg, me, 'best_penal_streak', score);
  } catch (e) {
    if (String(e.message) === 'not_configured') return json(503, { error: 'not_configured' });
    return json(502, { error: 'supabase_error' });
  }

  return json(200, { score, user: userFromRow(me, row) });
}