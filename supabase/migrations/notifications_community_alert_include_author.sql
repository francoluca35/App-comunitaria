-- Incluir al autor de la alerta en las notificaciones (antes se excluía con id <> author_id).
-- Así también ve la entrada en la campana y puede probar el flujo; el push llega igual si está suscripto.

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
