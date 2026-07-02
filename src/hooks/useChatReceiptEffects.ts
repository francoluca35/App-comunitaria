'use client'

import { useCallback, useEffect } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
	applyOutgoingReceiptUpdates,
	areChatReceiptsEnabled,
	chatMessageSelect,
	markChatConversationRead,
	markChatMessageDelivered,
	mergeChatMessageUpdate,
	resolveChatReceiptsSupport,
	type ChatMessageWithReceipts,
} from '@/lib/chat-read-receipts'

export function useChatReceiptEffects(
	supabase: SupabaseClient,
	myId: string,
	otherId: string,
	setMessages: React.Dispatch<React.SetStateAction<ChatMessageWithReceipts[]>>
) {
	useEffect(() => {
		void resolveChatReceiptsSupport(supabase)
	}, [supabase])

	const applyOutgoingReadLocally = useCallback(() => {
		if (!areChatReceiptsEnabled()) return
		const now = new Date().toISOString()
		setMessages((prev) =>
			prev.map((m) =>
				m.sender_id === myId && m.receiver_id === otherId
					? {
							...m,
							delivered_at: m.delivered_at ?? now,
							read_at: m.read_at ?? now,
						}
					: m
			)
		)
	}, [myId, otherId, setMessages])

	const onConversationOpen = useCallback(async () => {
		if (!myId || !otherId) return
		await markChatConversationRead(supabase, myId, otherId)
	}, [supabase, myId, otherId])

	const onIncomingMessage = useCallback(
		async (row: ChatMessageWithReceipts) => {
			if (!myId || !otherId || row.receiver_id !== myId) return
			await markChatMessageDelivered(supabase, row.id, myId)
		},
		[supabase, myId, otherId]
	)

	const onIncomingMessageWhileChatOpen = useCallback(
		async (row: ChatMessageWithReceipts) => {
			if (!myId || !otherId || row.receiver_id !== myId) return
			await markChatMessageDelivered(supabase, row.id, myId)
			await markChatConversationRead(supabase, myId, otherId)
		},
		[supabase, myId, otherId]
	)

	const onMessageUpdated = useCallback(
		(row: ChatMessageWithReceipts) => {
			setMessages((prev) => {
				const withOutgoing = applyOutgoingReceiptUpdates(prev, row, myId)
				return mergeChatMessageUpdate(withOutgoing, row)
			})
		},
		[myId, setMessages]
	)

	const onMessageDeleted = useCallback(
		(payload: { old: Record<string, unknown> }) => {
			const id = payload.old?.id
			if (typeof id !== 'string') return
			setMessages((prev) => (prev.some((m) => m.id === id) ? prev.filter((m) => m.id !== id) : prev))
		},
		[setMessages]
	)

	return {
		onConversationOpen,
		onIncomingMessage,
		onIncomingMessageWhileChatOpen,
		onMessageUpdated,
		onMessageDeleted,
		applyOutgoingReadLocally,
		chatSelect: chatMessageSelect(),
	}
}
