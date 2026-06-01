import type { SupabaseClient } from '@supabase/supabase-js'
import { compressImageForCommunityUpload } from '@/lib/compress-upload-image'
import { encodeChatImageMessage } from '@/lib/chat-message-payload'
import { notifyReceiverPushAfterSend } from '@/lib/dispatch-message-push'
import { uploadChatImage } from '@/lib/upload-chat-image'
import { insertChatMessage, type ChatMessageWithReceipts } from '@/lib/chat-read-receipts'

type ChatMessageRow = ChatMessageWithReceipts

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
		const compressed = await compressImageForCommunityUpload(asFile)
		blob = compressed
	} catch (err) {
		if (err instanceof Error) return { error: err.message }
	}

	const up = await uploadChatImage(supabase, myId, blob, mime)
	if ('error' in up) {
		return { error: up.error }
	}

	const content = encodeChatImageMessage({ u: up.publicUrl })

	const { data: newMsg, error } = await insertChatMessage(supabase, {
		sender_id: myId,
		receiver_id: otherId,
		content,
	})

	if (error || !newMsg) {
		return { error: error?.message ?? 'Error al enviar la foto' }
	}

	void notifyReceiverPushAfterSend(supabase, otherId, newMsg.id)

	return { message: newMsg }
}
