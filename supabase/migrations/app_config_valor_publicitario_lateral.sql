-- Valor publicitario lateral (precio de referencia) en app_config
-- Ejecutar en Supabase → SQL Editor
-- Requiere: tabla public.app_config ya creada

insert into public.app_config (key, value) values ('valor_publicitario_lateral', '0'::jsonb)
on conflict (key) do nothing;

