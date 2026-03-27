import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

function getAppName() {
  return (process.env.NEXT_PUBLIC_APP_NAME || 'Difusión Comunitaria').trim()
}

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

  const { data: pub, error: pubError } = await serviceClient
    .from('publicidad_requests')
    .select('id,owner_id,title,description,phone_number,instagram,days_active,price_amount,status,start_at,end_at,created_at')
    .eq('id', id)
    .eq('payment_token', token)
    .single()

  if (pubError || !pub) return NextResponse.json({ error: 'Solicitud inválida' }, { status: 404 })

  const { data: owner, error: ownerError } = await serviceClient
    .from('profiles')
    .select('id,name,email,phone,province,locality')
    .eq('id', pub.owner_id)
    .single()

  if (ownerError || !owner) return NextResponse.json({ error: 'No se pudo cargar el usuario' }, { status: 500 })

  const issuedAt = new Date().toISOString()
  const invoiceNumber = `PUB-${pub.id.slice(0, 8).toUpperCase()}`

  return NextResponse.json({
    ok: true,
    appName: getAppName(),
    invoiceNumber,
    issuedAt,
    customer: {
      id: owner.id,
      name: owner.name,
      email: owner.email,
      phone: owner.phone,
      province: owner.province,
      locality: owner.locality,
    },
    publicidad: {
      id: pub.id,
      title: pub.title,
      description: pub.description,
      phone_number: pub.phone_number,
      instagram: pub.instagram,
      days_active: pub.days_active,
      status: pub.status,
      start_at: pub.start_at,
      end_at: pub.end_at,
      created_at: pub.created_at,
    },
    totals: {
      currency: 'ARS',
      total: pub.price_amount,
    },
  })
}

