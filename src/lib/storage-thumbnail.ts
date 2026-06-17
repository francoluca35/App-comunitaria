import imageCompression from 'browser-image-compression'
import type { SupabaseClient } from '@supabase/supabase-js'
import { storageExtensionFromFile } from '@/lib/compress-upload-image'
import {
	buildSupabasePublicStorageUrl,
	ensureStorageObjectPublicUrl,
	SUPABASE_STORAGE_OBJECT_PUBLIC_PREFIX,
} from '@/lib/storage-image'
import { storageImmutableUploadOptions } from '@/lib/storage-upload-options'

/** Lado mayor de miniaturas para feed, tarjetas y avatares en listas. */
export const THUMB_MAX_WIDTH_OR_HEIGHT = 480

const THUMB_SUFFIX = '_thumb.webp'

export function thumbObjectPath(objectPath: string): string {
	const path = objectPath.replace(/^\/+/, '')
	if (!path || path.includes('..')) return path
	const slash = path.lastIndexOf('/')
	const dir = slash >= 0 ? path.slice(0, slash + 1) : ''
	const filename = slash >= 0 ? path.slice(slash + 1) : path
	const dot = filename.lastIndexOf('.')
	const base = dot > 0 ? filename.slice(0, dot) : filename
	if (base.endsWith('_thumb')) return path
	return `${dir}${base}${THUMB_SUFFIX}`
}

export function parsePublicStorageObject(
	url: string
): { bucket: string; path: string } | null {
	try {
		const parsed = new URL(ensureStorageObjectPublicUrl(url.trim()))
		const marker = `${SUPABASE_STORAGE_OBJECT_PUBLIC_PREFIX}`
		const idx = parsed.pathname.indexOf(marker)
		if (idx < 0) return null
		const rest = parsed.pathname.slice(idx + marker.length)
		const slash = rest.indexOf('/')
		if (slash <= 0) return null
		const bucket = rest.slice(0, slash)
		const path = rest.slice(slash + 1)
		if (!bucket || !path) return null
		return { bucket, path: decodeURIComponent(path) }
	} catch {
		return null
	}
}

/** URL de miniatura a partir de la URL pública del archivo original. */
export function thumbUrlFromPublicUrl(url: string | null | undefined): string {
	if (!url) return ''
	const clean = ensureStorageObjectPublicUrl(url)
	if (clean.includes(THUMB_SUFFIX)) return clean
	const parsed = parsePublicStorageObject(clean)
	if (!parsed) return clean
	return buildSupabasePublicStorageUrl(parsed.bucket, thumbObjectPath(parsed.path))
}

/** URL para previews: miniatura si existe convención; imágenes legacy usan fallback en el componente. */
export function storagePreviewUrl(url: string | null | undefined): string {
	if (!url) return ''
	return thumbUrlFromPublicUrl(url)
}

export async function generateImageThumbnail(file: File): Promise<File> {
	if (!file.type.startsWith('image/')) return file
	if (file.type === 'image/svg+xml' || file.type === 'image/gif') return file
	try {
		return await imageCompression(file, {
			fileType: 'image/webp',
			maxWidthOrHeight: THUMB_MAX_WIDTH_OR_HEIGHT,
			maxSizeMB: 0.3,
			initialQuality: 0.78,
			useWebWorker: true,
		})
	} catch {
		return file
	}
}

export async function uploadImageWithThumbnail(
	supabase: SupabaseClient,
	bucket: string,
	userId: string,
	file: File
): Promise<{ url: string; thumbUrl: string }> {
	const id = crypto.randomUUID()
	const ext = storageExtensionFromFile(file)
	const objectPath = `${userId}/${id}.${ext}`
	const thumbPath = thumbObjectPath(objectPath)
	const thumbFile = await generateImageThumbnail(file)

	const fullOpts = storageImmutableUploadOptions(file.type || 'image/jpeg')
	const thumbOpts = storageImmutableUploadOptions('image/webp')

	const [fullRes, thumbRes] = await Promise.all([
		supabase.storage.from(bucket).upload(objectPath, file, fullOpts),
		supabase.storage.from(bucket).upload(thumbPath, thumbFile, thumbOpts),
	])

	if (fullRes.error) throw fullRes.error
	if (thumbRes.error) {
		console.warn('uploadImageWithThumbnail: thumb upload failed, using full image only', thumbRes.error)
	}

	const url = buildSupabasePublicStorageUrl(bucket, objectPath)
	const thumbUrl = thumbRes.error ? url : buildSupabasePublicStorageUrl(bucket, thumbPath)
	return { url, thumbUrl }
}
