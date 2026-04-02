-- Notificaciones activas por defecto: nuevos perfiles y los que tenían null pasan a 'all'.
-- Quien quiera menos avisos lo cambia en Configuración.

alter table public.profiles
  alter column notification_preference set default 'all';

update public.profiles
set notification_preference = 'all'
where notification_preference is null;

comment on column public.profiles.notification_preference is
  'Preferencia: all (por defecto, todas activas), custom (personalizado), messages_only (solo mensajes).';
