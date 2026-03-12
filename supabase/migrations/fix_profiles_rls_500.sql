-- Si GET /rest/v1/profiles devuelve 500, suele deberse a RLS que consulta la misma tabla.
-- Este migration reemplaza la política de admins por una función con SECURITY DEFINER
-- para evitar recursión/error. Ejecutar en Supabase → SQL Editor.

-- Función que solo lee auth.uid() y la fila de profiles; no pasa por RLS de profiles.
create or replace function public.current_user_is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Quitar política que puede causar 500
drop policy if exists "Admins can read all profiles" on public.profiles;

-- Nueva política usando la función
create policy "Admins can read all profiles" on public.profiles
  for select using (public.current_user_is_admin());
