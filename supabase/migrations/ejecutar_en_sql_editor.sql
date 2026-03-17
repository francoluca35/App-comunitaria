-- Copiá y pegá TODO este archivo en Supabase → SQL Editor → Run

-- 1) Columna de preferencia de notificaciones
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notification_preference text
  CHECK (notification_preference IS NULL OR notification_preference IN ('all', 'custom', 'messages_only'));

COMMENT ON COLUMN public.profiles.notification_preference IS 'Preferencia: all, custom, messages_only. Null = aún no eligió.';

-- 2) Security Advisor: search_path en handle_new_user
ALTER FUNCTION public.handle_new_user() SET search_path = public;
