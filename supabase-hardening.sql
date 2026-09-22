-- ======================================================================
-- PSO URUGUAY × SUPABASE — HARDENING DE SEGURIDAD
-- Ejecutá esto UNA VEZ en: Supabase Dashboard → SQL Editor → Run
-- (es idempotente: se puede correr más de una vez sin romper nada).
--
-- QUÉ HACE:
--   1) La tabla public.users (ranking online) NO se puede escribir desde
--      el cliente, ni por REST directo, ni trucando JS, ni con DevTools.
--      La única vía para sumar puntos es una PARTIDA VALIDADA POR EL
--      SERVER (las Pages Functions /api/game/* y /api/ranking* usan la
--      service key, que saltea RLS).
--   2) public.kv (equipos, partidos, resultados, torneos, settings)
--      mantiene su RLS actual: lectura pública / escritura SOLO de una
--      cuenta Supabase Auth con app_metadata.is_admin = true. Los admins
--      conservan exactamente los permisos que ya tienen.
--   3) Endurece la función trigger SECURITY DEFINER (fix de search_path).
--
-- NO toca datos existentes, no desactiva RLS, no cambia lectura pública.
-- ======================================================================

create extension if not exists "pgcrypto";

-- ======================================================================
-- 1) TABLA kv — equipos / partidos / resultados / torneos / settings
-- ======================================================================
alter table public.kv enable row level security;

-- Cualquiera puede LEER los datos de la liga (siempre fue público).
drop policy if exists "kv_select_anon" on public.kv;
create policy "kv_select_anon" on public.kv
  for select using (true);

-- Escribir equipos/partidos/resultados/torneos/settings exige una cuenta
-- real marcada admin (app_metadata.is_admin en el JWT firmado por Supabase).
-- Un usuario normal que llame REST/RPC/fetch directo recibe 401/403/425.
drop policy if exists "kv_write_admin" on public.kv;
create policy "kv_write_admin" on public.kv
  for all
  using (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false))
  with check (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false));

-- ======================================================================
-- 2) TABLA users — ranking online
-- ======================================================================
alter table public.users enable row level security;

-- Lectura pública del ranking: se mantiene (la web lo mostraba así).
drop policy if exists "users_select_anon" on public.users;
create policy "users_select_anon" on public.users
  for select using (true);

-- INSERT: un jugador solo puede crear SU PROPIA fila (id = auth.uid()).
-- Pase lo que pase, la racha no se puede declarar acá: el trigger la
-- fuerza a 0. El score real solo lo escribe el server (service key,
-- mediante una partida validada), que no pasa por RLS.
drop policy if exists "users_insert_auth" on public.users;
drop policy if exists "users_insert_own" on public.users;
create policy "users_insert_own" on public.users
  for insert with check (
    auth.role() = 'authenticated'
    and auth.uid()::text = id
  );

-- UPDATE: cada usuario puede tocar SOLO su fila. El trigger congela
-- best_streak / best_penal_streak / created_at: desde el cliente no se
-- pueden modificar (ni subir ni bajar). Solo datos benignos (nombre).
drop policy if exists "users_update_own" on public.users;
create policy "users_update_own" on public.users
  for update
  using (auth.role() = 'authenticated' and auth.uid()::text = id)
  with check (auth.role() = 'authenticated' and auth.uid()::text = id);

-- DELETE: NO hay policy → RLS deniega. Un jugador no puede borrar su fila
-- (ni la de nadie). Si en el futuro el server necesita borrar, lo hace con
-- la service key (no pasa por RLS).

-- ======================================================================
-- 3) TRIGGER — el ranking SOLO lo puede modificar el server validado
--
--    Antes: el trigger solo evitaba que el récord BAJARA (clamp de
--    greatest). Un jugador todavía podía SUBIR su racha inventada desde
--    REST/DevTools.
--    Ahora: cualquier write que NO venga del service role queda congelado:
--      - INSERT a fila ajena → rechazado.
--      - INSERT propio → best_streak/best_penal_streak forzados a 0
--        (no se puede "nacer" con récord).
--      - UPDATE → se conservan best_streak, best_penal_streak y
--        created_at existentes (puede cambiar el display_name).
--      - DELETE → rechazado.
--    El server (service key) mantiene el comportamiento original: acepta
--    subir el récord y nunca permite que baje.
-- ======================================================================
create or replace function public.pso_clamp_best_streaks()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  claim_role text;
begin
  /* ¿Este write viene de la service key del server (partida validada)?
     En ese caso devolvemos control total como antes. Para todo lo demás
     (anon / authenticated / postgres descubierto), el ranking se congela. */
  claim_role := coalesce(auth.jwt() ->> 'role', current_setting('request.jwt.role', true));

  if TG_OP = 'DELETE' then
    if claim_role <> 'service_role' then
      raise exception 'forbidden: el ranking no se puede borrar desde el cliente';
    end if;
    return old;
  end if;

  if claim_role <> 'service_role' then
    if TG_OP = 'INSERT' then
      if new.id <> auth.uid()::text then
        raise exception 'forbidden: solo podes crear tu propia fila';
      end if;
      /* No se puede "nacer" con racha: empieza en 0 hasta que el server
         valide una partida. */
      new.best_streak := 0;
      new.best_penal_streak := 0;
    else
      /* UPDATE de un jugador: el récord y la fecha quedan congelados en
         los valores actuales. Lo único editable es lo benigno (nombre). */
      new.best_streak := old.best_streak;
      new.best_penal_streak := old.best_penal_streak;
      new.created_at := old.created_at;
    end if;
    return new;
  end if;

  /* Write del server validado (service role): el récord solo puede subir,
     nunca bajar, y la fecha de alta es inmutable. */
  if TG_OP = 'UPDATE' then
    new.best_streak := greatest(coalesce(new.best_streak, 0), coalesce(old.best_streak, 0));
    new.best_penal_streak := greatest(coalesce(new.best_penal_streak, 0), coalesce(old.best_penal_streak, 0));
    new.created_at := old.created_at;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_pso_clamp_best_streaks on public.users;
create trigger trg_pso_clamp_best_streaks
  before update on public.users
  for each row execute function public.pso_clamp_best_streaks();

drop trigger if exists trg_pso_insert_ranking on public.users;
create trigger trg_pso_insert_ranking
  before insert on public.users
  for each row execute function public.pso_clamp_best_streaks();

drop trigger if exists trg_pso_delete_ranking on public.users;
create trigger trg_pso_delete_ranking
  before delete on public.users
  for each row execute function public.pso_clamp_best_streaks();

-- ======================================================================
-- 4) ÍNDICES (ya existentes, idempotentes)
-- ======================================================================
create index if not exists idx_users_streak        on public.users (best_streak desc);
create index if not exists idx_users_penal_streak  on public.users (best_penal_streak desc);

-- ======================================================================
-- 5) RECARGAR EL SCHEMA CACHE DE POSTGREST
-- ======================================================================
notify pgrst, 'reload schema';