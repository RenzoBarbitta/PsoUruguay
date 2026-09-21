/* POST /api/game/start — inicia una partida validada.
   Body: { game: 'trivia' | 'penales' }
   Auth:  Authorization: Bearer <JWT de Supabase>
   Devuelve: { token } (+ { q } con la primer pregunta para trivia) */
import { getConfig, verifySupabaseUser, signState, randomQuestionIndex, json } from '../../lib/game.mjs';

export async function onRequestPost(context) {
  const cfg = getConfig(context.env);
  if (!cfg.secret) return json(503, { error: 'not_configured' });

  let body = {};
  try { body = await context.request.json(); } catch (e) { body = {}; }
  const game = body.game === 'trivia' ? 'trivia' : body.game === 'penales' ? 'penales' : null;
  if (!game) return json(400, { error: 'bad_game' });

  const me = await verifySupabaseUser(cfg, context.request.headers.get('Authorization'));
  if (!me) return json(401, { error: 'unauthorized' });

  const now = Date.now();
  const st = { v: 1, u: me.id, g: game, t: now, l: now, s: 0, k: 0, n: crypto.randomUUID() };
  let out = {};
  if (game === 'trivia') {
    st.q = randomQuestionIndex();
    out.q = st.q;
  }
  out.token = await signState(st, cfg.secret);
  return json(200, out);
}
