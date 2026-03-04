-- Permite que un usuario cree su propia fila en profiles si no existe
-- (útil cuando el usuario existe en Auth pero el trigger no creó el perfil)
-- Ejecutar en Supabase → SQL Editor

create policy "Users can insert own profile"
on public.profiles for insert
with check (auth.uid() = id);
