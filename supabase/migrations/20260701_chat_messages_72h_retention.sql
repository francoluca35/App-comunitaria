-- Retención 72 h de mensajes de chat (texto, audio, imagen, avisos automáticos).
-- Limpieza completa (DB + Storage): GET /api/cron/cleanup-chat-messages con CRON_SECRET (cada hora).

create index if not exists idx_chat_messages_created_at
	on public.chat_messages (created_at);
