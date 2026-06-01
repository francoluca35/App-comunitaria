import type { SupabaseClient } from '@supabase/supabase-js'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { publicStoragePathsFromUrls } from '@/lib/server/storage-path'

export const PUBLICIDAD_STORAGE_BUCKET = 'publicaciones'

type PublicidadCleanupRow = {
	id: string
	images: unknown
}

export function normalizePublicidadImageUrls(images: unknown): string[] {
	return Array.isArray(images) ? images.filter((url): url is string => typeof url === 'string') : []
}

export async function deletePublicidadRowsWithStorage(
	db: SupabaseClient,
	rows: PublicidadCleanupRow[]
): Promise<{ ok: boolean; error?: string; deletedCount: number }> {
	const ids = [...new Set(rows.map((row) => row.id).filter(Boolean))]
	if (ids.length === 0) return { ok: true, deletedCount: 0 }

	const storagePaths = publicStoragePathsFromUrls(
		rows.flatMap((row) => normalizePublicidadImageUrls(row.images)),
		PUBLICIDAD_STORAGE_BUCKET
	)

	const { error: deleteError } = await db.from('publicidad_requests').delete().in('id', ids)
	if (deleteError) return { ok: false, error: deleteError.message, deletedCount: 0 }

	if (storagePaths.length > 0) {
		const { error: storageError } = await db.storage.from(PUBLICIDAD_STORAGE_BUCKET).remove(storagePaths)
		if (storageError) return { ok: false, error: storageError.message, deletedCount: ids.length }
	}

	return { ok: true, deletedCount: ids.length }
}

export async function cleanupExpiredPublicidades(): Promise<{ ok: boolean; error?: string; deletedCount: number }> {
	const serviceClient = createServiceRoleClient()
	if (!serviceClient) {
		return { ok: false, error: 'Falta SUPABASE_SERVICE_ROLE_KEY', deletedCount: 0 }
	}

	const { data, error } = await serviceClient
		.from('publicidad_requests')
		.select('id, images')
		.eq('status', 'active')
		.not('end_at', 'is', null)
		.lte('end_at', new Date().toISOString())

	if (error) return { ok: false, error: error.message, deletedCount: 0 }
	return deletePublicidadRowsWithStorage(serviceClient, (data ?? []) as PublicidadCleanupRow[])
}
