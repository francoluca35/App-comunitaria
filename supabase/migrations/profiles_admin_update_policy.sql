-- Permitir que los administradores actualicen perfiles (role/status/suspended_until).
-- Sin esta policy, el update puede fallar silenciosamente (RLS) y el endpoint
-- `PATCH /api/admin/users/[id]` termina devolviendo "Perfil no encontrado" o 403.

drop policy if exists "Admins can update profiles" on public.profiles;

create policy "Admins can update profiles"
  on public.profiles
  for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

