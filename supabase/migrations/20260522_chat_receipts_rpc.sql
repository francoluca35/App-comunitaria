-- Acuses de lectura: RPC seguras (evitan bloqueos RLS al marcar entregado/leído)

alter table public.chat_messages
	add column if not exists delivered_at timestamptz,
	add column if not exists read_at timestamptz;

create index if not exists idx_chat_messages_receiver_unread
	on public.chat_messages (receiver_id, sender_id)
	where read_at is null;

drop policy if exists "Receivers can mark delivery and read" on public.chat_messages;
create policy "Receivers can mark delivery and read" on public.chat_messages
	for update
	using (receiver_id = auth.uid())
	with check (receiver_id = auth.uid());

drop function if exists public.mark_chat_message_delivered(uuid);
drop function if exists public.mark_chat_conversation_read(uuid);

create or replace function public.mark_chat_message_delivered(p_message_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
	if auth.uid() is null then
		raise exception 'not authenticated';
	end if;

	update public.chat_messages
	set delivered_at = now()
	where id = p_message_id
		and receiver_id = auth.uid()
		and delivered_at is null;
end;
$$;

create or replace function public.mark_chat_conversation_read(p_other_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
	if auth.uid() is null then
		raise exception 'not authenticated';
	end if;

	update public.chat_messages
	set read_at = now(),
		delivered_at = coalesce(delivered_at, now())
	where receiver_id = auth.uid()
		and sender_id = p_other_user_id
		and read_at is null;

	update public.chat_messages
	set delivered_at = now()
	where receiver_id = auth.uid()
		and sender_id = p_other_user_id
		and delivered_at is null;
end;
$$;

revoke all on function public.mark_chat_message_delivered(uuid) from public;
revoke all on function public.mark_chat_conversation_read(uuid) from public;
grant execute on function public.mark_chat_message_delivered(uuid) to authenticated;
grant execute on function public.mark_chat_conversation_read(uuid) to authenticated;
