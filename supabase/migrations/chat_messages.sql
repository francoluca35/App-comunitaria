-- ============================================
-- Chat en la aplicación – mensajes entre usuarios
-- Ejecutar en Supabase → SQL Editor
-- ============================================

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_chat_messages_sender_receiver
  on public.chat_messages(sender_id, receiver_id);
create index if not exists idx_chat_messages_receiver_sender
  on public.chat_messages(receiver_id, sender_id);
create index if not exists idx_chat_messages_created_at
  on public.chat_messages(created_at desc);

alter table public.chat_messages enable row level security;

-- Solo podés leer mensajes donde sos emisor o receptor
create policy "Users can read own conversations"
  on public.chat_messages for select
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

-- Solo podés enviar mensajes como vos mismo (sender_id = auth.uid())
create policy "Users can send messages as themselves"
  on public.chat_messages for insert
  with check (auth.uid() = sender_id);

-- Realtime: para que los mensajes nuevos aparezcan al instante sin recargar
alter publication supabase_realtime add table public.chat_messages;
