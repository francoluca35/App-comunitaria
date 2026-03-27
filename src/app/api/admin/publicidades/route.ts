import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.response

  const status = request.nextUrl.searchParams.get('status') || 'pending'
  const allowed = new Set(['pending', 'payment_pending', 'active', 'rejected'])
  if (!allowed.has(status)) {
    return NextResponse.json({ error: 'status inválido' }, { status: 400 })
  }

  const { data, error } = await auth.supabase
    .from('publicidad_requests')
    .select('id,title,description,phone_number,instagram,images,days_active,status,price_amount,created_at,profiles(name,avatar_url)')
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

