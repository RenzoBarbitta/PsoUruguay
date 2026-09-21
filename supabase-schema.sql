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

-- RLS: cualquiera puede LEER kv (el fixture/tabla es público),
-- pero SOLO puede ESCRIBIR quien tenga sesión real de Supabase Auth
-- marcada como admin (app_metadata.is_admin = true).
--
-- ANTES esta policy era "for all using (true)": cualquier visitante,
-- sin loguearse ni nada, podía llamar directo a la API de Supabase con la
-- anon key (pública, está en js/config.js) y sobreescribir equipos,
-- partidos, resultados y rankings. Eso es lo que permitía "editar los
-- JSON" del sitio desde afuera. Con esto ya no alcanza con la anon key:
-- hace falta el JWT de una cuenta marcada is_admin.
alter table public.kv enable row level security;

drop policy if exists "kv_select_anon" on public.kv;
drop policy if exists "kv_write_anon"  on public.kv;
drop policy if exists "kv_write_admin" on public.kv;

create policy "kv_select_anon" on public.kv
  for select using (true);

create policy "kv_write_admin" on public.kv
  for all
  using (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false))
  with check (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false));

/* ----------------------------------------------------------------------
   CREAR LA CUENTA DE ADMIN (una sola vez)
   1. Supabase Dashboard → Authentication → Users → "Add user" → creá el
      admin con un email y contraseña REALES y fuertes (ya no es
      admin/pso2026 fijo en el código: eso cualquiera lo veía con
      "Ver código fuente").
   2. Marcala como admin corriendo esto en el SQL Editor (reemplazá el
      email):
        update auth.users
        set raw_app_meta_data = raw_app_meta_data || '{"is_admin": true}'::jsonb
        where email = 'admin@tudominio.com';
   3. En la web, el candado 🔒 ahora pide ese email + esa contraseña.
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
-- 2.1) TRIGGER — el ranking nunca puede "bajar"
--      El front ya manda siempre el máximo entre la racha guardada y la
--      nueva, pero cualquiera con su propia sesión podría llamar la API
--      de Supabase directo (con su token) y mandar cualquier valor para
--      SU PROPIA fila (la policy "users_update_own" se lo permite, porque
--      tiene que poder guardar su racha). Este trigger es la última
--      barrera: pase lo que pase desde el front, en la base nunca se
--      graba un best_streak/best_penal_streak menor al que ya había.
--      (No puede evitar que alguien invente una racha alta la primera
--      vez que juega — eso requeriría validar la partida en un server —
--      pero sí evita bajar el propio ranking o el de otros por error o
--      a propósito, y evita que un valor viejo pise uno más nuevo.)
-- ======================================================================
create or replace function public.pso_clamp_best_streaks()
returns trigger as $$
begin
  if TG_OP = 'UPDATE' then
    new.best_streak := greatest(coalesce(new.best_streak, 0), coalesce(old.best_streak, 0));
    new.best_penal_streak := greatest(coalesce(new.best_penal_streak, 0), coalesce(old.best_penal_streak, 0));
    new.created_at := old.created_at; -- tampoco se puede tocar la fecha de alta
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_pso_clamp_best_streaks on public.users;
create trigger trg_pso_clamp_best_streaks
  before update on public.users
  for each row execute function public.pso_clamp_best_streaks();

-- ======================================================================
-- 3) ÍNDICES para ranking rápido
-- ======================================================================
create index if not exists idx_users_streak        on public.users (best_streak desc);
create index if not exists idx_users_penal_streak  on public.users (best_penal_streak desc);

-- ======================================================================
-- 4) RECARGAR EL SCHEMA CACHE DE POSTGREST
--    Sin esto, la API puede seguir respondiendo
--    "PGRST205: Could not find the table 'public.kv' in the schema cache"
--    aunque la tabla ya exista (el front lo ve como servidor caído).
-- ======================================================================
notify pgrst, 'reload schema';

-- ======================================================================
-- 5) VERIFICACIÓN (opcional): debería listar kv y users
-- ======================================================================
-- select table_name from information_schema.tables
--   where table_schema = 'public' order by table_name;

