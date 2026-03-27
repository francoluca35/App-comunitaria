import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { VALOR_PUBLICITARIO_CONFIG_KEY, VALOR_PUBLICITARIO_LATERAL_CONFIG_KEY, parseValorPublicitarioJsonb } from '@/lib/server/valor-publicitario'
import { resolvePublicidadCategorySlug } from '@/lib/server/publicidad-category'

const MAX_IMAGES = 5
const MAX_DAYS = 365

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const supabase = createClient(token)
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token)
  if (userError || !user?.id) return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })

  let body: {
    title?: unknown
    description?: unknown
    phone_number?: unknown
    instagram?: unknown
    images?: unknown
    days_active?: unknown
    promote_lateral?: unknown
    category?: unknown
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const description = typeof body.description === 'string' ? body.description.trim() : ''
  const phone_number = typeof body.phone_number === 'string' ? body.phone_number.trim() : ''
  const instagram = typeof body.instagram === 'string' ? body.instagram.trim() : ''

  const days_activeRaw = body.days_active
  const days_active = typeof days_activeRaw === 'number' ? days_activeRaw : typeof days_activeRaw === 'string' ? parseInt(days_activeRaw, 10) : 0
  const promote_lateral = body.promote_lateral === true
  const categoryRaw = typeof body.category === 'string' ? body.category : 'otros'
  const category = await resolvePublicidadCategorySlug(categoryRaw)

  const images = Array.isArray(body.images) ? (body.images.filter((x) => typeof x === 'string') as string[]) : []

  if (!title || !description) return NextResponse.json({ error: 'Título y descripción son obligatorios' }, { status: 400 })
  if (!Number.isFinite(days_active) || days_active <= 0 || days_active > MAX_DAYS) {
    return NextResponse.json({ error: 'days_active inválido' }, { status: 400 })
  }
  if (images.length > MAX_IMAGES) return NextResponse.json({ error: `Máximo ${MAX_IMAGES} imágenes` }, { status: 400 })
  if (!phone_number && !instagram) return NextResponse.json({ error: 'Ingresá al menos teléfono o Instagram' }, { status: 400 })

  // Precio estimado (usamos valor publicitario actual).
  const anon = createClient()
  const { data: configMainRow, error: configMainError } = await anon
    .from('app_config')
    .select('value')
    .eq('key', VALOR_PUBLICITARIO_CONFIG_KEY)
    .maybeSingle()

  const { data: configLateralRow, error: configLateralError } = await anon
    .from('app_config')
    .select('value')
    .eq('key', VALOR_PUBLICITARIO_LATERAL_CONFIG_KEY)
    .maybeSingle()

  if (configMainError) {
    // Si falla leer config, igual dejamos en 0 (el admin recalcula al aprobar).
    console.error('POST /api/publicidad/requests read main config error:', configMainError)
  }
  if (configLateralError) {
    console.error('POST /api/publicidad/requests read lateral config error:', configLateralError)
  }

  const valorMain = parseValorPublicitarioJsonb(configMainRow?.value)
  const valorLateral = parseValorPublicitarioJsonb(configLateralRow?.value)
  const perDay = valorMain + (promote_lateral ? valorLateral : 0)
  const price_amount = perDay * days_active

  const { data: inserted, error: insertError } = await supabase
    .from('publicidad_requests')
    .insert({
      owner_id: user.id,
      title,
      description,
      phone_number: phone_number || null,
      instagram: instagram || null,
      images,
      category,
      days_active,
      status: 'pending',
      price_amount,
      promote_lateral,
    })
    .select('id, status')
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, id: inserted.id, status: inserted.status })
}

