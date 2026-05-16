import { sanitizeChatNotificationBody } from '@/lib/chat-message-payload'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { ensureWebPushConfigured, webpush } from '@/lib/web-push-config'

export type NotificationPushRecord = {
	user_id?: string
	type?: string
	title?: string
	body?: string | null
	link_url?: string | null
	related_id?: string | null
}

export type WebPushPayload = {
	title: string
	body: string
	tag: string
	url: string
	urgent: boolean
	critical: boolean
	kind: 'message' | 'community_alert'
}

const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isUuid(s: string): boolean {
	return UUID_RE.test(s)
}

/** Arma el JSON del push según el tipo de notificación (alertas comunitarias o chat). */
export function buildWebPushPayload(record: NotificationPushRecord): WebPushPayload | null {
	if (record.type === 'community_alert_critical') {
		const tag = `extravio-alert-${record.related_id ?? 'unknown'}`
		return {
			title: record.title ?? 'Alerta',
			body: record.body ?? '',
			tag,
			url: record.link_url ?? '/',
			urgent: true,
			critical: true,
			kind: 'community_alert',
		}
	}
	if (record.type === 'community_alert') {
		const tag = `community-alert-${record.related_id ?? 'unknown'}`
		return {
			title: record.title ?? 'Alerta',
			body: record.body ?? '',
			tag,
			url: record.link_url ?? '/',
			urgent: true,
			critical: false,
			kind: 'community_alert',
		}
	}
	if (record.type === 'message') {
		const peer =
			record.related_id && isUuid(record.related_id) ? record.related_id : 'unknown'
		const title = (record.title ?? '').trim() || 'Nuevo mensaje'
		const bodyRaw = sanitizeChatNotificationBody(
			(record.body ?? 'Te escribieron').trim() || 'Te enviaron un mensaje'
		)
		const body = bodyRaw.length > 220 ? `${bodyRaw.slice(0, 217)}…` : bodyRaw
		const url =
			typeof record.link_url === 'string' && record.link_url.startsWith('/')
				? record.link_url
				: '/message/contactos'
		return {
			title,
			body,
			tag: `chat-peer-${peer}`,
			url,
			urgent: true,
			critical: false,
			kind: 'message',
		}
	}
	return null
}

export async function sendWebPushToUserDevices(
	supabase: NonNullable<ReturnType<typeof createServiceRoleClient>>,
	userId: string,
	payload: WebPushPayload
): Promise<{ sent: number; errors: string[]; fatal?: boolean }> {
	if (!ensureWebPushConfigured()) {
		return { sent: 0, errors: ['VAPID no configurado'], fatal: true }
	}

	const { data: rows, error } = await supabase
		.from('push_subscriptions')
		.select('endpoint, p256dh, auth')
		.eq('user_id', userId)

	if (error) {
		console.error('[web-push-dispatch] select push_subscriptions:', error)
		return { sent: 0, errors: [error.message], fatal: true }
	}
	if (!rows?.length) {
		return { sent: 0, errors: [] }
	}

	const json = JSON.stringify({
		title: payload.title,
		body: payload.body,
		tag: payload.tag,
		url: payload.url,
		urgent: payload.urgent,
		critical: payload.critical,
		kind: payload.kind,
	})

	let sent = 0
	const errors: string[] = []

	for (const row of rows) {
		const sub = {
			endpoint: row.endpoint as string,
			keys: { p256dh: row.p256dh as string, auth: row.auth as string },
		}
		try {
			await webpush.sendNotification(sub, json, {
				TTL: 86400,
				urgency: 'high',
			})
			sent += 1
		} catch (err: unknown) {
			const status = (err as { statusCode?: number })?.statusCode
			const body = (err as { body?: string })?.body
			if (status === 410 || status === 404) {
				await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
			} else {
				const msg = typeof body === 'string' ? body.slice(0, 120) : String(status ?? err)
				errors.push(msg)
				console.warn('[web-push-dispatch] webpush send:', status, body)
			}
		}
	}

	return { sent, errors }
}

/** Envía push de mensaje al destinatario usando la fila `notifications` del trigger (con reintento breve). */
export async function dispatchMessagePushForChatMessage(
	svc: NonNullable<ReturnType<typeof createServiceRoleClient>>,
	senderId: string,
	receiverId: string,
	messageId: string
): Promise<{ sent: number; errors: string[] }> {
	const { data: msg, error: msgErr } = await svc
		.from('chat_messages')
		.select('id, sender_id, receiver_id, system_generated')
		.eq('id', messageId)
		.maybeSingle()

	if (msgErr || !msg) {
		return { sent: 0, errors: [msgErr?.message ?? 'Mensaje no encontrado'] }
	}
	if (msg.sender_id !== senderId || msg.receiver_id !== receiverId) {
		return { sent: 0, errors: ['No autorizado para este mensaje'] }
	}
	if (msg.system_generated) {
		return { sent: 0, errors: [] }
	}

	const loadNotif = async () => {
		const { data } = await svc
			.from('notifications')
			.select('user_id, type, title, body, link_url, related_id')
			.eq('user_id', receiverId)
			.eq('type', 'message')
			.eq('related_id', senderId)
			.order('created_at', { ascending: false })
			.limit(1)
			.maybeSingle()
		return data
	}

	let notif = await loadNotif()
	if (!notif) {
		await new Promise((r) => setTimeout(r, 120))
		notif = await loadNotif()
	}

	if (!notif) {
		const { data: sender } = await svc.from('profiles').select('name').eq('id', senderId).maybeSingle()
		const title = (sender?.name as string | undefined)?.trim() || 'Nuevo mensaje'
		notif = {
			user_id: receiverId,
			type: 'message',
			title,
			body: 'Te enviaron un mensaje',
			link_url: `/message/${senderId}`,
			related_id: senderId,
		}
	}

	const pushPayload = buildWebPushPayload(notif)
	if (!pushPayload) {
		return { sent: 0, errors: ['payload inválido'] }
	}

	const { sent, errors, fatal } = await sendWebPushToUserDevices(svc, receiverId, pushPayload)
	if (fatal) {
		return { sent: 0, errors }
	}
	return { sent, errors }
}
