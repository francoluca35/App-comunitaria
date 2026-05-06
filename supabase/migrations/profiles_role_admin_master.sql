-- Rol admin_master: puede cambiar la foto pública del referente (Mario) vía API con service role.
-- No reemplaza a admin en políticas RLS salvo migraciones futuras explícitas.

alter table public.profiles drop constraint if exists profiles_role_check;

alter table public.profiles add constraint profiles_role_check
	check (role in ('viewer', 'moderator', 'admin', 'admin_master'));
