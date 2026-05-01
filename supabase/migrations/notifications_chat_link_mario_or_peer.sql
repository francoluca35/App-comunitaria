-- Enlaces de notificación de chat: /message/mario si el remitente es Mario (emails conocidos);
-- si otro admin/moderador envía a un vecino, link /message/{sender_id}.

create or replace function public.notify_on_chat_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
	sender_name text;
	sender_email text;
	recv_role text;
	preview text;
	link text;
	msg_title text;
	msg_body text;
	sender_is_mario boolean;
begin
	if coalesce(new.system_generated, false) then
		return new;
	end if;

	select name, lower(trim(coalesce(email, ''))) into sender_name, sender_email from profiles where id = new.sender_id;
	select role into recv_role from profiles where id = new.receiver_id;

	sender_is_mario := sender_email in ('mariostebler@gmail.com', 'steblermario@gmail.com');

	preview := left(regexp_replace(trim(coalesce(new.content, '')), E'\\s+', ' ', 'g'), 120);

	if recv_role = 'admin' or recv_role = 'moderator' then
		link := '/admin/messages/chat/' || new.sender_id::text;
	elsif sender_is_mario then
		link := '/message/mario';
	else
		link := '/message/' || new.sender_id::text;
	end if;

	msg_title := coalesce(nullif(trim(sender_name), ''), 'Alguien');
	if coalesce(preview, '') = '' then
		msg_body := 'Te envió un mensaje';
	else
		msg_body := preview;
	end if;

	insert into notifications (user_id, type, title, body, link_url, related_id)
	values (
		new.receiver_id,
		'message',
		msg_title,
		msg_body,
		link,
		new.sender_id::text
	);
	return new;
end;
$$;
