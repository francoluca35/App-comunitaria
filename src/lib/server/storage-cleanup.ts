import type { SupabaseClient } from '@supabase/supabase-js'
import { publicStoragePathsFromUrls } from '@/lib/server/storage-path'

/**
 * Borra objetos del bucket a partir de URLs públicas o de transformación de Supabase Storage.
 */
export async function removeStorageObjectsByUrls(
	client: SupabaseClient,
	bucket: string,
	urls: string[]
): Promise<{ ok: boolean; error?: string; pathsRemoved: number }> {
	const paths = publicStoragePathsFromUrls(urls, bucket)
	if (paths.length === 0) return { ok: true, pathsRemoved: 0 }

	const { error } = await client.storage.from(bucket).remove(paths)
	if (error) return { ok: false, error: error.message, pathsRemoved: 0 }
	return { ok: true, pathsRemoved: paths.length }
}
