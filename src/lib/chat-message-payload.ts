/** Formato embebido en `chat_messages.content` para mensajes no texto (p. ej. audio). */

export const CHAT_AUDIO_PREFIX = '__CHAT_AUDIO__' as const

export type ChatAudioPayload = {
	u: string
	/** Duración aproximada en segundos (opcional, para mostrar antes de cargar metadata). */
	d?: number
}

export function encodeChatAudioMessage(payload: ChatAudioPayload): string {
	return `${CHAT_AUDIO_PREFIX}${JSON.stringify(payload)}`
}

export function parseChatMessagePayload(content: string):
	| { kind: 'text'; raw: string }
	| { kind: 'audio'; url: string; durationSec?: number; raw: string } {
	if (content.startsWith(CHAT_AUDIO_PREFIX)) {
		try {
			const json = content.slice(CHAT_AUDIO_PREFIX.length)
			const p = JSON.parse(json) as ChatAudioPayload
			if (p && typeof p.u === 'string' && p.u.length > 0) {
				return {
					kind: 'audio',
					url: p.u,
					durationSec: typeof p.d === 'number' && Number.isFinite(p.d) ? p.d : undefined,
					raw: content,
				}
			}
		} catch {
			/* seguir como texto */
		}
	}
	return { kind: 'text', raw: content }
}

/** Una línea para listas / notificaciones. */
export function chatContentPreviewLine(content: string): string {
	const p = parseChatMessagePayload(content)
	if (p.kind === 'audio') return 'Mensaje de voz'
	return content.trim().replace(/\s+/g, ' ').slice(0, 80)
}
