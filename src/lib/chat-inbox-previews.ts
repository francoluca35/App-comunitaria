import type { SupabaseClient } from '@supabase/supabase-js'
import { format, isToday, isYesterday } from 'date-fns'
import { es } from 'date-fns/locale'
import { chatContentPreviewLine } from '@/lib/chat-message-payload'

export type ChatPreviewRow = {
	sender_id: string
	receiver_id: string
	content: string
	created_at: string
}

export type PeerPreview = { preview: string; createdAt: string }

/**
 * A partir de mensajes ya ordenados por `created_at` descendente, toma el más reciente por interlocutor.
 */
export function previewsFromMessagesDesc(rows: ChatPreviewRow[], myId: string): Record<string, PeerPreview> {
	const out: Record<string, PeerPreview> = {}
	for (const row of rows) {
		const peer = row.sender_id === myId ? row.receiver_id : row.sender_id
		if (out[peer]) continue
		out[peer] = {
			preview: chatContentPreviewLine(row.content),
			createdAt: row.created_at,
		}
	}
	return out
}

/** Carga vistas previas del último mensaje por conversación (usuario actual como participante). */
export async function loadChatInboxPreviews(
	supabase: SupabaseClient,
	myId: string,
	limit = 2500
): Promise<Record<string, PeerPreview>> {
	const { data, error } = await supabase
		.from('chat_messages')
		.select('sender_id, receiver_id, content, created_at')
		.or(`sender_id.eq.${myId},receiver_id.eq.${myId}`)
		.order('created_at', { ascending: false })
		.limit(limit)

	if (error || !data?.length) return {}
	return previewsFromMessagesDesc(data as ChatPreviewRow[], myId)
}

/** Ids de interlocutores ordenados del chat más reciente al más antiguo. */
export function sortPeerIdsByRecentChat(lastByPeer: Record<string, PeerPreview>): string[] {
	return Object.entries(lastByPeer)
		.sort(([, a], [, b]) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
		.map(([id]) => id)
}

/** Ordena filas de lista (p. ej. perfiles) por último mensaje; sin actividad van alfabético al final. */
export function sortByChatRecency<T extends { id: string; name?: string | null; email?: string | null }>(
	items: T[],
	lastByPeer: Record<string, PeerPreview>
): T[] {
	const order = sortPeerIdsByRecentChat(lastByPeer)
	const idx = new Map(order.map((id, i) => [id, i]))
	return [...items].sort((a, b) => {
		const ia = idx.get(a.id)
		const ib = idx.get(b.id)
		if (ia !== undefined && ib !== undefined) return ia - ib
		if (ia !== undefined) return -1
		if (ib !== undefined) return 1
		const na = (a.name ?? a.email ?? '').trim()
		const nb = (b.name ?? b.email ?? '').trim()
		return na.localeCompare(nb, 'es', { sensitivity: 'base' })
	})
}

/** Hora / fecha corta estilo lista de chats (hoy HH:mm, ayer “Ayer”, si no dd/MM/yy). */
export function formatChatListTime(iso: string): string {
	const d = new Date(iso)
	if (Number.isNaN(d.getTime())) return ''
	if (isToday(d)) return format(d, 'HH:mm')
	if (isYesterday(d)) return 'Ayer'
	return format(d, 'dd/MM/yy', { locale: es })
}

export type ContactosOrderedRow<T> = { kind: 'mario' } | { kind: 'profile'; profile: T }

/** Mario + perfiles filtrados: primero por fecha del último mensaje (entre los visibles), luego sin mensajes alfabético. */
export function orderedContactosRows<T extends { id: string; name?: string | null; email?: string | null }>(
	filteredProfiles: T[],
	marioPeerId: string | null,
	lastByPeer: Record<string, PeerPreview>
): ContactosOrderedRow<T>[] {
	const peerOrder = sortPeerIdsByRecentChat(lastByPeer)
	const profileById = new Map(filteredProfiles.map((p) => [p.id, p]))
	const rows: ContactosOrderedRow<T>[] = []
	const seenProfile = new Set<string>()
	let marioAdded = false

	for (const peerId of peerOrder) {
		if (marioPeerId && peerId === marioPeerId) {
			rows.push({ kind: 'mario' })
			marioAdded = true
			continue
		}
		const p = profileById.get(peerId)
		if (p) {
			rows.push({ kind: 'profile', profile: p })
			seenProfile.add(p.id)
		}
	}

	const rest = filteredProfiles
		.filter((p) => !seenProfile.has(p.id))
		.sort((a, b) =>
			(a.name ?? a.email ?? '').trim().localeCompare((b.name ?? b.email ?? '').trim(), 'es', {
				sensitivity: 'base',
			})
		)
	for (const p of rest) rows.push({ kind: 'profile', profile: p })

	if (marioPeerId && !marioAdded) rows.push({ kind: 'mario' })

	return rows
}
