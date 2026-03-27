-- Agregar tipos de notificaciones para el flujo de publicidades
-- Ejecutar en Supabase → SQL Editor

alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (
    type in (
      'message',
      'comment',
      'post_approved',
      'post_rejected',
      'post_deleted',
      'post_pending',
      'new_profile',
      'publicidad_pending',
      'publicidad_payment_link',
      'publicidad_rejected',
      'publicidad_active'
    )
  );

