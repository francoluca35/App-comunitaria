import type { SupabaseClient } from '@supabase/supabase-js'
import { parseChatMessagePayload } from '@/lib/chat-message-payload'
import { CHAT_AUDIO_BUCKET } from '@/lib/upload-chat-audio'
import { CHAT_IMAGE_BUCKET } from '@/lib/upload-chat-image'
import { removeStorageObjectsByUrls } from '@/lib/server/storage-cleanup'
import { createServiceRoleClient } from '@/lib/supabase/server'

const BATCH_SIZE = 200

type ChatCleanupRow = {
	id: string
	content: string
}

function mediaUrlsFromContent(content: string): { audio: string[]; images: string[] } {
	const parsed = parseChatMessagePayload(content)
	if (parsed.kind === 'audio') return { audio: [parsed.url], images: [] }
	if (parsed.kind === 'image') return { audio: [], images: [parsed.url] }
	return { audio: [], images: [] }
}

export async function deleteChatMessageRowsWithStorage(
	db: SupabaseClient,
	rows: ChatCleanupRow[]
): Promise<{ ok: boolean; error?: string; deletedCount: number }> {
	const ids = [...new Set(rows.map((row) => row.id).filter(Boolean))]
	if (ids.length === 0) return { ok: true, deletedCount: 0 }

	const audioUrls: string[] = []
	const imageUrls: string[] = []
	for (const row of rows) {
		const { audio, images } = mediaUrlsFromContent(row.content)
		audioUrls.push(...audio)
		imageUrls.push(...images)
	}

	if (audioUrls.length > 0) {
		const removed = await removeStorageObjectsByUrls(db, CHAT_AUDIO_BUCKET, audioUrls)
		if (!removed.ok) {
			return { ok: false, error: removed.error ?? 'No se pudieron borrar audios del Storage', deletedCount: 0 }
		}
	}

	if (imageUrls.length > 0) {
		const removed = await removeStorageObjectsByUrls(db, CHAT_IMAGE_BUCKET, imageUrls)
		if (!removed.ok) {
			return { ok: false, error: removed.error ?? 'No se pudieron borrar imágenes del Storage', deletedCount: 0 }
		}
	}

	const { data: deletedRows, error: deleteError } = await db
		.from('chat_messages')
		.delete()
		.in('id', ids)
		.select('id')

	if (deleteError) return { ok: false, error: deleteError.message, deletedCount: 0 }
	return { ok: true, deletedCount: deletedRows?.length ?? 0 }
}

/** Elimina todos los mensajes de chat (DB + Storage). Solo vía service role. */
export async function deleteAllChatMessagesWithStorage(): Promise<{
	ok: boolean
	error?: string
	deletedCount: number
}> {
	const serviceClient = createServiceRoleClient()
	if (!serviceClient) {
		return { ok: false, error: 'Falta SUPABASE_SERVICE_ROLE_KEY', deletedCount: 0 }
	}

	let totalDeleted = 0

	for (;;) {
		const { data, error } = await serviceClient
			.from('chat_messages')
			.select('id, content')
			.order('created_at', { ascending: true })
			.limit(BATCH_SIZE)

		if (error) return { ok: false, error: error.message, deletedCount: totalDeleted }

		const rows = (data ?? []) as ChatCleanupRow[]
		if (rows.length === 0) break

		const result = await deleteChatMessageRowsWithStorage(serviceClient, rows)
		if (!result.ok) return { ok: false, error: result.error, deletedCount: totalDeleted }
		totalDeleted += result.deletedCount

		if (rows.length < BATCH_SIZE) break
	}

	return { ok: true, deletedCount: totalDeleted }
}
