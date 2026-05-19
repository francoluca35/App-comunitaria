-- Acuses de lectura en chat: enviado → recibido → leído

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
