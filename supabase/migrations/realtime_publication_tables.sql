-- Habilitar Realtime para que las notificaciones en tiempo real funcionen.
-- Ejecutar en Supabase → SQL Editor (solo una vez).
-- Si da error "already in publication", ignorar.

ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
