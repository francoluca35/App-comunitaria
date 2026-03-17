-- Security Advisor: fix Function Search Path Mutable para public.handle_new_user
-- Ejecutar en Supabase → SQL Editor
--
-- 2) Leaked password protection: en el Dashboard ir a
--    Authentication → Providers → Email → "Enable leaked password protection" = ON

-- Fijar search_path en la función existente (evita inyección de esquemas maliciosos)
alter function public.handle_new_user() set search_path = public;
