/** Prefijo de URL pública directa (sin costo de Image Transformations). */
export const SUPABASE_STORAGE_OBJECT_PUBLIC_PREFIX = '/storage/v1/object/public/' as const

/** Prefijo de transformación en servidor — no usar para servir imágenes en la app. */
export const SUPABASE_STORAGE_RENDER_IMAGE_PREFIX = '/storage/v1/render/image/public/' as const

export function getSupabaseProjectUrl(): string {
	const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
	if (!baseUrl) throw new Error('Configuración de Storage no disponible')
	return baseUrl.replace(/\/$/, '')
}

/** Construye la URL pública directa al subir archivos (nunca /render/image/). */
export function buildSupabasePublicStorageUrl(bucket: string, objectPath: string): string {
	const path = objectPath.replace(/^\/+/, '')
	if (!path || path.includes('..')) throw new Error('Ruta de Storage inválida')
	return `${getSupabaseProjectUrl()}${SUPABASE_STORAGE_OBJECT_PUBLIC_PREFIX}${bucket}/${path}`
}

/**
 * Normaliza cualquier URL de Storage a object/public sin parámetros de transformación.
 * Convierte URLs legacy /render/image/ guardadas en la base a object/public.
 */
export function ensureStorageObjectPublicUrl(url: string | null | undefined): string {
	if (!url) return ''
	try {
		const parsed = new URL(url.trim())
		if (parsed.pathname.includes(SUPABASE_STORAGE_RENDER_IMAGE_PREFIX)) {
			parsed.pathname = parsed.pathname.replace(
				SUPABASE_STORAGE_RENDER_IMAGE_PREFIX,
				SUPABASE_STORAGE_OBJECT_PUBLIC_PREFIX
			)
		}
		if (parsed.pathname.includes(SUPABASE_STORAGE_OBJECT_PUBLIC_PREFIX)) {
			parsed.search = ''
		}
		return parsed.toString()
	} catch {
		return url
	}
}

/** @deprecated Usar ensureStorageObjectPublicUrl. Las opciones width/quality ya no se aplican. */
export function optimizedStorageImageUrl(url: string | null | undefined): string {
	return ensureStorageObjectPublicUrl(url)
}
