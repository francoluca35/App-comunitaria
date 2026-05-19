import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js'

export const CHAT_MESSAGE_SELECT_BASE =
	'id, sender_id, receiver_id, content, created_at'

export const CHAT_MESSAGE_SELECT_WITH_RECEIPTS =
	`${CHAT_MESSAGE_SELECT_BASE}, delivered_at, read_at`

/** Preferir `chatMessageSelect()` o `fetchChatMessagesBetween`. */
export const CHAT_MESSAGE_SELECT = CHAT_MESSAGE_SELECT_WITH_RECEIPTS

export type ChatMessageWithReceipts = {
	id: string
	sender_id: string
	receiver_id: string
	content: string
	created_at: string
	delivered_at?: string | null
	read_at?: string | null
}

export type ChatReceiptStatus = 'sent' | 'delivered' | 'read'

let receiptsSupported: boolean | null = null

function isMissingReceiptColumnError(error: PostgrestError | null): boolean {
	if (!error) return false
	const msg = `${error.message ?? ''} ${error.details ?? ''} ${error.hint ?? ''}`.toLowerCase()
	return (
		error.code === '42703' ||
		error.code === 'PGRST204' ||
		msg.includes('delivered_at') ||
		msg.includes('read_at') ||
		(msg.includes('column') && msg.includes('does not exist'))
	)
}

export function conversationOrFilter(myId: string, otherId: string): string {
	return `and(sender_id.eq.${myId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${myId})`
}

/** Detecta si la migración de acuses de lectura está aplicada en Supabase. */
export async function resolveChatReceiptsSupport(supabase: SupabaseClient): Promise<boolean> {
	if (receiptsSupported !== null) return receiptsSupported
	const { error } = await supabase.from('chat_messages').select('delivered_at').limit(0)
	if (isMissingReceiptColumnError(error)) {
		receiptsSupported = false
		return false
	}
	receiptsSupported = !error
	return receiptsSupported
}

export function chatMessageSelect(): string {
	return receiptsSupported === false ? CHAT_MESSAGE_SELECT_BASE : CHAT_MESSAGE_SELECT_WITH_RECEIPTS
}

export function areChatReceiptsEnabled(): boolean {
	return receiptsSupported !== false
}

export async function fetchChatMessagesBetween(
	supabase: SupabaseClient,
	myId: string,
	otherId: string
): Promise<{ data: ChatMessageWithReceipts[] | null; error: PostgrestError | null }> {
	await resolveChatReceiptsSupport(supabase)
	const first = await supabase
		.from('chat_messages')
		.select(chatMessageSelect())
		.or(conversationOrFilter(myId, otherId))
		.order('created_at', { ascending: true })

	if (first.error && isMissingReceiptColumnError(first.error)) {
		receiptsSupported = false
		const fallback = await supabase
			.from('chat_messages')
			.select(CHAT_MESSAGE_SELECT_BASE)
			.or(conversationOrFilter(myId, otherId))
			.order('created_at', { ascending: true })
		return {
			data: (fallback.data ?? null) as ChatMessageWithReceipts[] | null,
			error: fallback.error,
		}
	}

	return {
		data: (first.data ?? null) as ChatMessageWithReceipts[] | null,
		error: first.error,
	}
}

export async function insertChatMessage(
	supabase: SupabaseClient,
	row: { sender_id: string; receiver_id: string; content: string }
): Promise<{ data: ChatMessageWithReceipts | null; error: PostgrestError | null }> {
	await resolveChatReceiptsSupport(supabase)
	const first = await supabase.from('chat_messages').insert(row).select(chatMessageSelect()).single()

	if (first.error && isMissingReceiptColumnError(first.error)) {
		receiptsSupported = false
		const fallback = await supabase
			.from('chat_messages')
			.insert(row)
			.select(CHAT_MESSAGE_SELECT_BASE)
			.single()
		return {
			data: (fallback.data ?? null) as ChatMessageWithReceipts | null,
			error: fallback.error,
		}
	}

	return {
		data: (first.data ?? null) as ChatMessageWithReceipts | null,
		error: first.error,
	}
}

export function getChatReceiptStatus(msg: {
	delivered_at?: string | null
	read_at?: string | null
}): ChatReceiptStatus {
	if (msg.read_at) return 'read'
	if (msg.delivered_at) return 'delivered'
	return 'sent'
}

/** Marca un mensaje como recibido en el dispositivo del receptor. */
export async function markChatMessageDelivered(
	supabase: SupabaseClient,
	messageId: string,
	receiverId: string
): Promise<void> {
	await resolveChatReceiptsSupport(supabase)
	if (!areChatReceiptsEnabled()) return
	const now = new Date().toISOString()
	const { error } = await supabase
		.from('chat_messages')
		.update({ delivered_at: now })
		.eq('id', messageId)
		.eq('receiver_id', receiverId)
		.is('delivered_at', null)
	if (isMissingReceiptColumnError(error)) receiptsSupported = false
}

/** Marca como leídos los mensajes entrantes de una conversación abierta. */
export async function markChatConversationRead(
	supabase: SupabaseClient,
	myId: string,
	otherId: string
): Promise<void> {
	await resolveChatReceiptsSupport(supabase)
	if (!areChatReceiptsEnabled()) return
	const now = new Date().toISOString()
	const { error: readError } = await supabase
		.from('chat_messages')
		.update({ read_at: now, delivered_at: now })
		.eq('receiver_id', myId)
		.eq('sender_id', otherId)
		.is('read_at', null)

	const { error: deliveredError } = await supabase
		.from('chat_messages')
		.update({ delivered_at: now })
		.eq('receiver_id', myId)
		.eq('sender_id', otherId)
		.is('delivered_at', null)

	if (isMissingReceiptColumnError(readError) || isMissingReceiptColumnError(deliveredError)) {
		receiptsSupported = false
	}
}

export function mergeChatMessageUpdate<T extends { id: string }>(
	prev: T[],
	updated: T & Partial<ChatMessageWithReceipts>
): T[] {
	return prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m))
}
