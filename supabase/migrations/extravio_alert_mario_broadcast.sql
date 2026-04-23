-- Alerta máxima: persona extraviada (posts.category = 'extravios', approved).
-- 1) Notificación community_alert_critical para todos los perfiles activos (push + campana).
-- 2) Mensaje privado desde la cuenta de Mario (emails conocidos) con system_generated = true
--    para no duplicar fila en campana vía trigger de chat.

insert into public.post_categories (slug, label, sort_order)
values ('extravios', 'Personas extraviadas', 0)
on conflict (slug) do update set label = excluded.label, sort_order = excluded.sort_order;

alter table public.chat_messages
	add column if not exists system_generated boolean not null default false;

comment on column public.chat_messages.system_generated is
	'Mensaje automático del sistema (p. ej. broadcast de Mario); no dispara notify_on_chat_message.';

create or replace function public.notify_on_chat_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
	sender_name text;
begin
	if coalesce(new.system_generated, false) then
		return new;
	end if;

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
			'community_alert',
			'community_alert_critical',
			'publicidad_pending',
			'publicidad_payment_link',
			'publicidad_rejected',
			'publicidad_active',
			'publicidad_comment'
		)
	);

create or replace function public.notify_extravio_broadcast()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
	r record;
	mario_id uuid;
	t text;
	b text;
	msg text;
	post_link text;
	wa_clean text;
	wa_line text;
begin
	select id into mario_id
	from public.profiles
	where lower(email) in ('mariostebler@gmail.com', 'steblermario@gmail.com')
	order by case when role = 'admin' then 0 when role = 'moderator' then 1 else 2 end
	limit 1;

	t := '🚨 PERSONA EXTRAVIADA — ' || left(trim(new.title), 100);
	b := left(trim(new.description), 500);
	if b = '' then
		b := 'Alerta máxima: revisá la publicación en la comunidad.';
	end if;

	post_link := '/post/' || new.id::text;

	wa_clean := regexp_replace(coalesce(new.whatsapp_number, ''), '\D', '', 'g');
	if wa_clean <> '' then
		wa_line := E'\nWhatsApp de contacto: https://wa.me/' || wa_clean;
	else
		wa_line := '';
	end if;

	msg :=
		E'🚨 PERSONA EXTRAVIADA\n«' || left(trim(new.title), 120) || E'»\n\n'
		|| 'Soy Mario. Tocá el enlace para abrir la publicación con las fotos y los detalles:' || E'\n'
		|| post_link
		|| wa_line;

	for r in
		select id from public.profiles
		where coalesce(status, 'active') <> 'blocked'
	loop
		insert into public.notifications (user_id, type, title, body, link_url, related_id)
		values (
			r.id,
			'community_alert_critical',
			t,
			b,
			post_link,
			new.id::text
		);

		if mario_id is not null and r.id <> mario_id then
			insert into public.chat_messages (sender_id, receiver_id, content, system_generated)
			values (mario_id, r.id, msg, true);
		end if;
	end loop;

	return new;
end;
$$;

drop trigger if exists on_post_extravio_insert on public.posts;
create trigger on_post_extravio_insert
	after insert on public.posts
	for each row
	when (new.category = 'extravios' and new.status = 'approved')
	execute function public.notify_extravio_broadcast();

drop trigger if exists on_post_extravio_approved on public.posts;
create trigger on_post_extravio_approved
	after update on public.posts
	for each row
	when (
		new.category = 'extravios'
		and new.status = 'approved'
		and coalesce(old.status, '') is distinct from 'approved'
	)
	execute function public.notify_extravio_broadcast();
