/* /api/ranking — ranking de trivia, leído y escrito con la SERVICE KEY
   (la tabla public.users no permite lectura anónima por RLS, así que
   cualquier acceso desde el front tiene que pasar por acá).

   GET  → {ranking:[{id,username,displayName,bestStreak,createdAt}]}
   POST (token) {bestStreak} → {user} */
import { getConfig, verifySupabaseUser, saveStreak, readStreakRanking, userFromRow, MAX_SCORE, json } from '../lib/game.mjs';

export async function onRequestGet(context) {
  const cfg = getConfig(context.env);
  if (!cfg.serviceKey) return json(503, { error: 'not_configured' });
  try {
    const rows = await readStreakRanking(cfg, 'best_streak');
    return json(200, {
      ranking: rows.map(r => ({
        id: r.id,
        username: r.username,
        displayName: r.display_name || r.username,
        bestStreak: Number(r.best_streak || 0),
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

  let body;
  try { body = await context.request.json(); } catch (e) { return json(400, { error: 'bad_request' }); }

  const me = await verifySupabaseUser(cfg, context.request.headers.get('Authorization'));
  if (!me) return json(401, { error: 'unauthorized' });

  const score = Math.min(Number(body.bestStreak || 0), MAX_SCORE);
  let row;
  try {
    row = await saveStreak(cfg, me, 'best_streak', score);
  } catch (e) {
    if (String(e.message) === 'not_configured') return json(503, { error: 'not_configured' });
    return json(502, { error: 'supabase_error' });
  }

  return json(200, { user: userFromRow(me, row) });
}