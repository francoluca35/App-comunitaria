import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import {
  CategoriesMigrationRequiredError,
  slugifyCategoryLabel,
  uniqueCategorySlug,
} from '@/lib/server/category-slug'
import { CATEGORIES_MIGRATION_MESSAGE, isMissingCategoriesTable } from '@/lib/server/categories-table-error'

function migration503() {
  return NextResponse.json({ error: CATEGORIES_MIGRATION_MESSAGE }, { status: 503 })
}

/** POST: crear categoría de publicidad { label } — slug automático */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.response
  let body: { label?: string; sort_order?: number }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }
  const label = typeof body.label === 'string' ? body.label.trim() : ''
  if (!label) {
    return NextResponse.json({ error: 'El nombre de la categoría es obligatorio' }, { status: 400 })
  }
  const base = slugifyCategoryLabel(label)
  if (!base) {
    return NextResponse.json(
      { error: 'Usá letras o números en el nombre (se generará la URL automáticamente)' },
      { status: 400 }
    )
  }
  let slug: string
  try {
    slug = await uniqueCategorySlug(auth.supabase, 'publicidad_categories', base, {
      distinctFromTable: 'post_categories',
    })
  } catch (e) {
    if (e instanceof CategoriesMigrationRequiredError) return migration503()
    const msg = e instanceof Error ? e.message : 'Error al generar slug'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
  const sort_order = typeof body.sort_order === 'number' && !Number.isNaN(body.sort_order) ? body.sort_order : 99
  const { error } = await auth.supabase.from('publicidad_categories').insert({ slug, label, sort_order })
  if (error) {
    if (isMissingCategoriesTable(error)) return migration503()
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Ya existe una categoría similar. Probá otro nombre.' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, slug })
}

/** PATCH: actualizar label u orden */
export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.response
  let body: { slug?: string; label?: string; sort_order?: number }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }
  const slug = typeof body.slug === 'string' ? body.slug.trim() : ''
  if (!slug) return NextResponse.json({ error: 'Falta slug' }, { status: 400 })
  const updates: { label?: string; sort_order?: number } = {}
  if (body.label !== undefined) {
    const l = String(body.label).trim()
    if (!l) return NextResponse.json({ error: 'label no puede estar vacío' }, { status: 400 })
    updates.label = l
  }
  if (body.sort_order !== undefined) {
    const n = Number(body.sort_order)
    if (Number.isNaN(n)) return NextResponse.json({ error: 'sort_order inválido' }, { status: 400 })
    updates.sort_order = n
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nada para actualizar' }, { status: 400 })
  }
  const { error } = await auth.supabase.from('publicidad_categories').update(updates).eq('slug', slug)
  if (error) {
    if (isMissingCategoriesTable(error)) return migration503()
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

/** DELETE: ?slug= */
export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.response
  const slug = request.nextUrl.searchParams.get('slug')?.trim()
  if (!slug) return NextResponse.json({ error: 'Falta slug' }, { status: 400 })
  const { error } = await auth.supabase.from('publicidad_categories').delete().eq('slug', slug)
  if (error) {
    if (isMissingCategoriesTable(error)) return migration503()
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
