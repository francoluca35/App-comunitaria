-- Notificaciones de nuevo perfil para admin (con datos para conocerlo) + tipo new_profile
-- Ejecutar en Supabase → SQL Editor (conviene tener ya ejecutado profiles_register_fields)

alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (type in ('message', 'comment', 'post_approved', 'post_rejected', 'post_deleted', 'post_pending', 'new_profile'));

-- Trigger: nuevo perfil creado -> notificar a cada admin con datos del perfil
create or replace function public.notify_on_profile_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  body_text text;
begin
  body_text := 'Nombre: ' || coalesce(trim(new.name), '-') || E'\n'
    || 'Email: ' || coalesce(trim(new.email), '-');
  if coalesce(trim(new.phone), '') != '' then
    body_text := body_text || E'\nTeléfono: ' || trim(new.phone);
  end if;
  if coalesce(trim(new.locality), '') != '' then
    body_text := body_text || E'\nLocalidad: ' || trim(new.locality);
  end if;
  if coalesce(trim(new.province), '') != '' then
    body_text := body_text || E'\nProvincia: ' || trim(new.province);
  end if;
  for r in select id from profiles where role in ('admin', 'moderator') and id != new.id
  loop
    insert into notifications (user_id, type, title, body, link_url, related_id)
    values (
      r.id,
      'new_profile',
      'Nuevo perfil registrado',
      body_text,
      '/admin/messages/chat/' || new.id::text,
      new.id::text
    );
  end loop;
  return new;
end;
$$;

drop trigger if exists on_profile_created_notify on public.profiles;
create trigger on_profile_created_notify
  after insert on public.profiles
  for each row execute function public.notify_on_profile_created();
