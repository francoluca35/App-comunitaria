-- Alertas (posts.category = 'alertas' y status approved): notificar a todos los perfiles activos.
-- Tipo community_alert: el cliente usa sonido + vibración obligatorios al recibirla.
-- Nombre con prefijo z_ para ejecutarse después de notifications_table_and_triggers y notifications_publicidad_types.

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
      'publicidad_active',
      'community_alert'
    )
  );

create or replace function public.notify_community_alert_broadcast()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  t text;
  b text;
begin
  t := '¡Alerta! ' || left(trim(new.title), 120);
  b := left(trim(new.description), 500);
  if b = '' then
    b := 'Nueva alerta en la comunidad.';
  end if;

  for r in
    select id from public.profiles
    where coalesce(status, 'active') <> 'blocked'
  loop
    insert into public.notifications (user_id, type, title, body, link_url, related_id)
    values (
      r.id,
      'community_alert',
      t,
      b,
      '/post/' || new.id::text,
      new.id::text
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists on_post_community_alert_insert on public.posts;
create trigger on_post_community_alert_insert
  after insert on public.posts
  for each row
  when (new.category = 'alertas' and new.status = 'approved')
  execute function public.notify_community_alert_broadcast();

drop trigger if exists on_post_community_alert_approved on public.posts;
create trigger on_post_community_alert_approved
  after update on public.posts
  for each row
  when (
    new.category = 'alertas'
    and new.status = 'approved'
    and coalesce(old.status, '') is distinct from 'approved'
  )
  execute function public.notify_community_alert_broadcast();
