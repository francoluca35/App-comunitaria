import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DEFAULT_POST_CATEGORIES } from '@/lib/category-defaults'
import { isMissingCategoriesTable } from '@/lib/server/categories-table-error'

/** GET: categorías de publicaciones (lectura pública). Si falta la migración, devuelve defaults (200). */
export async function GET() {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('post_categories')
      .select('slug,label,sort_order')
      .order('sort_order', { ascending: true })
    if (error) {
      if (isMissingCategoriesTable(error)) {
        return NextResponse.json(DEFAULT_POST_CATEGORIES)
      }
      console.error('GET post_categories:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(data?.length ? data : DEFAULT_POST_CATEGORIES)
  } catch (e) {
    console.error('GET post_categories:', e)
    return NextResponse.json(DEFAULT_POST_CATEGORIES)
  }
}
