-- Permite que cualquier usuario autenticado lea el perfil (id, name, avatar_url) de admin o moderador
-- para poder mostrar el chat de soporte sin usar service role.
create policy "Authenticated can read support profiles (admin or moderator)"
  on public.profiles for select
  using (
    auth.uid() is not null
    and role in ('admin', 'moderator')
  );
