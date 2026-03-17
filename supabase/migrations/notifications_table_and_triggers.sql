-- Tabla de notificaciones para la campana (mensajes, comentarios, publicaciones aprobadas/rechazadas/eliminadas)
-- Ejecutar en Supabase → SQL Editor

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('message', 'comment', 'post_approved', 'post_rejected', 'post_deleted', 'post_pending')),
  title text not null,
  body text,
  link_url text,
  related_id text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_notifications_user_read_created on public.notifications(user_id, read_at, created_at desc);

alter table public.notifications enable row level security;

create policy "Users can read own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "Users can update own notifications (mark read)"
  on public.notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Los inserts los hacen solo los triggers (security definer); no hay policy INSERT para usuarios.

-- Trigger: nuevo mensaje de chat -> notificar al receptor
create or replace function public.notify_on_chat_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  sender_name text;
begin
  select name into sender_name from profiles where id = new.sender_id;
  insert into notifications (user_id, type, title, body, link_url, related_id)
  values (
    new.receiver_id,
    'message',
    'Nuevo mensaje',
    coalesce(trim(sender_name), 'Alguien') || ' te envió un mensaje',
    '/chat',
    new.id::text
  );
  return new;
end;
$$;

drop trigger if exists on_chat_message_notify on public.chat_messages;
create trigger on_chat_message_notify
  after insert on public.chat_messages
  for each row execute function public.notify_on_chat_message();

-- Trigger: nuevo comentario -> notificar al autor del post (si no es el mismo)
create or replace function public.notify_on_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  post_author_id uuid;
  commenter_name text;
begin
  select author_id into post_author_id from posts where id = new.post_id;
  if post_author_id is null or post_author_id = new.author_id then
    return new;
  end if;
  select name into commenter_name from profiles where id = new.author_id;
  insert into notifications (user_id, type, title, body, link_url, related_id)
  values (
    post_author_id,
    'comment',
    'Nuevo comentario',
    coalesce(trim(commenter_name), 'Alguien') || ' comentó en tu publicación',
    '/post/' || new.post_id::text,
    new.id::text
  );
  return new;
end;
$$;

drop trigger if exists on_comment_notify on public.comments;
create trigger on_comment_notify
  after insert on public.comments
  for each row execute function public.notify_on_comment();

-- Trigger: nueva publicación pendiente -> notificar a cada admin/moderador
create or replace function public.notify_on_post_pending()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  author_name text;
  r record;
begin
  if new.status != 'pending' then
    return new;
  end if;
  select name into author_name from profiles where id = new.author_id;
  for r in select id from profiles where role in ('admin', 'moderator')
  loop
    insert into notifications (user_id, type, title, body, link_url, related_id)
    values (
      r.id,
      'post_pending',
      'Publicación para moderar',
      coalesce(trim(author_name), 'Alguien') || ' hizo una publicación - moderar',
      '/admin/moderation',
      new.id::text
    );
  end loop;
  return new;
end;
$$;

drop trigger if exists on_post_pending_notify on public.posts;
create trigger on_post_pending_notify
  after insert on public.posts
  for each row execute function public.notify_on_post_pending();

-- Trigger: post aprobado o rechazado -> notificar al autor
create or replace function public.notify_on_post_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status is not distinct from new.status then
    return new;
  end if;
  if new.status = 'approved' then
    insert into notifications (user_id, type, title, body, link_url, related_id)
    values (new.author_id, 'post_approved', 'Publicación aprobada', 'Tu publicación fue aprobada y ya está publicada.', '/', new.id::text);
  elsif new.status = 'rejected' then
    insert into notifications (user_id, type, title, body, link_url, related_id)
    values (new.author_id, 'post_rejected', 'Publicación rechazada', 'Tu publicación fue rechazada por el equipo de moderación.', '/mis-publicaciones', new.id::text);
  end if;
  return new;
end;
$$;

drop trigger if exists on_post_status_notify on public.posts;
create trigger on_post_status_notify
  after update on public.posts
  for each row execute function public.notify_on_post_status_change();

-- Trigger: post eliminado -> notificar al autor (usamos OLD)
create or replace function public.notify_on_post_deleted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into notifications (user_id, type, title, body, link_url, related_id)
  values (old.author_id, 'post_deleted', 'Publicación eliminada', 'Tu publicación fue eliminada permanentemente.', '/mis-publicaciones', old.id::text);
  return old;
end;
$$;

drop trigger if exists on_post_deleted_notify on public.posts;
create trigger on_post_deleted_notify
  before delete on public.posts
  for each row execute function public.notify_on_post_deleted();

-- Realtime para que la campana se actualice en vivo
alter publication supabase_realtime add table public.notifications;
