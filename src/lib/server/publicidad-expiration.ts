import type { SupabaseClient } from '@supabase/supabase-js'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { removeStorageObjectsByUrls } from '@/lib/server/storage-cleanup'

export const PUBLICIDAD_STORAGE_BUCKET = 'publicaciones'

type PublicidadCleanupRow = {
	id: string
	images: unknown
}

export function normalizePublicidadImageUrls(images: unknown): string[] {
	return Array.isArray(images) ? images.filter((url): url is string => typeof url === 'string') : []
}

function isMissingRelationError(error: { code?: string; message?: string } | null): boolean {
	if (!error) return false
	return error.code === '42P01' || (error.message ?? '').toLowerCase().includes('does not exist')
}

/** Elimina una publicidad, sus comentarios y las imágenes en Storage. */
export async function deletePublicidadById(
	db: SupabaseClient,
	id: string
): Promise<{ ok: boolean; error?: string }> {
	const trimmed = id.trim()
	if (!trimmed) return { ok: false, error: 'ID requerido' }

	const { data, error } = await db
		.from('publicidad_requests')
		.select('id, images')
		.eq('id', trimmed)
		.maybeSingle()

	if (error) return { ok: false, error: error.message }
	if (!data) return { ok: false, error: 'No encontrado' }

	const { error: commentsError } = await db.from('publicidad_comments').delete().eq('publicidad_id', trimmed)
	if (commentsError && !isMissingRelationError(commentsError)) {
		return { ok: false, error: commentsError.message }
	}

	const result = await deletePublicidadRowsWithStorage(db, [data as PublicidadCleanupRow])
	if (!result.ok) return { ok: false, error: result.error }
	return { ok: true }
}

export async function deletePublicidadRowsWithStorage(
	db: SupabaseClient,
	rows: PublicidadCleanupRow[]
): Promise<{ ok: boolean; error?: string; deletedCount: number }> {
	const ids = [...new Set(rows.map((row) => row.id).filter(Boolean))]
	if (ids.length === 0) return { ok: true, deletedCount: 0 }

	const imageUrls = rows.flatMap((row) => normalizePublicidadImageUrls(row.images))
	if (imageUrls.length > 0) {
		const removed = await removeStorageObjectsByUrls(db, PUBLICIDAD_STORAGE_BUCKET, imageUrls)
		if (!removed.ok) {
			return { ok: false, error: removed.error ?? 'No se pudieron borrar las imágenes del Storage', deletedCount: 0 }
		}
	}

	const { data: deletedRows, error: deleteError } = await db
		.from('publicidad_requests')
		.delete()
		.in('id', ids)
		.select('id')
	if (deleteError) return { ok: false, error: deleteError.message, deletedCount: 0 }
	if (!deletedRows?.length) {
		return { ok: false, error: 'No se pudo eliminar el registro de la base de datos', deletedCount: 0 }
	}

	return { ok: true, deletedCount: deletedRows.length }
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
