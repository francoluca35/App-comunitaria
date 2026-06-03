import type { SupabaseClient } from '@supabase/supabase-js'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { removeStorageObjectsByUrls } from '@/lib/server/storage-cleanup'

export const POST_MEDIA_BUCKET = 'publicaciones'

/** Recolecta URLs de medios del post y fotos en comentarios. */
export async function collectPostStorageUrls(
	db: SupabaseClient,
	postId: string
): Promise<{ urls: string[]; error?: string }> {
	const urls: string[] = []

	const { data: mediaRows, error: mediaError } = await db
		.from('post_media')
		.select('url')
		.eq('post_id', postId)

	if (mediaError) return { urls: [], error: mediaError.message }
	for (const row of mediaRows ?? []) {
		if (typeof row.url === 'string' && row.url) urls.push(row.url)
	}

	const { data: commentRows, error: commentsError } = await db
		.from('comments')
		.select('image_url')
		.eq('post_id', postId)
		.not('image_url', 'is', null)

	if (commentsError) return { urls: [], error: commentsError.message }
	for (const row of commentRows ?? []) {
		if (typeof row.image_url === 'string' && row.image_url.trim()) urls.push(row.image_url)
	}

	return { urls }
}

/**
 * Elimina archivos en Storage y luego el post (cascade: media, comentarios, reacciones, etc.).
 */
export async function deletePostByIdWithStorage(
	db: SupabaseClient,
	postId: string
): Promise<{ ok: boolean; error?: string; warning?: string }> {
	const trimmed = postId.trim()
	if (!trimmed) return { ok: false, error: 'ID requerido' }

	const { urls, error: collectError } = await collectPostStorageUrls(db, trimmed)
	if (collectError) return { ok: false, error: collectError }

	const storageClient = createServiceRoleClient() ?? db
	if (urls.length > 0) {
		const removed = await removeStorageObjectsByUrls(storageClient, POST_MEDIA_BUCKET, urls)
		if (!removed.ok) {
			if (!createServiceRoleClient()) {
				return {
					ok: false,
					error:
						'No se pudieron borrar las imágenes del Storage. Configurá SUPABASE_SERVICE_ROLE_KEY en el servidor.',
				}
			}
			return { ok: false, error: removed.error ?? 'No se pudieron borrar las imágenes del Storage' }
		}
	}

	const { error: deleteError } = await db.from('posts').delete().eq('id', trimmed)
	if (deleteError) return { ok: false, error: deleteError.message }

	return { ok: true }
}
