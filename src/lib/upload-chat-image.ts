import type { SupabaseClient } from '@supabase/supabase-js'

export const CHAT_IMAGE_BUCKET = 'chat-images'

function extForMime(mime: string): string {
	const m = mime.toLowerCase()
	if (m.includes('png')) return 'png'
	if (m.includes('webp')) return 'webp'
	if (m.includes('gif')) return 'gif'
	if (m.includes('jpeg') || m.includes('jpg')) return 'jpg'
	return 'jpg'
}

/**
 * Sube una imagen al bucket `chat-images` bajo `{userId}/{uuid}.ext`.
 */
export async function uploadChatImage(
	supabase: SupabaseClient,
	userId: string,
	blob: Blob,
	mimeHint?: string
): Promise<{ publicUrl: string; path: string } | { error: string }> {
	const mime = blob.type || mimeHint || 'image/jpeg'
	const ext = extForMime(mime)
	const path = `${userId}/${crypto.randomUUID()}.${ext}`

	const { error: upErr } = await supabase.storage.from(CHAT_IMAGE_BUCKET).upload(path, blob, {
		contentType: mime,
		upsert: false,
	})

	if (upErr) {
		return { error: upErr.message ?? 'No se pudo subir la imagen' }
	}

	const { data: pub } = supabase.storage.from(CHAT_IMAGE_BUCKET).getPublicUrl(path)
	if (!pub?.publicUrl) {
		return { error: 'No se obtuvo URL pública de la imagen' }
	}

	return { publicUrl: pub.publicUrl, path }
}
