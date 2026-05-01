-- Vecinos autenticados pueden listar admin/moderador para elegir con quién chatear (UI /api/message/admins).
-- Sin esto, sin SERVICE_ROLE_KEY el SELECT con el JWT del usuario queda vacío por RLS.

drop policy if exists "Authenticated can read staff profiles for chat directory" on public.profiles;

create policy "Authenticated can read staff profiles for chat directory"
	on public.profiles
	for select
	to authenticated
	using (role in ('admin', 'moderator'));
