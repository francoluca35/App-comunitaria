import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { VALOR_PUBLICITARIO_CONFIG_KEY, parseValorPublicitarioJsonb } from '@/lib/server/valor-publicitario'
import { buildPaymentLink, generatePaymentToken } from '@/lib/server/publicidad'
import { resolvePublicidadCategorySlug } from '@/lib/server/publicidad-category'

const MAX_IMAGES = 5
const MAX_DAYS = 365

type PublicidadStatus = 'pending' | 'payment_pending' | 'active' | 'rejected'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const supabase = createClient(token)
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token)
  if (userError || !user?.id) return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })

  const { id } = await params
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

  const { data, error } = await supabase
    .from('publicidad_requests')
    .select(
      'id,title,description,phone_number,instagram,category,images,status,days_active,created_at,start_at,end_at,price_amount'
    )
    .eq('id', id)
    .eq('owner_id', user.id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  return NextResponse.json({ publicidad: data })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const supabase = createClient(token)
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token)
  if (userError || !user?.id) return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })

  const serviceClient = createServiceRoleClient()
  if (!serviceClient) {
    return NextResponse.json(
      { error: 'Falta SUPABASE_SERVICE_ROLE_KEY en el servidor.' },
      { status: 503 }
    )
  }

  const { id } = await params
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

  const { data: row, error: fetchError } = await serviceClient
    .from('publicidad_requests')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 })
  if (!row || row.owner_id !== user.id) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const status = row.status as PublicidadStatus

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const description = typeof body.description === 'string' ? body.description.trim() : ''
  const phone_number = typeof body.phone_number === 'string' ? body.phone_number.trim() : ''
  const instagram = typeof body.instagram === 'string' ? body.instagram.trim() : ''
  const images = Array.isArray(body.images) ? (body.images.filter((x) => typeof x === 'string') as string[]) : []
  const categoryRaw = typeof body.category === 'string' ? body.category : 'otros'

  if (!title || !description) return NextResponse.json({ error: 'Título y descripción son obligatorios' }, { status: 400 })
  if (images.length > MAX_IMAGES) return NextResponse.json({ error: `Máximo ${MAX_IMAGES} imágenes` }, { status: 400 })
  if (!phone_number && !instagram) return NextResponse.json({ error: 'Ingresá al menos teléfono o Instagram' }, { status: 400 })

  const category = await resolvePublicidadCategorySlug(categoryRaw)

  const now = new Date()

  if (status === 'active') {
    const endAt = row.end_at ? new Date(String(row.end_at)) : null
    if (!endAt || endAt.getTime() <= now.getTime()) {
      return NextResponse.json({ error: 'Esta publicidad ya no está activa.' }, { status: 400 })
    }
    if (images.length < 1) return NextResponse.json({ error: 'Subí al menos 1 imagen' }, { status: 400 })

    const { error: upError } = await serviceClient
      .from('publicidad_requests')
      .update({
        title,
        description,
        phone_number: phone_number || null,
        instagram: instagram || null,
        images,
        category,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('owner_id', user.id)
      .eq('status', 'active')

    if (upError) return NextResponse.json({ error: upError.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (status === 'pending' || status === 'rejected' || status === 'payment_pending') {
    const daysRaw = body.days_active
    const days_active =
      typeof daysRaw === 'number' ? daysRaw : typeof daysRaw === 'string' ? parseInt(daysRaw, 10) : 0
    if (!Number.isFinite(days_active) || days_active <= 0 || days_active > MAX_DAYS) {
      return NextResponse.json({ error: 'days_active inválido' }, { status: 400 })
    }
    if (images.length < 1) return NextResponse.json({ error: 'Subí al menos 1 imagen' }, { status: 400 })

    const { data: configRow } = await serviceClient
      .from('app_config')
      .select('value')
      .eq('key', VALOR_PUBLICITARIO_CONFIG_KEY)
      .maybeSingle()

    const valor = parseValorPublicitarioJsonb(configRow?.value)
    const price_amount = valor * days_active

    const baseUpdate: Record<string, unknown> = {
      title,
      description,
      phone_number: phone_number || null,
      instagram: instagram || null,
      images,
      category,
      days_active,
      price_amount,
      updated_at: new Date().toISOString(),
    }

    if (status === 'rejected') {
      baseUpdate.status = 'pending'
      baseUpdate.payment_token = null
      baseUpdate.payment_link_url = null
    }

    if (status === 'payment_pending') {
      const payment_token = generatePaymentToken()
      const payment_link_url = buildPaymentLink(id, payment_token)
      baseUpdate.payment_token = payment_token
      baseUpdate.payment_link_url = payment_link_url
    }

    const { error: upError } = await serviceClient.from('publicidad_requests').update(baseUpdate).eq('id', id).eq('owner_id', user.id)

    if (upError) return NextResponse.json({ error: upError.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'No se puede editar en este estado' }, { status: 400 })
}
