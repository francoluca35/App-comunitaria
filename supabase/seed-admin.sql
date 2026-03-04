-- ============================================
-- Dejar un usuario como ADMIN
-- Ejecutar en Supabase → SQL Editor
-- ============================================
-- 1) Creá el usuario desde la app: Iniciar sesión / Registrarse
--    con el email que quieras (ej. admin@comunidad.com) y una contraseña.
-- 2) Ejecutá este SQL (cambiá el email si usaste otro).

update public.profiles
set role = 'admin'
where email = 'admin@comunidad.com';

-- Para otro email, usá por ejemplo:
-- update public.profiles set role = 'admin' where email = 'tu@email.com';
