-- ======================================================================
-- PSO URUGUAY × SUPABASE - ESQUEMA INICIAL
-- Ejecutá esto una sola vez en: Supabase Dashboard → SQL Editor → Run
-- (pegar todo y click "Run"). No rompe nada si lo corrés dos veces.
-- ======================================================================

-- Extensión para generar UUIDs (normalmente ya viene activa)
create extension if not exists "pgcrypto";

-- ======================================================================
-- 1) TABLA kv — key/value genérico
--    Guarda: teams, matches, settings... (todo lo que antes iba a JSON).
-- ======================================================================
create table if not exists public.kv (
  key       text primary key,
  value     text not null,
  updated_at timestamptz not null default now()
);

comment on table public.kv is 'PSO Uruguay: datos de la liga (equipos, partidos, settings).';

-- RLS: cualquiera puede LEER y ESCRIBIR kv.
--   • LEER  → el ranking/clasificación es público de la liga.
--   • ESCRIBIR → el panel de administración (admin/pso2026, sin sesión
--                 de Supabase) guarda acá equipos/partidos/settings.
--     ⚠ Trade-off deliberado: cualquier visitante con la anon key podría
--       editar kv. Es aceptable para una liga amateur y evita romper el
--       panel admin. Si querés cerrarlo, andá a lo de abajo (bloque
--       "OPCIÓN MÁS SEGURA") y cambiá la policy.
alter table public.kv enable row level security;

drop policy if exists "kv_select_anon" on public.kv;
drop policy if exists "kv_write_anon"  on public.kv;

create policy "kv_select_anon" on public.kv
  for select using (true);

create policy "kv_write_anon" on public.kv
  for all using (true)
  with check (true);

/* ----------------------------------------------------------------------
   OPCIÓN MÁS SEGURA (opcional)
   Si preferís que SOLO el admin (con sesión de Supabase) pueda escribir
   a kv, reemplazá la policy "kv_write_anon" por esta otra:
       drop policy if exists "kv_write_anon" on public.kv;
       create policy "kv_write_auth" on public.kv
         for all using (auth.role() = 'authenticated')
         with check (auth.role() = 'authenticated');
   Ojo: el panel admin de la web usa admin/pso2026 (local, sin Supabase),
   así que con esta opción ya no podría escribir equipos/partidos online.
   ---------------------------------------------------------------------- */

-- ======================================================================
-- 2) TABLA users — cuentas + ranking online
-- ======================================================================
create table if not exists public.users (
  id              text primary key,          -- = user.id de Supabase Auth
  username        text unique not null,
  display_name    text,
  best_streak     integer not null default 0, -- racha trivia
  best_penal_streak integer not null default 0,
  created_at      bigint not null            -- epoch ms
);

comment on table public.users is 'PSO Uruguay: cuentas y ranking online.';

-- RLS: ranking público para leer; cada usuario escribe SOLO su fila.
alter table public.users enable row level security;

drop policy if exists "users_select_anon" on public.users;
drop policy if exists "users_insert_auth" on public.users;
drop policy if exists "users_update_own"  on public.users;

create policy "users_select_anon" on public.users
  for select using (true);

create policy "users_insert_auth" on public.users
  for insert with check (auth.role() = 'authenticated');

create policy "users_update_own" on public.users
  for update using (auth.role() = 'authenticated' and auth.uid()::text = id)
  with check (auth.role() = 'authenticated' and auth.uid()::text = id);

-- ======================================================================
-- 3) ÍNDICES para ranking rápido
-- ======================================================================
create index if not exists idx_users_streak        on public.users (best_streak desc);
create index if not exists idx_users_penal_streak  on public.users (best_penal_streak desc);
