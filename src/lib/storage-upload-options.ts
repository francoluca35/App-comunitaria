/** Archivos con UUID en la ruta: inmutables, cache largo en CDN del navegador. */
export const STORAGE_IMMUTABLE_CACHE_CONTROL = 'public, max-age=31536000, immutable' as const

export function storageImmutableUploadOptions(contentType: string) {
	return {
		upsert: false as const,
		contentType,
		cacheControl: STORAGE_IMMUTABLE_CACHE_CONTROL,
	}
}
