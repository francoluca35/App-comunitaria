/**
 * Forma de una publicidad activa para listados, modal y barra lateral (datos desde la API).
 */

import { ensureStorageObjectPublicUrl } from '@/lib/storage-image'
import { storagePreviewUrl } from '@/lib/storage-thumbnail'

export interface PublicidadDisplay {
  id: string
  title: string
  description: string
  category: string
  createdAt: Date
  imageUrl?: string
  images?: string[]
  whatsappUrl?: string
  instagramUrl?: string
}

export function getPublicidadImageUrls(p: Pick<PublicidadDisplay, 'images' | 'imageUrl'>): string[] {
	const fromImages = p.images?.length
		? p.images.map((url) => ensureStorageObjectPublicUrl(url)).filter(Boolean)
		: []
	if (fromImages.length > 0) return fromImages
	if (p.imageUrl) return [ensureStorageObjectPublicUrl(p.imageUrl)].filter(Boolean)
	return []
}

/** URLs de miniatura para listados y tarjetas (fallback a imagen completa en el componente). */
export function getPublicidadPreviewImageUrls(
	p: Pick<PublicidadDisplay, 'images' | 'imageUrl'>
): string[] {
	return getPublicidadImageUrls(p).map((url) => storagePreviewUrl(url))
}
