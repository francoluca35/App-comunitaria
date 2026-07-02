-- Índice para listados y borrado masivo de mensajes de chat.
-- Borrado manual: POST /api/chat/clear-all (usuario autenticado).

create index if not exists idx_chat_messages_created_at
	on public.chat_messages (created_at);
