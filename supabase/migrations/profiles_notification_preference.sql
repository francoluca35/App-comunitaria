-- Preferencia de notificaciones: 'all' | 'custom' | 'messages_only'
-- Ejecutar en Supabase → SQL Editor

alter table public.profiles
  add column if not exists notification_preference text
  check (notification_preference is null or notification_preference in ('all', 'custom', 'messages_only'));

comment on column public.profiles.notification_preference is 'Preferencia de notificaciones: all (todas), custom (personalizado), messages_only (solo mensajes). Null = aún no eligió.';
