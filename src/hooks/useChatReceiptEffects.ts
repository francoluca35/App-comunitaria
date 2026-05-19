'use client'

import { useCallback } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
	areChatReceiptsEnabled,
	chatMessageSelect,
	markChatConversationRead,
	markChatMessageDelivered,
	mergeChatMessageUpdate,
	type ChatMessageWithReceipts,
} from '@/lib/chat-read-receipts'

export function useChatReceiptEffects(
	supabase: SupabaseClient,
	myId: string,
	otherId: string,
	setMessages: React.Dispatch<React.SetStateAction<ChatMessageWithReceipts[]>>
) {
	const applyReadLocally = useCallback(() => {
		if (!areChatReceiptsEnabled()) return
		const now = new Date().toISOString()
		setMessages((prev) =>
			prev.map((m) =>
				m.receiver_id === myId && m.sender_id === otherId
					? {
							...m,
							read_at: m.read_at ?? now,
							delivered_at: m.delivered_at ?? now,
						}
					: m
			)
		)
	}, [myId, otherId, setMessages])

	const onConversationOpen = useCallback(async () => {
		if (!myId || !otherId) return
		await markChatConversationRead(supabase, myId, otherId)
		applyReadLocally()
	}, [supabase, myId, otherId, applyReadLocally])

	const onIncomingMessage = useCallback(
		async (row: ChatMessageWithReceipts) => {
			if (!myId || !otherId || row.receiver_id !== myId) return
			await markChatMessageDelivered(supabase, row.id, myId)
			await markChatConversationRead(supabase, myId, otherId)
			applyReadLocally()
		},
		[supabase, myId, otherId, applyReadLocally]
	)

	const onMessageUpdated = useCallback(
		(row: ChatMessageWithReceipts) => {
			setMessages((prev) => mergeChatMessageUpdate(prev, row))
		},
		[setMessages]
	)

	return { onConversationOpen, onIncomingMessage, onMessageUpdated, chatSelect: chatMessageSelect() }
}
