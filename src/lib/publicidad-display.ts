/**
 * Forma de una publicidad activa para listados, modal y barra lateral (datos desde la API).
 */

import { ensureStorageObjectPublicUrl } from '@/lib/storage-image'

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
