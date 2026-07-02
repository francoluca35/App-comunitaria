/** Mensajes de chat (texto, audio, imagen, avisos automáticos) se conservan 72 h. */
export const CHAT_MESSAGE_RETENTION_HOURS = 72
export const CHAT_MESSAGE_RETENTION_MS = CHAT_MESSAGE_RETENTION_HOURS * 60 * 60 * 1000

export function chatMessageRetentionCutoffIso(now = Date.now()): string {
	return new Date(now - CHAT_MESSAGE_RETENTION_MS).toISOString()
}
