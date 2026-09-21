/* POST /api/game/finish — cierra la partida y guarda la racha.
   Body: { token }.  Auth: Authorization: Bearer <JWT de Supabase>
   La racha guardada es la que cuenta el server (state.s), tomando el
   máximo con la que ya había en public.users. */
import { getConfig, verifyState, verifySupabaseUser, saveStreak, userFromRow, SESSION_TTL_MS, MAX_SCORE, json } from '../../lib/game.mjs';

export async function onRequestPost(context) {
  const cfg = getConfig(context.env);
  if (!cfg.secret) return json(503, { error: 'not_configured' });

  let body;
  try { body = await context.request.json(); } catch (e) { return json(400, { error: 'bad_request' }); }

  const st = await verifyState(body && body.token, cfg.secret);
  if (!st) return json(400, { error: 'invalid_token' });
  if (Date.now() - st.t > SESSION_TTL_MS) return json(400, { error: 'expired' });

  /* El token del jugador tiene que coincidir con la sesión firmada. */
  const me = await verifySupabaseUser(cfg, context.request.headers.get('Authorization'));
  if (!me || me.id !== st.u) return json(401, { error: 'unauthorized' });

  if (!cfg.serviceKey) return json(503, { error: 'not_configured' });

  const score = Math.min(Number(st.s || 0), st.g === 'penales' ? 100 : MAX_SCORE);
  const column = st.g === 'trivia' ? 'best_streak' : 'best_penal_streak';

  let row;
  try {
    row = await saveStreak(cfg, me, column, score);
  } catch (e) {
    if (String(e.message) === 'not_configured') return json(503, { error: 'not_configured' });
    return json(502, { error: 'supabase_error' });
  }

  return json(200, { score, game: st.g, user: userFromRow(me, row) });
}
