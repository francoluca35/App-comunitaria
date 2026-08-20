-- Presencia global: heartbeat de usuarios logueados para el panel admin.

create table if not exists public.user_presence (
	user_id uuid primary key references auth.users (id) on delete cascade,
	last_seen_at timestamptz not null default now()
);

create index if not exists idx_user_presence_last_seen_at
	on public.user_presence (last_seen_at desc);

alter table public.user_presence enable row level security;

-- Solo el propio usuario puede escribir/leer su fila vía cliente autenticado.
-- El conteo admin usa service role (bypass RLS).
drop policy if exists "user_presence_select_own" on public.user_presence;
create policy "user_presence_select_own"
	on public.user_presence
	for select
	to authenticated
	using (auth.uid() = user_id);

drop policy if exists "user_presence_insert_own" on public.user_presence;
create policy "user_presence_insert_own"
	on public.user_presence
	for insert
	to authenticated
	with check (auth.uid() = user_id);

drop policy if exists "user_presence_update_own" on public.user_presence;
create policy "user_presence_update_own"
	on public.user_presence
	for update
	to authenticated
	using (auth.uid() = user_id)
	with check (auth.uid() = user_id);
