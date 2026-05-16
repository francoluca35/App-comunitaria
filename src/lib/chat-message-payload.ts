/** Formato embebido en `chat_messages.content` para mensajes no texto (p. ej. audio). */

export const CHAT_AUDIO_PREFIX = '__CHAT_AUDIO__' as const
export const CHAT_IMAGE_PREFIX = '__CHAT_IMAGE__' as const

export type ChatAudioPayload = {
	u: string
	/** Duración aproximada en segundos (opcional, para mostrar antes de cargar metadata). */
	d?: number
}

export function encodeChatAudioMessage(payload: ChatAudioPayload): string {
	return `${CHAT_AUDIO_PREFIX}${JSON.stringify(payload)}`
}

export type ChatImagePayload = {
	u: string
}

export function encodeChatImageMessage(payload: ChatImagePayload): string {
	return `${CHAT_IMAGE_PREFIX}${JSON.stringify(payload)}`
}

export function parseChatMessagePayload(content: string):
	| { kind: 'text'; raw: string }
	| { kind: 'audio'; url: string; durationSec?: number; raw: string }
	| { kind: 'image'; url: string; raw: string } {
	if (content.startsWith(CHAT_IMAGE_PREFIX)) {
		try {
			const json = content.slice(CHAT_IMAGE_PREFIX.length)
			const p = JSON.parse(json) as ChatImagePayload
			if (p && typeof p.u === 'string' && p.u.length > 0) {
				return {
					kind: 'image',
					url: p.u,
					raw: content,
				}
			}
		} catch {
			/* seguir */
		}
	}
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
	if (p.kind === 'image') return 'Foto'
	return content.trim().replace(/\s+/g, ' ').slice(0, 80)
}

/** Cuerpo amigable para push / campana (sin URLs ni payloads internos). */
export function chatNotificationBody(content: string): string {
	const p = parseChatMessagePayload(content)
	if (p.kind === 'audio') return 'Te envió un mensaje de voz'
	if (p.kind === 'image') return 'Te envió una foto'
	const trimmed = content.trim().replace(/\s+/g, ' ')
	if (!trimmed) return 'Te envió un mensaje'
	if (trimmed.startsWith('__CHAT_') || trimmed.includes('.supabase.co')) {
		return 'Te envió un mensaje'
	}
	return trimmed.length > 120 ? `${trimmed.slice(0, 117)}…` : trimmed
}

/** Corrige textos viejos guardados en BD con JSON o URLs técnicas. */
export function sanitizeChatNotificationBody(body: string): string {
	const t = body.trim()
	if (!t) return 'Te envió un mensaje'
	if (t.startsWith('__CHAT_AUDIO__') || t.includes('__CHAT_AUDIO__')) {
		return 'Te envió un mensaje de voz'
	}
	if (t.startsWith('__CHAT_IMAGE__') || t.includes('__CHAT_IMAGE__')) {
		return 'Te envió una foto'
	}
	if (t.startsWith('__CHAT_') || t.includes('.supabase.co')) {
		return 'Te envió un mensaje'
	}
	return t.length > 220 ? `${t.slice(0, 217)}…` : t
}
