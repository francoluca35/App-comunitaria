-- Publicidades: promoción lateral (flag)
-- Ejecutar en Supabase → SQL Editor

alter table public.publicidad_requests
  add column if not exists promote_lateral boolean not null default false;

create index if not exists idx_publicidad_requests_promote_lateral
  on public.publicidad_requests(promote_lateral);

