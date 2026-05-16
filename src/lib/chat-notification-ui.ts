/** Tipos y utilidades compartidas entre campana (sin chat) y hub flotante de mensajes. */

export interface ChatNotificationRow {
	id: string
	type: string
	title: string
	body: string | null
	link_url: string | null
	related_id: string | null
	read_at: string | null
	created_at: string
}

export function resolveMessageLink(
	n: ChatNotificationRow,
	currentUser: { isAdmin?: boolean; isModerator?: boolean } | null
): string {
	if (n.type !== 'message') return n.link_url ?? '/'
	const u = n.link_url ?? ''
	if (u.startsWith('/admin/messages/chat/')) return u
	/** Vecino ↔ equipo; admins/moderadores abren bandeja admin */
	if (u.startsWith('/message/')) {
		const peerMatch = u.match(/^\/message\/([^/]+)$/)
		if (peerMatch && (currentUser?.isAdmin || currentUser?.isModerator)) {
			return `/admin/messages/chat/${peerMatch[1]}`
		}
		return u
	}
	if (u === '/message' || u === '/message/') return '/message/mario'
	if (u === '/chat') {
		if (currentUser?.isAdmin || currentUser?.isModerator) return '/admin/messages'
		return '/message/contactos'
	}
	return u.startsWith('/') ? u : '/'
}

/**
 * @param marioProfileId id del perfil Mario (solo vecinos); si el remitente coincide → `/message/mario` canónico.
 */
export function messageChatInboxUrl(
	senderId: string,
	currentUser: { isAdmin?: boolean; isModerator?: boolean } | null,
	marioProfileId?: string | null
): string {
	if (currentUser?.isAdmin || currentUser?.isModerator) {
		return `/admin/messages/chat/${senderId}`
	}
	if (marioProfileId && senderId === marioProfileId) {
		return '/message/mario'
	}
	return `/message/${senderId}`
}

export type MessageThreadGroup = { peerId: string; items: ChatNotificationRow[] }

/** Agrupa solo notificaciones `type === 'message'` por related_id (remitente). */
export function groupMessageThreads(notifications: ChatNotificationRow[]): MessageThreadGroup[] {
	const msgs = notifications.filter((n) => n.type === 'message')
	const byTime = [...msgs].sort(
		(a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
	)
	const consumed = new Set<string>()
	const groups: MessageThreadGroup[] = []
	for (const n of byTime) {
		if (consumed.has(n.id)) continue
		const peer = n.related_id ?? ''
		const group = byTime.filter((x) => (x.related_id ?? '') === peer)
		group.forEach((x) => consumed.add(x.id))
		group.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
		groups.push({ peerId: peer, items: group })
	}
	groups.sort(
		(a, b) =>
			new Date(b.items[0]!.created_at).getTime() - new Date(a.items[0]!.created_at).getTime()
	)
	return groups
}
