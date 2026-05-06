import type { SupabaseClient } from '@supabase/supabase-js'

export const CHAT_AUDIO_BUCKET = 'chat-audio'

function extForMime(mime: string): string {
	if (mime.includes('webm')) return 'webm'
	if (mime.includes('mp4') || mime.includes('mpeg')) return 'm4a'
	if (mime.includes('ogg')) return 'ogg'
	return 'bin'
}

/**
 * Sube un blob de audio al bucket `chat-audio` bajo `{userId}/{uuid}.ext`.
 * Requiere políticas RLS de Storage (ver migración `chat_audio_storage.sql`).
 */
export async function uploadChatAudio(
	supabase: SupabaseClient,
	userId: string,
	blob: Blob
): Promise<{ publicUrl: string; path: string } | { error: string }> {
	const ext = extForMime(blob.type || 'audio/webm')
	const path = `${userId}/${crypto.randomUUID()}.${ext}`

	const { error: upErr } = await supabase.storage.from(CHAT_AUDIO_BUCKET).upload(path, blob, {
		contentType: blob.type || 'audio/webm',
		upsert: false,
	})

	if (upErr) {
		return { error: upErr.message ?? 'No se pudo subir el audio' }
	}

	const { data: pub } = supabase.storage.from(CHAT_AUDIO_BUCKET).getPublicUrl(path)
	if (!pub?.publicUrl) {
		return { error: 'No se obtuvo URL pública del audio' }
	}

	return { publicUrl: pub.publicUrl, path }
}
