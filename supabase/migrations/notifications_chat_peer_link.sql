-- Chat: una fila de notificación por mensaje sigue existiendo en BD, pero related_id pasa a ser el
-- remitente (sender_id) para poder agrupar en UI; link_url lleva al hilo correcto (admin vs /message).
-- body incluye vista previa del texto del mensaje.

create or replace function public.notify_on_chat_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
	sender_name text;
	recv_role text;
	preview text;
	link text;
	msg_title text;
	msg_body text;
begin
	if coalesce(new.system_generated, false) then
		return new;
	end if;

	select name into sender_name from profiles where id = new.sender_id;
	select role into recv_role from profiles where id = new.receiver_id;

	preview := left(regexp_replace(trim(coalesce(new.content, '')), E'\\s+', ' ', 'g'), 120);

	if recv_role = 'admin' or recv_role = 'moderator' then
		link := '/admin/messages/chat/' || new.sender_id::text;
	else
		link := '/message';
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
