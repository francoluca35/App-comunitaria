-- Rol moderator y suspensión por días (sin publicar/comentar hasta fecha)
-- Ejecutar en Supabase → SQL Editor

-- Permitir rol 'moderator' en profiles
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('viewer', 'moderator', 'admin'));

-- Fecha hasta la cual el usuario está suspendido (no puede publicar ni comentar)
alter table public.profiles add column if not exists suspended_until timestamptz;

create index if not exists idx_profiles_suspended_until on public.profiles(suspended_until) where suspended_until is not null;

comment on column public.profiles.suspended_until is 'Si es mayor que now(), el usuario no puede publicar ni comentar.';
