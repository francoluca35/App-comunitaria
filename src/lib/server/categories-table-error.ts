/**
 * PostgREST / Postgres cuando aún no corriste la migración `post_and_publicidad_categories.sql`.
 */
export function isMissingCategoriesTable(error: {
  code?: string
  message?: string
  details?: string
} | null): boolean {
  if (!error) return false
  const msg = `${error.message ?? ''} ${error.details ?? ''}`.toLowerCase()
  const code = error.code ?? ''
  if (code === 'PGRST205') return true
  if (code === '42P01') return true
  if (msg.includes('does not exist') || msg.includes('no existe')) return true
  if (msg.includes('schema cache') && msg.includes('could not find')) return true
  return false
}

export const CATEGORIES_MIGRATION_MESSAGE =
  'Ejecutá en Supabase → SQL Editor el archivo supabase/migrations/post_and_publicidad_categories.sql para crear las tablas post_categories y publicidad_categories.'
