import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const serviceClient = createServiceRoleClient()
  if (!serviceClient) {
    return NextResponse.json({ error: 'Falta SUPABASE_SERVICE_ROLE_KEY' }, { status: 503 })
  }

  const token = request.nextUrl.searchParams.get('token')?.trim() || ''
  if (!token) return NextResponse.json({ error: 'token requerido' }, { status: 400 })

  const { id } = await params
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

  const { data: row, error } = await serviceClient
    .from('publicidad_requests')
    .select('id,title,days_active,price_amount,status,owner_id')
    .eq('id', id)
    .eq('payment_token', token)
    .single()

  if (error || !row) return NextResponse.json({ error: 'Solicitud de pago inválida' }, { status: 404 })

  return NextResponse.json({
    ok: true,
    id: row.id,
    title: row.title,
    days_active: row.days_active,
    price_amount: row.price_amount,
    status: row.status,
  })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const serviceClient = createServiceRoleClient()
  if (!serviceClient) {
    return NextResponse.json({ error: 'Falta SUPABASE_SERVICE_ROLE_KEY' }, { status: 503 })
  }

  // Confirmación sin body: el token via query
  const token = request.nextUrl.searchParams.get('token')?.trim() || ''
  if (!token) return NextResponse.json({ error: 'token requerido' }, { status: 400 })

  const { id } = await params
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

  const { data: row, error } = await serviceClient
    .from('publicidad_requests')
    .select('id,days_active,status')
    .eq('id', id)
    .eq('payment_token', token)
    .single()

  if (error || !row) return NextResponse.json({ error: 'Solicitud de pago inválida' }, { status: 404 })
  if (row.status !== 'payment_pending') {
    return NextResponse.json({ error: 'Este anuncio no está esperando pago' }, { status: 400 })
  }

  const now = new Date()
  const endAt = new Date(now.getTime() + row.days_active * 24 * 60 * 60 * 1000)

  const { error: updateError } = await serviceClient
    .from('publicidad_requests')
    .update({
      status: 'active',
      start_at: now.toISOString(),
      end_at: endAt.toISOString(),
    })
    .eq('id', id)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

