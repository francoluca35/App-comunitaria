import type { SupabaseClient } from '@supabase/supabase-js'
import { THUMB_SUFFIX, thumbObjectPath } from '@/lib/storage-thumbnail'
import { storageImmutableUploadOptions } from '@/lib/storage-upload-options'
import { publicStoragePathFromUrl } from '@/lib/server/storage-path'
import { generateStorageThumbnailWebp } from '@/lib/server/generate-storage-thumbnail'

export const THUMBNAIL_BACKFILL_BUCKET = 'publicaciones'

const IMAGE_PATH_RE = /\.(jpe?g|png|webp|heic|heif|avif)$/i

export type ThumbnailBackfillItemResult =
	| { path: string; status: 'created' }
	| { path: string; status: 'skipped'; reason: 'thumb_exists' | 'not_image' | 'download_failed' | 'generate_failed' }
	| { path: string; status: 'error'; error: string }

export type ThumbnailBackfillResult = {
	ok: boolean
	bucket: string
	totalCandidates: number
	offset: number
	limit: number
	processed: number
	created: number
	skipped: number
	errors: number
	remaining: number
	items: ThumbnailBackfillItemResult[]
}

function isImageObjectPath(path: string): boolean {
	if (!path || path.includes('..')) return false
	if (path.endsWith(THUMB_SUFFIX) || path.includes('_thumb.')) return false
	return IMAGE_PATH_RE.test(path)
}

function addPathFromUrl(paths: Set<string>, bucket: string, url: unknown) {
	if (typeof url !== 'string' || !url.trim()) return
	const path = publicStoragePathFromUrl(url, bucket)
	if (path && isImageObjectPath(path)) paths.add(path)
}

/** Recolecta rutas de imágenes referenciadas en la DB (posts, publicidad, comentarios). */
export async function collectThumbnailBackfillPaths(
	client: SupabaseClient,
	bucket = THUMBNAIL_BACKFILL_BUCKET
): Promise<string[]> {
	const paths = new Set<string>()

	const { data: mediaRows, error: mediaError } = await client
		.from('post_media')
		.select('url, type')
	if (mediaError) throw new Error(`post_media: ${mediaError.message}`)

	for (const row of mediaRows ?? []) {
		if (row.type === 'video') continue
		addPathFromUrl(paths, bucket, row.url)
	}

	const { data: publicidadRows, error: publicidadError } = await client
		.from('publicidad_requests')
		.select('images')
	if (publicidadError) throw new Error(`publicidad_requests: ${publicidadError.message}`)

	for (const row of publicidadRows ?? []) {
		const images = Array.isArray(row.images) ? row.images : []
		for (const url of images) addPathFromUrl(paths, bucket, url)
	}

	const { data: commentRows, error: commentError } = await client
		.from('comments')
		.select('image_url')
		.not('image_url', 'is', null)
	if (commentError) throw new Error(`comments: ${commentError.message}`)

	for (const row of commentRows ?? []) {
		addPathFromUrl(paths, bucket, row.image_url)
	}

	return [...paths].sort()
}

async function storageObjectExists(
	client: SupabaseClient,
	bucket: string,
	objectPath: string
): Promise<boolean> {
	const { data, error } = await client.storage.from(bucket).download(objectPath)
	if (error || !data) return false
	return true
}

async function backfillOneThumbnail(
	client: SupabaseClient,
	bucket: string,
	objectPath: string
): Promise<ThumbnailBackfillItemResult> {
	if (!isImageObjectPath(objectPath)) {
		return { path: objectPath, status: 'skipped', reason: 'not_image' }
	}

	const thumbPath = thumbObjectPath(objectPath)
	if (await storageObjectExists(client, bucket, thumbPath)) {
		return { path: objectPath, status: 'skipped', reason: 'thumb_exists' }
	}

	const { data: original, error: downloadError } = await client.storage.from(bucket).download(objectPath)
	if (downloadError || !original) {
		return {
			path: objectPath,
			status: 'skipped',
			reason: 'download_failed',
		}
	}

	let thumbBuffer: Buffer
	try {
		thumbBuffer = await generateStorageThumbnailWebp(Buffer.from(await original.arrayBuffer()))
	} catch {
		return { path: objectPath, status: 'skipped', reason: 'generate_failed' }
	}

	const { error: uploadError } = await client.storage.from(bucket).upload(thumbPath, thumbBuffer, {
		...storageImmutableUploadOptions('image/webp'),
		upsert: true,
	})

	if (uploadError) {
		return { path: objectPath, status: 'error', error: uploadError.message }
	}

	return { path: objectPath, status: 'created' }
}

export async function backfillMissingStorageThumbnails(
	client: SupabaseClient,
	options?: { bucket?: string; limit?: number; offset?: number }
): Promise<ThumbnailBackfillResult> {
	const bucket = options?.bucket ?? THUMBNAIL_BACKFILL_BUCKET
	const limit = Math.min(Math.max(options?.limit ?? 25, 1), 100)
	const offset = Math.max(options?.offset ?? 0, 0)

	const allPaths = await collectThumbnailBackfillPaths(client, bucket)
	const batch = allPaths.slice(offset, offset + limit)
	const items: ThumbnailBackfillItemResult[] = []

	for (const objectPath of batch) {
		items.push(await backfillOneThumbnail(client, bucket, objectPath))
	}

	const created = items.filter((i) => i.status === 'created').length
	const skipped = items.filter((i) => i.status === 'skipped').length
	const errors = items.filter((i) => i.status === 'error').length
	const remaining = Math.max(allPaths.length - offset - batch.length, 0)

	return {
		ok: errors === 0,
		bucket,
		totalCandidates: allPaths.length,
		offset,
		limit,
		processed: batch.length,
		created,
		skipped,
		errors,
		remaining,
		items,
	}
}
