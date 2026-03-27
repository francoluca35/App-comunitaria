import type { SupabaseClient } from '@supabase/supabase-js'
import { isMissingCategoriesTable } from '@/lib/server/categories-table-error'

/** Tablas post_categories / publicidad_categories no creadas (falta migración SQL). */
export class CategoriesMigrationRequiredError extends Error {
  constructor() {
    super('CATEGORIES_MIGRATION_REQUIRED')
    this.name = 'CategoriesMigrationRequiredError'
  }
}

/**
 * Convierte un nombre legible ("Pérdida de mascotas") en slug para URL/BD.
 */
export function slugifyCategoryLabel(input: string): string {
  const s = input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]+/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return s
}

type CategoryTable = 'post_categories' | 'publicidad_categories'

export type UniqueCategorySlugOptions = {
  /**
   * Tabla de la otra familia: nunca se reutilizará el mismo slug
   * (categorías del feed vs categorías solo de publicidades).
   */
  distinctFromTable?: CategoryTable
}

/** Genera slug único en `table` y, si aplica, libre en la otra tabla: base, base-2, base-3, … */
export async function uniqueCategorySlug(
  client: SupabaseClient,
  table: CategoryTable,
  base: string,
  options?: UniqueCategorySlugOptions
): Promise<string> {
  const distinctFromTable = options?.distinctFromTable
  const root = base || 'categoria'
  let candidate = root
  for (let i = 0; i < 200; i++) {
    const { count, error } = await client
      .from(table)
      .select('*', { count: 'exact', head: true })
      .eq('slug', candidate)
    if (error) {
      if (isMissingCategoriesTable(error)) throw new CategoriesMigrationRequiredError()
      throw new Error(error.message)
    }
    let busy = (count ?? 0) > 0
    if (!busy && distinctFromTable) {
      const { count: otherCount, error: otherError } = await client
        .from(distinctFromTable)
        .select('*', { count: 'exact', head: true })
        .eq('slug', candidate)
      if (otherError) {
        if (!isMissingCategoriesTable(otherError)) throw new Error(otherError.message)
        // La otra tabla aún no existe: no bloqueamos la creación
      } else if ((otherCount ?? 0) > 0) {
        busy = true
      }
    }
    if (!busy) return candidate
    candidate = `${root}-${i + 2}`
  }
  throw new Error('No se pudo generar un slug único')
}
