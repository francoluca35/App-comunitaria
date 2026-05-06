import type { SupabaseClient } from '@supabase/supabase-js'
import { encodeChatAudioMessage } from '@/lib/chat-message-payload'
import { uploadChatAudio } from '@/lib/upload-chat-audio'

export type ChatMessageRow = {
	id: string
	sender_id: string
	receiver_id: string
	content: string
	created_at: string
}

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

	const { data: newMsg, error } = await supabase
		.from('chat_messages')
		.insert({ sender_id: myId, receiver_id: otherId, content })
		.select('id, sender_id, receiver_id, content, created_at')
		.single()

	if (error) {
		return { error: error.message ?? 'Error al enviar el audio' }
	}

	return { message: newMsg as ChatMessageRow }
}
