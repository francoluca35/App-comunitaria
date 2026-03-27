/** Categorías por defecto si la API / la migración aún no está disponible */

export interface NamedCategoryRow {
  slug: string
  label: string
  sort_order: number
}

export const DEFAULT_POST_CATEGORIES: NamedCategoryRow[] = [
  { slug: 'mascotas', label: 'Mascotas', sort_order: 1 },
  { slug: 'alertas', label: 'Alertas', sort_order: 2 },
  { slug: 'avisos', label: 'Avisos', sort_order: 3 },
  { slug: 'objetos', label: 'Objetos', sort_order: 4 },
  { slug: 'noticias', label: 'Noticias', sort_order: 5 },
]

export const DEFAULT_PUBLICIDAD_CATEGORIES: NamedCategoryRow[] = [
  { slug: 'servicios', label: 'Servicios', sort_order: 1 },
  { slug: 'ventas', label: 'Ventas', sort_order: 2 },
  { slug: 'alquileres', label: 'Alquileres', sort_order: 3 },
  { slug: 'trabajo', label: 'Trabajo', sort_order: 4 },
  { slug: 'otros', label: 'Otros', sort_order: 5 },
]
