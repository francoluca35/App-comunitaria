import type { SupabaseClient } from '@supabase/supabase-js'
import imageCompression from 'browser-image-compression'
import { encodeChatImageMessage } from '@/lib/chat-message-payload'
import { uploadChatImage } from '@/lib/upload-chat-image'
import type { ChatMessageRow } from '@/lib/send-chat-voice-message'

export async function sendChatImageMessage(
	supabase: SupabaseClient,
	myId: string,
	otherId: string,
	file: File | Blob
): Promise<{ message: ChatMessageRow } | { error: string }> {
	const mime = file instanceof File ? file.type || 'image/jpeg' : file.type || 'image/jpeg'
	let blob: Blob = file

	try {
		const asFile =
			file instanceof File ? file : new File([file], 'photo.jpg', { type: mime || 'image/jpeg' })
		blob = await imageCompression(asFile, {
			maxSizeMB: 1,
			maxWidthOrHeight: 1920,
			useWebWorker: true,
		})
	} catch {
		/* usar archivo sin comprimir */
	}

	const up = await uploadChatImage(supabase, myId, blob, mime)
	if ('error' in up) {
		return { error: up.error }
	}

	const content = encodeChatImageMessage({ u: up.publicUrl })

	const { data: newMsg, error } = await supabase
		.from('chat_messages')
		.insert({ sender_id: myId, receiver_id: otherId, content })
		.select('id, sender_id, receiver_id, content, created_at')
		.single()

	if (error) {
		return { error: error.message ?? 'Error al enviar la foto' }
	}

	return { message: newMsg as ChatMessageRow }
}
