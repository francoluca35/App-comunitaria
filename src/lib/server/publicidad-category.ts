import { createClient } from '@/lib/supabase/server'

/** Normaliza el slug contra `publicidad_categories`; si no existe, devuelve `otros`. */
export async function resolvePublicidadCategorySlug(raw: string): Promise<string> {
  const slug = (raw || 'otros').trim() || 'otros'
  const supabase = createClient()
  const { data } = await supabase.from('publicidad_categories').select('slug').eq('slug', slug).maybeSingle()
  return data?.slug ?? 'otros'
}
