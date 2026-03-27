import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { VALOR_PUBLICITARIO_CONFIG_KEY, VALOR_PUBLICITARIO_LATERAL_CONFIG_KEY, parseValorPublicitarioJsonb } from '@/lib/server/valor-publicitario'
import { buildPaymentLink, generatePaymentToken } from '@/lib/server/publicidad'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.response

  let body: { action?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const action = typeof body.action === 'string' ? body.action : ''
  if (!['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'action inválida' }, { status: 400 })
  }

  const { id } = await params
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

  const { data: requestRow, error: reqError } = await auth.supabase
    .from('publicidad_requests')
    .select('id,owner_id,days_active,status,promote_lateral')
    .eq('id', id)
    .single()

  if (reqError || !requestRow) return NextResponse.json({ error: reqError?.message ?? 'No encontrado' }, { status: 404 })
  if (requestRow.status !== 'pending') return NextResponse.json({ error: 'Solo se pueden aprobar solicitudes pending' }, { status: 400 })

  if (action === 'reject') {
    const { error } = await auth.supabase
      .from('publicidad_requests')
      .update({
        status: 'rejected',
        payment_token: null,
        payment_link_url: null,
      })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // approve
  const { data: configMainRow, error: configMainError } = await auth.supabase
    .from('app_config')
    .select('value')
    .eq('key', VALOR_PUBLICITARIO_CONFIG_KEY)
    .maybeSingle()

  const { data: configLateralRow, error: configLateralError } = await auth.supabase
    .from('app_config')
    .select('value')
    .eq('key', VALOR_PUBLICITARIO_LATERAL_CONFIG_KEY)
    .maybeSingle()

  if (configMainError) {
    console.error('PATCH /api/admin/publicidades approve main config error:', configMainError)
  }
  if (configLateralError) {
    console.error('PATCH /api/admin/publicidades approve lateral config error:', configLateralError)
  }

  const valorMain = parseValorPublicitarioJsonb(configMainRow?.value)
  const valorLateral = parseValorPublicitarioJsonb(configLateralRow?.value)
  const promoteLateral = requestRow.promote_lateral === true
  const perDay = valorMain + (promoteLateral ? valorLateral : 0)
  const price_amount = perDay * requestRow.days_active

  const payment_token = generatePaymentToken()
  const payment_link_url = buildPaymentLink(requestRow.id, payment_token)

  const { error } = await auth.supabase
    .from('publicidad_requests')
    .update({
      status: 'payment_pending',
      price_amount,
      payment_token,
      payment_link_url,
    })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, payment_link_url })
}

