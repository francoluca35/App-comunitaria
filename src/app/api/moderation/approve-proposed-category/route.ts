import { NextRequest, NextResponse } from 'next/server'
import { requireStaff } from '@/lib/admin-auth'
import {
  CategoriesMigrationRequiredError,
  slugifyCategoryLabel,
  uniqueCategorySlug,
} from '@/lib/server/category-slug'
import { CATEGORIES_MIGRATION_MESSAGE, isMissingCategoriesTable } from '@/lib/server/categories-table-error'

function migration503() {
  return NextResponse.json({ error: CATEGORIES_MIGRATION_MESSAGE }, { status: 503 })
}

/**
 * Aprueba un post con category = propuesta: crea post_categories con el nombre sugerido
 * y asigna el post a la nueva categoría (status approved).
 */
export async function POST(request: NextRequest) {
  const auth = await requireStaff(request)
  if (!auth.ok) return auth.response

  let body: { postId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }
  const postId = typeof body.postId === 'string' ? body.postId.trim() : ''
  if (!postId) return NextResponse.json({ error: 'Falta postId' }, { status: 400 })

  const { data: post, error: fetchError } = await auth.supabase
    .from('posts')
    .select('id, category, proposed_category_label, status')
    .eq('id', postId)
    .maybeSingle()

  if (fetchError) {
    if (isMissingCategoriesTable(fetchError)) return migration503()
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }
  if (!post) return NextResponse.json({ error: 'Publicación no encontrada' }, { status: 404 })
  if (post.status !== 'pending') {
    return NextResponse.json({ error: 'La publicación no está pendiente' }, { status: 400 })
  }
  if (post.category !== 'propuesta') {
    return NextResponse.json({ error: 'Esta publicación no pide una categoría nueva' }, { status: 400 })
  }

  const label = typeof post.proposed_category_label === 'string' ? post.proposed_category_label.trim() : ''
  if (!label) {
    return NextResponse.json({ error: 'No hay nombre de categoría sugerido' }, { status: 400 })
  }

  const base = slugifyCategoryLabel(label)
  if (!base) {
    return NextResponse.json(
      { error: 'El nombre sugerido no permite crear una URL válida. Rechazá la publicación o pedí que la reenvíen.' },
      { status: 400 }
    )
  }

  let slug: string
  try {
    slug = await uniqueCategorySlug(auth.supabase, 'post_categories', base, {
      distinctFromTable: 'publicidad_categories',
    })
  } catch (e) {
    if (e instanceof CategoriesMigrationRequiredError) return migration503()
    const msg = e instanceof Error ? e.message : 'Error al generar slug'
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  const sort_order = 99
  const { error: insError } = await auth.supabase.from('post_categories').insert({ slug, label, sort_order })
  if (insError) {
    if (isMissingCategoriesTable(insError)) return migration503()
    if (insError.code === '23505') {
      return NextResponse.json({ error: 'Ya existe una categoría similar. Probá de nuevo o rechazá la publicación.' }, { status: 409 })
    }
    return NextResponse.json({ error: insError.message }, { status: 500 })
  }

  const { error: updError } = await auth.supabase
    .from('posts')
    .update({
      category: slug,
      proposed_category_label: null,
      status: 'approved',
      updated_at: new Date().toISOString(),
    })
    .eq('id', postId)

  if (updError) {
    const rollback = auth.serviceClient ?? auth.supabase
    await rollback.from('post_categories').delete().eq('slug', slug)
    return NextResponse.json({ error: updError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, slug, label })
}
