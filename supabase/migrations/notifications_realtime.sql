-- Realtime en tabla notifications (mensajes vía trigger, alertas, etc.)
-- Ejecutar en Supabase SQL Editor si no está en la publicación.

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
