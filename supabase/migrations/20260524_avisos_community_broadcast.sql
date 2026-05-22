-- Avisos aprobados: notificación masiva + mensaje de Mario a cada vecino (como alertas, sin prioridad crítica).

alter table public.chat_messages
	add column if not exists system_generated boolean not null default false;

create or replace function public.notify_avisos_community_broadcast()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
	mario_id uuid;
	post_url text;
	notif_title text;
	notif_body text;
	chat_content text;
	wa_clean text;
	wa_line text;
	u record;
begin
	if new.category <> 'avisos' then
		return new;
	end if;

	if not (
		(tg_op = 'INSERT' and new.status = 'approved')
		or (tg_op = 'UPDATE' and new.status = 'approved' and (old.status is distinct from 'approved'))
	) then
		return new;
	end if;

	post_url := '/post/' || new.id::text;
	notif_title := 'Nuevo aviso: ' || left(new.title, 120);
	notif_body := left(regexp_replace(new.description, '\s+', ' ', 'g'), 240);

	chat_content :=
		'Hay un nuevo aviso en la comunidad: «' || new.title || '». Ver publicación: ' || post_url;

	wa_clean := regexp_replace(coalesce(new.whatsapp_number, ''), '\D', '', 'g');
	if wa_clean <> '' then
		wa_line := E'\n\nContacto WhatsApp: https://wa.me/' || wa_clean;
		chat_content := chat_content || wa_line;
	end if;

	select p.id into mario_id
	from public.profiles p
	where lower(p.email) in ('mariostebler@gmail.com', 'steblermario@gmail.com')
	order by case p.role
		when 'admin' then 0
		when 'admin_master' then 1
		when 'moderator' then 2
		else 3
	end
	limit 1;

	if mario_id is null then
		raise warning 'notify_avisos_community_broadcast: perfil Mario no encontrado';
		return new;
	end if;

	for u in
		select id from public.profiles
		where status = 'active' and id <> new.author_id
	loop
		insert into public.notifications (user_id, type, title, body, link_url, related_id)
		values (u.id, 'community_notice', notif_title, notif_body, post_url, new.id::text);

		insert into public.chat_messages (sender_id, receiver_id, content, system_generated)
		values (mario_id, u.id, chat_content, true);
	end loop;

	return new;
end;
$$;

drop trigger if exists on_post_avisos_broadcast_insert on public.posts;
create trigger on_post_avisos_broadcast_insert
	after insert on public.posts
	for each row
	execute function public.notify_avisos_community_broadcast();

drop trigger if exists on_post_avisos_broadcast_update on public.posts;
create trigger on_post_avisos_broadcast_update
	after update of status on public.posts
	for each row
	execute function public.notify_avisos_community_broadcast();
