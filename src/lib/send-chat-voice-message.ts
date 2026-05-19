import type { SupabaseClient } from '@supabase/supabase-js'
import { encodeChatAudioMessage } from '@/lib/chat-message-payload'
import {
	chatMessageSelect,
	resolveChatReceiptsSupport,
	type ChatMessageWithReceipts,
} from '@/lib/chat-read-receipts'
import { notifyReceiverPushAfterSend } from '@/lib/dispatch-message-push'
import { uploadChatAudio } from '@/lib/upload-chat-audio'

export type ChatMessageRow = ChatMessageWithReceipts

export async function sendChatVoiceMessage(
	supabase: SupabaseClient,
	myId: string,
	otherId: string,
	blob: Blob,
	durationSec: number
): Promise<{ message: ChatMessageRow } | { error: string }> {
	const up = await uploadChatAudio(supabase, myId, blob)
	if ('error' in up) {
		return { error: up.error }
	}

	const d = Math.round(durationSec * 10) / 10
	const content = encodeChatAudioMessage({ u: up.publicUrl, d })

	await resolveChatReceiptsSupport(supabase)
	const { data: newMsg, error } = await supabase
		.from('chat_messages')
		.insert({ sender_id: myId, receiver_id: otherId, content })
		.select(chatMessageSelect())
		.single()

	if (error) {
		return { error: error.message ?? 'Error al enviar el audio' }
	}

	void notifyReceiverPushAfterSend(supabase, otherId, (newMsg as ChatMessageRow).id)

	return { message: newMsg as ChatMessageRow }
}
