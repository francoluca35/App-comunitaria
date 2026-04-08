/** Categorías por defecto si la API / la migración aún no está disponible */

export interface NamedCategoryRow {
  slug: string
  label: string
  sort_order: number
}

/** Evita que filas null o sin slug/label rompan .map / .find en el cliente. */
export function sanitizeCategoryRows(data: unknown): NamedCategoryRow[] {
  if (!Array.isArray(data)) return []
  const out: NamedCategoryRow[] = []
  for (const row of data) {
    if (row == null || typeof row !== 'object') continue
    const slug = (row as Partial<NamedCategoryRow>).slug
    const label = (row as Partial<NamedCategoryRow>).label
    const sort_order = (row as Partial<NamedCategoryRow>).sort_order
    if (typeof slug !== 'string' || slug.length === 0) continue
    if (typeof label !== 'string') continue
    out.push({
      slug,
      label,
      sort_order:
        typeof sort_order === 'number' && Number.isFinite(sort_order) ? sort_order : 0,
    })
  }
  return out
}

export const DEFAULT_POST_CATEGORIES: NamedCategoryRow[] = [
  { slug: 'mascotas', label: 'Mascotas', sort_order: 1 },
  { slug: 'alertas', label: 'Alertas', sort_order: 2 },
  { slug: 'avisos', label: 'Avisos', sort_order: 3 },
  { slug: 'objetos', label: 'Objetos', sort_order: 4 },
  { slug: 'noticias', label: 'Noticias', sort_order: 5 },
  { slug: 'propuesta', label: 'Nueva categoría (pendiente)', sort_order: 99 },
]

export const DEFAULT_PUBLICIDAD_CATEGORIES: NamedCategoryRow[] = [
  { slug: 'servicios', label: 'Servicios', sort_order: 1 },
  { slug: 'ventas', label: 'Ventas', sort_order: 2 },
  { slug: 'alquileres', label: 'Alquileres', sort_order: 3 },
  { slug: 'trabajo', label: 'Trabajo', sort_order: 4 },
  { slug: 'otros', label: 'Otros', sort_order: 5 },
]
