/**
 * Forma de una publicidad activa para listados, modal y barra lateral (datos desde la API).
 */

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
  if (p.images && p.images.length > 0) return p.images
  if (p.imageUrl) return [p.imageUrl]
  return []
}
